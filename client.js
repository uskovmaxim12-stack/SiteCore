// Главный объект клиента
const ClientApp = {
    currentUser: null,
    currentSection: 'dashboard',
    currentOrderId: null,
    currentChatId: null,
    
    init() {
        this.loadUser();
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        this.setupEventListeners();
        this.updateUI();
        this.loadDashboardData();
        this.updateDate();
    },
    
    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    },
    
    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateTo(section);
            });
        });
        
        // Создание заказа
        document.getElementById('create-order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createOrder();
        });
        
        // Кнопка отмены
        document.getElementById('cancel-order').addEventListener('click', () => {
            this.navigateTo('orders');
        });
        
        // Кнопка "Создать первый заказ"
        document.getElementById('create-first-order').addEventListener('click', () => {
            this.navigateTo('new-order');
        });
        
        // Счётчик символов в промте
        document.getElementById('project-prompt').addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('char-count').textContent = count;
            
            if (count < 300) {
                e.target.style.borderColor = '#ef4444';
            } else if (count > 2500) {
                e.target.style.borderColor = '#ef4444';
            } else {
                e.target.style.borderColor = '#667eea';
            }
        });
        
        // Предустановленные бюджеты
        document.querySelectorAll('.budget-preset').forEach(button => {
            button.addEventListener('click', () => {
                const amount = button.getAttribute('data-amount');
                document.getElementById('project-budget').value = amount;
            });
        });
        
        // Загрузка файлов
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('project-attachments');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.background = 'rgba(102, 126, 234, 0.05)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#e5e7eb';
            uploadArea.style.background = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#e5e7eb';
            uploadArea.style.background = '';
            
            const files = e.dataTransfer.files;
            this.handleFileUpload(files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
        
        // Выход
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
        
        // Закрытие модального окна
        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('order-modal').classList.remove('active');
        });
    },
    
    navigateTo(section) {
        // Обновляем активную навигацию
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === section) {
                item.classList.add('active');
            }
        });
        
        // Скрываем все секции
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        
        // Показываем выбранную секцию
        document.getElementById(`${section}-section`).classList.add('active');
        
        // Обновляем заголовок
        this.updatePageTitle(section);
        
        // Загружаем данные для секции
        switch(section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'new-order':
                this.resetOrderForm();
                break;
            case 'messages':
                this.loadConversations();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
        
        this.currentSection = section;
    },
    
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'Главная панель',
            'orders': 'Мои заказы',
            'new-order': 'Новый заказ',
            'messages': 'Сообщения',
            'profile': 'Профиль'
        };
        
        document.getElementById('page-title').textContent = titles[section] || 'Панель клиента';
        document.getElementById('page-subtitle').textContent = 'SiteCore Platform';
    },
    
    updateUI() {
        if (!this.currentUser) return;
        
        // Обновляем информацию пользователя
        document.getElementById('user-name').textContent = this.currentUser.name;
        document.getElementById('user-email').textContent = this.currentUser.email;
        document.getElementById('user-avatar').textContent = this.currentUser.avatar;
        document.getElementById('welcome-name').textContent = this.currentUser.name.split(' ')[0];
        
        // Обновляем статистику
        const orders = DataManager.getUserOrders(this.currentUser.id, 'client');
        const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'in_progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const totalBudget = orders.reduce((sum, o) => sum + (o.budget || 0), 0);
        
        document.getElementById('active-orders-count').textContent = activeOrders;
        document.getElementById('completed-orders-count').textContent = completedOrders;
        document.getElementById('total-budget').textContent = this.formatCurrency(totalBudget);
        document.getElementById('orders-count').textContent = orders.length;
    },
    
    updateDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = 
            now.toLocaleDateString('ru-RU', options);
    },
    
    loadDashboardData() {
        const orders = DataManager.getUserOrders(this.currentUser.id, 'client')
            .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
            .slice(0, 5);
        
        const recentOrdersList = document.getElementById('recent-orders-list');
        
        if (orders.length === 0) {
            recentOrdersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>У вас пока нет заказов</p>
                    <button class="btn-primary" id="create-first-order">
                        <i class="fas fa-plus"></i> Создать первый заказ
                    </button>
                </div>
            `;
            
            document.getElementById('create-first-order').addEventListener('click', () => {
                this.navigateTo('new-order');
            });
            
            return;
        }
        
        recentOrdersList.innerHTML = orders.map(order => `
            <div class="recent-order-card" data-id="${order.id}">
                <div class="recent-order-header">
                    <h4>${order.projectName}</h4>
                    <span class="order-status status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                <div class="recent-order-details">
                    <span>Тип: ${order.projectType === 'static' ? 'Статический' : 'Динамический'}</span>
                    <span>Бюджет: ${this.formatCurrency(order.budget)}</span>
                    <span>Срок: ${order.deadline} дней</span>
                </div>
                <div class="recent-order-footer">
                    <span>Создан: ${new Date(order.createdDate).toLocaleDateString()}</span>
                    <button class="btn-small view-order" data-id="${order.id}">Подробнее</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(button.getAttribute('data-id'));
                this.viewOrderDetails(orderId);
            });
        });
        
        document.querySelectorAll('.recent-order-card').forEach(card => {
            card.addEventListener('click', () => {
                const orderId = parseInt(card.getAttribute('data-id'));
                this.viewOrderDetails(orderId);
            });
        });
    },
    
    loadOrders() {
        const filter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
        const orders = DataManager.getUserOrders(this.currentUser.id, 'client');
        
        let filteredOrders = orders;
        if (filter !== 'all') {
            filteredOrders = orders.filter(order => order.status === filter);
        }
        
        const tableBody = document.getElementById('orders-table-body');
        
        if (filteredOrders.length === 0) {
            tableBody.innerHTML = `
                <div class="empty-table">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Заказы не найдены</p>
                </div>
            `;
            return;
        }
        
        tableBody.innerHTML = filteredOrders.map(order => `
            <div class="order-row">
                <div class="order-name">
                    <div>${order.projectName}</div>
                </div>
                <div class="order-type">
                    <span class="order-type-badge ${order.projectType}">
                        ${order.projectType === 'static' ? 'Статический' : 'Динамический'}
                    </span>
                </div>
                <div class="order-budget">${this.formatCurrency(order.budget)}</div>
                <div class="order-deadline">${order.deadline} дней</div>
                <div class="order-status">
                    <span class="status-${order.status}">${this.getStatusText(order.status)}</span>
                </div>
                <div class="order-assignee">
                    ${order.assignedTo ? 
                        `<div class="assignee-avatar">${this.getExecutorAvatar(order.assignedTo)}</div>
                         <span>${this.getExecutorName(order.assignedTo)}</span>` :
                        '<span>Не назначен</span>'
                    }
                </div>
                <div class="order-actions">
                    <button class="btn-small view" data-id="${order.id}">Просмотр</button>
                    <button class="btn-small chat" data-id="${order.id}">Чат</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.btn-small.view').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(button.getAttribute('data-id'));
                this.viewOrderDetails(orderId);
            });
        });
        
        document.querySelectorAll('.btn-small.chat').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(button.getAttribute('data-id'));
                this.openChat(orderId);
            });
        });
        
        // Обработчики фильтров
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.loadOrders();
            });
        });
    },
    
    createOrder() {
        const projectName = document.getElementById('project-name').value.trim();
        const projectType = document.getElementById('project-type').value;
        const budget = parseInt(document.getElementById('project-budget').value);
        const deadline = parseInt(document.getElementById('project-deadline').value);
        const prompt = document.getElementById('project-prompt').value.trim();
        const preferredExecutor = document.getElementById('preferred-executor').value || null;
        
        // Валидация промта
        if (prompt.length < 300) {
            this.showNotification('Промт должен содержать не менее 300 символов', 'error');
            return;
        }
        
        if (prompt.length > 2500) {
            this.showNotification('Промт должен содержать не более 2500 символов', 'error');
            return;
        }
        
        const orderData = {
            clientId: this.currentUser.id,
            clientName: this.currentUser.name,
            clientEmail: this.currentUser.email,
            clientPhone: this.currentUser.phone,
            clientTelegram: this.currentUser.telegram,
            projectName,
            projectType,
            budget,
            deadline,
            prompt,
            preferredExecutor
        };
        
        const newOrder = DataManager.createOrder(orderData);
        
        this.showNotification('Заказ успешно создан!', 'success');
        this.navigateTo('orders');
        
        // Обновляем UI
        this.updateUI();
        this.loadDashboardData();
    },
    
    viewOrderDetails(orderId) {
        const orders = DataManager.getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) return;
        
        const modal = document.getElementById('order-modal');
        const modalBody = document.getElementById('modal-order-details');
        
        modalBody.innerHTML = `
            <div class="order-detail-grid">
                <div class="order-info">
                    <h4>Информация о заказе</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Название:</span>
                            <span class="info-value">${order.projectName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Тип:</span>
                            <span class="info-value">${order.projectType === 'static' ? 'Статический сайт' : 'Динамический сайт'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Бюджет:</span>
                            <span class="info-value">${this.formatCurrency(order.budget)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Срок:</span>
                            <span class="info-value">${order.deadline} дней</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Статус:</span>
                            <span class="info-value status-${order.status}">${this.getStatusText(order.status)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Создан:</span>
                            <span class="info-value">${new Date(order.createdDate).toLocaleDateString()}</span>
                        </div>
                        ${order.assignedTo ? `
                        <div class="info-item">
                            <span class="info-label">Исполнитель:</span>
                            <span class="info-value">${this.getExecutorName(order.assignedTo)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="order-prompt">
                    <h4>Ваш промт</h4>
                    <div class="prompt-content">${order.prompt}</div>
                    <div class="prompt-stats">
                        <span>${order.prompt.length} символов</span>
                        <span>Время чтения: ${Math.ceil(order.prompt.length / 1000)} мин</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modal-order-title').textContent = order.projectName;
        modal.classList.add('active');
    },
    
    openChat(orderId) {
        this.navigateTo('messages');
        this.currentChatId = orderId;
        
        // Здесь будет логика загрузки чата
        // Пока просто покажем уведомление
        this.showNotification('Функция чата будет реализована в следующем обновлении', 'info');
    },
    
    loadConversations() {
        const orders = DataManager.getUserOrders(this.currentUser.id, 'client');
        const messages = DataManager.getMessages();
        
        const conversationsList = document.getElementById('conversations-list');
        
        if (orders.length === 0) {
            conversationsList.innerHTML = `
                <div class="empty-conversations">
                    <i class="fas fa-comments"></i>
                    <p>У вас пока нет диалогов</p>
                </div>
            `;
            return;
        }
        
        conversationsList.innerHTML = orders.map(order => {
            const orderMessages = messages[order.id] || [];
            const lastMessage = orderMessages[orderMessages.length - 1];
            
            return `
                <div class="conversation-item" data-id="${order.id}">
                    <div class="conversation-header">
                        <div class="conversation-avatar">
                            ${order.assignedTo ? this.getExecutorAvatar(order.assignedTo) : '?'}
                        </div>
                        <div class="conversation-info">
                            <h4>${order.projectName}</h4>
                            <p>${order.assignedTo ? this.getExecutorName(order.assignedTo) : 'Исполнитель не назначен'}</p>
                        </div>
                        ${lastMessage ? `
                        <span class="conversation-time">
                            ${new Date(lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        ` : ''}
                    </div>
                    ${lastMessage ? `
                    <div class="conversation-preview">
                        ${lastMessage.text.length > 50 ? lastMessage.text.substring(0, 50) + '...' : lastMessage.text}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Обработчики кликов по диалогам
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const orderId = parseInt(item.getAttribute('data-id'));
                this.loadChat(orderId);
            });
        });
    },
    
    loadChat(orderId) {
        // Заглушка для чата
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="chat-info">
                <i class="fas fa-info-circle"></i>
                <p>Функция чата будет реализована в следующем обновлении</p>
            </div>
        `;
        
        // Активируем поле ввода
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        
        chatInput.disabled = true;
        sendButton.disabled = true;
        chatInput.placeholder = "Чат будет доступен в следующем обновлении";
    },
    
    loadProfile() {
        if (!this.currentUser) return;
        
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-avatar').textContent = this.currentUser.avatar;
        document.getElementById('detail-email').textContent = this.currentUser.email;
        document.getElementById('detail-phone').textContent = this.currentUser.phone;
        document.getElementById('detail-telegram').textContent = this.currentUser.telegram;
        document.getElementById('detail-reg-date').textContent = this.currentUser.registrationDate;
        
        // Подсчёт дней с регистрации
        const regDate = new Date(this.currentUser.registrationDate);
        const today = new Date();
        const daysDiff = Math.floor((today - regDate) / (1000 * 60 * 60 * 24));
        document.getElementById('profile-days').textContent = 
            daysDiff === 0 ? 'Сегодня' : `${daysDiff} дней`;
        
        // Количество заказов
        const orders = DataManager.getUserOrders(this.currentUser.id, 'client');
        document.getElementById('profile-orders-count').textContent = orders.length;
    },
    
    resetOrderForm() {
        document.getElementById('create-order-form').reset();
        document.getElementById('char-count').textContent = '0';
        document.getElementById('file-list').innerHTML = '';
    },
    
    handleFileUpload(files) {
        const fileList = document.getElementById('file-list');
        
        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification(`Файл ${file.name} слишком большой (макс. 10МБ)`, 'error');
                return;
            }
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${file.name} (${this.formatFileSize(file.size)})</span>
                <button class="remove-file">&times;</button>
            `;
            
            fileList.appendChild(fileItem);
            
            // Удаление файла
            fileItem.querySelector('.remove-file').addEventListener('click', () => {
                fileItem.remove();
            });
        });
    },
    
    // Вспомогательные методы
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(amount);
    },
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    },
    
    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершён',
            'paid': 'Оплачен'
        };
        return statuses[status] || status;
    },
    
    getExecutorName(executorId) {
        const executors = DataManager.getUsers();
        const executor = executors.find(e => e.id === executorId);
        return executor ? executor.name : 'Неизвестно';
    },
    
    getExecutorAvatar(executorId) {
        const executors = DataManager.getUsers();
        const executor = executors.find(e => e.id === executorId);
        return executor ? executor.avatar : '?';
    },
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        text.textContent = message;
        notification.className = `notification ${type} active`;
        
        setTimeout(() => {
            notification.classList.remove('active');
        }, 3000);
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    ClientApp.init();
});