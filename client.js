// Клиентское приложение
class ClientApp {
    constructor() {
        this.currentUser = null;
        this.orders = [];
        this.currentOrderId = null;
        this.currentChatId = null;
        this.chats = {};
    }

    // Инициализация
    init() {
        this.checkAuth();
        this.loadUserData();
        this.setupEventListeners();
        this.loadStats();
        this.loadOrders();
        this.setupUserMenu();
    }

    // Проверка авторизации
    checkAuth() {
        const user = redirectIfNotAuthenticated('client', 'index.html');
        if (user) {
            this.currentUser = user;
        }
    }

    // Загрузка данных пользователя
    loadUserData() {
        if (!this.currentUser) return;

        // Обновляем информацию в интерфейсе
        document.getElementById('client-name').textContent = this.currentUser.firstName;
        document.getElementById('user-name').textContent = this.currentUser.firstName;
        document.getElementById('user-avatar').textContent = this.currentUser.avatar;
        document.getElementById('welcome-title').innerHTML = `Добро пожаловать, <span id="client-name">${this.currentUser.firstName}</span>!`;
    }

    // Загрузка статистики
    loadStats() {
        const data = getAppData();
        const clientOrders = data.orders.filter(order => order.clientId === this.currentUser.id);

        const newOrders = clientOrders.filter(o => o.status === 'new').length;
        const progressOrders = clientOrders.filter(o => o.status === 'in_progress').length;
        const completedOrders = clientOrders.filter(o => o.status === 'completed').length;

        // Считаем непрочитанные сообщения
        let unreadMessages = 0;
        clientOrders.forEach(order => {
            const messages = data.messages[order.id] || [];
            unreadMessages += messages.filter(msg => !msg.read && msg.senderId !== this.currentUser.id).length;
        });

        // Обновляем интерфейс
        document.getElementById('new-orders-count').textContent = newOrders;
        document.getElementById('progress-orders-count').textContent = progressOrders;
        document.getElementById('completed-orders-count').textContent = completedOrders;
        document.getElementById('new-messages-count').textContent = unreadMessages;

        return { newOrders, progressOrders, completedOrders, unreadMessages };
    }

    // Загрузка заказов
    loadOrders() {
        const data = getAppData();
        this.orders = data.orders.filter(order => order.clientId === this.currentUser.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.renderOrdersTable();
    }

    // Отрисовка таблицы заказов
    renderOrdersTable() {
        const tableBody = document.getElementById('orders-table-body');
        
        if (this.orders.length === 0) {
            tableBody.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-file-alt"></i>
                    <h3>У вас пока нет заявок</h3>
                    <p>Создайте первую заявку на разработку сайта</p>
                    <button class="btn btn-primary" id="create-first-order" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i> Создать заявку
                    </button>
                </div>
            `;
            
            document.getElementById('create-first-order').addEventListener('click', () => {
                this.showCreateOrderModal();
            });
            
            return;
        }

        tableBody.innerHTML = this.orders.map(order => {
            const status = SiteCoreApp.getStatusById(order.status);
            const type = SiteCoreApp.getSiteTypeById(order.projectType);
            const date = formatDate(order.createdAt, { day: 'numeric', month: 'short', year: 'numeric' });
            
            return `
                <div class="table-row" data-order-id="${order.id}">
                    <div>
                        <div class="order-title">${order.projectName}</div>
                        <div class="order-meta">ID: #${order.id}</div>
                    </div>
                    <div>${type ? type.name : 'Не указан'}</div>
                    <div>${formatCurrency(order.budget)}</div>
                    <div>${order.deadline} дней</div>
                    <div>
                        <span class="status-badge status-${order.status}">
                            ${status ? status.name : order.status}
                        </span>
                    </div>
                    <div>${date}</div>
                </div>
            `;
        }).join('');

        // Добавляем обработчики кликов
        document.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const orderId = parseInt(row.dataset.orderId);
                this.showOrderDetails(orderId);
            });
        });
    }

    // Показать детали заказа
    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const status = SiteCoreApp.getStatusById(order.status);
        const type = SiteCoreApp.getSiteTypeById(order.projectType);
        const executor = order.assignedTo ? this.getExecutorById(order.assignedTo) : null;
        const data = getAppData();
        const messages = data.messages[order.id] || [];

        const modal = document.getElementById('order-detail-modal');
        const modalContent = modal.querySelector('.modal') || modal;
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <div>
                    <div class="modal-title">${order.projectName}</div>
                    <div class="modal-subtitle">Заявка #${order.id}</div>
                </div>
                <button class="modal-close" id="close-detail-modal">&times;</button>
            </div>

            <div class="order-detail-header">
                <div class="order-detail-title">${order.projectName}</div>
                <div class="order-detail-meta">
                    <span>Создана: ${formatDate(order.createdAt)}</span>
                    <span>Обновлена: ${formatDate(order.updatedAt)}</span>
                    <span class="status-badge status-${order.status}">${status ? status.name : order.status}</span>
                </div>
            </div>

            <div class="order-detail-grid">
                <div class="detail-section">
                    <h3>Информация о проекте</h3>
                    <div class="detail-row">
                        <span class="detail-label">Тип сайта:</span>
                        <span class="detail-value">${type ? type.name : 'Не указан'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Бюджет:</span>
                        <span class="detail-value">${formatCurrency(order.budget)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Срок выполнения:</span>
                        <span class="detail-value">${order.deadline} дней</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Приоритет:</span>
                        <span class="detail-value">${this.getPriorityText(order.priority)}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Информация об исполнителе</h3>
                    ${executor ? `
                    <div class="detail-row">
                        <span class="detail-label">Исполнитель:</span>
                        <span class="detail-value">${executor.fullName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Роль:</span>
                        <span class="detail-value">${executor.role === 'admin' ? 'Администратор' : 'Разработчик'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Назначен:</span>
                        <span class="detail-value">${formatDate(order.updatedAt)}</span>
                    </div>
                    ` : `
                    <div class="detail-row">
                        <span class="detail-label">Статус:</span>
                        <span class="detail-value">Ожидает назначения исполнителя</span>
                    </div>
                    `}
                </div>
            </div>

            <div class="modal-body">
                <div class="detail-section" style="margin-top: 0;">
                    <h3>Промт для разработки</h3>
                    <div class="prompt-content">${order.prompt}</div>
                    <div style="margin-top: 12px; font-size: 12px; color: var(--gray); text-align: right;">
                        ${order.prompt.length} символов
                    </div>
                </div>

                <div class="detail-section" style="margin-top: 24px;">
                    <h3>История заявки</h3>
                    <div style="max-height: 200px; overflow-y: auto; padding: 16px; background: var(--light); border-radius: 12px;">
                        ${(order.history || []).map(event => `
                            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 13px;">
                                <div style="font-weight: 600; color: var(--dark);">${this.getHistoryActionText(event)}</div>
                                <div style="color: var(--gray); font-size: 12px;">${formatDate(event.timestamp)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <div class="order-actions">
                    <button class="btn btn-secondary" id="view-chat-btn" data-order-id="${order.id}">
                        <i class="fas fa-comments"></i> Перейти в чат
                    </button>
                    ${messages.length > 0 ? `
                    <div style="font-size: 12px; color: var(--gray); margin-left: auto;">
                        ${messages.length} сообщений
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Показываем модальное окно
        modal.classList.add('active');

        // Добавляем обработчики
        modalContent.querySelector('#close-detail-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modalContent.querySelector('#view-chat-btn').addEventListener('click', (e) => {
            const chatOrderId = parseInt(e.target.dataset.orderId || e.target.closest('#view-chat-btn').dataset.orderId);
            modal.classList.remove('active');
            this.openChat(chatOrderId);
        });

        // Закрытие по клику на оверлей
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // Показать модальное окно создания заявки
    showCreateOrderModal() {
        const modal = document.getElementById('create-order-modal');
        
        // Загружаем типы сайтов
        this.loadSiteTypes();
        
        // Сбрасываем форму
        document.getElementById('create-order-form').reset();
        document.getElementById('prompt-counter').textContent = '0 / 2500 символов';
        document.getElementById('prompt-counter').classList.remove('warning');
        document.getElementById('file-list').innerHTML = '';
        
        // Показываем модальное окно
        modal.classList.add('active');
    }

    // Загрузка типов сайтов
    loadSiteTypes() {
        const data = getAppData();
        const typeSelector = document.getElementById('type-selector');
        
        typeSelector.innerHTML = data.settings.siteTypes.map(type => `
            <div class="type-option" data-type="${type.id}">
                <i class="fas ${this.getSiteTypeIcon(type.id)}"></i>
                <span>${type.name}</span>
                <p>${type.priceRange}</p>
            </div>
        `).join('');
        
        // Добавляем обработчики выбора типа
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
        
        // Выбираем первый тип по умолчанию
        const firstOption = typeSelector.querySelector('.type-option');
        if (firstOption) {
            firstOption.classList.add('selected');
        }
    }

    // Открыть чат
    openChat(orderId = null) {
        if (orderId) {
            this.currentChatId = orderId;
        }
        
        const modal = document.getElementById('chat-modal');
        this.loadChats();
        
        if (this.currentChatId) {
            this.loadChatMessages(this.currentChatId);
        }
        
        modal.classList.add('active');
    }

    // Загрузка списка чатов
    loadChats() {
        const data = getAppData();
        const chatList = document.getElementById('chat-list');
        
        // Получаем заказы клиента с сообщениями
        const ordersWithMessages = this.orders.filter(order => {
            const messages = data.messages[order.id] || [];
            return messages.length > 0 || order.assignedTo;
        });
        
        if (ordersWithMessages.length === 0) {
            chatList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--gray);">
                    <i class="fas fa-comments" style="font-size: 32px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>Нет активных диалогов</p>
                </div>
            `;
            return;
        }
        
        chatList.innerHTML = ordersWithMessages.map(order => {
            const messages = data.messages[order.id] || [];
            const lastMessage = messages[messages.length - 1];
            const executor = order.assignedTo ? this.getExecutorById(order.assignedTo) : null;
            const unreadCount = messages.filter(msg => !msg.read && msg.senderId !== this.currentUser.id).length;
            
            return `
                <div class="chat-item ${this.currentChatId === order.id ? 'active' : ''}" data-order-id="${order.id}">
                    <div class="chat-item-header">
                        <div class="chat-item-title">${order.projectName}</div>
                        ${lastMessage ? `
                        <div class="chat-item-time">${formatDate(lastMessage.timestamp, { hour: '2-digit', minute: '2-digit' })}</div>
                        ` : ''}
                    </div>
                    <div class="chat-item-preview">
                        ${executor ? `Исполнитель: ${executor.firstName}` : 'Ожидает назначения'}
                        ${unreadCount > 0 ? `<span style="background: var(--primary); color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 8px;">${unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики выбора чата
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const orderId = parseInt(item.dataset.orderId);
                this.currentChatId = orderId;
                this.loadChatMessages(orderId);
                
                // Обновляем активный элемент
                document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    // Загрузка сообщений чата
    loadChatMessages(orderId) {
        const data = getAppData();
        const order = this.orders.find(o => o.id === orderId);
        const messages = data.messages[orderId] || [];
        const executor = order.assignedTo ? this.getExecutorById(order.assignedTo) : null;
        
        // Обновляем заголовок
        document.getElementById('chat-order-name').textContent = order.projectName;
        document.getElementById('chat-title').textContent = executor ? 
            `Чат с ${executor.firstName}` : 'Ожидание назначения';
        document.getElementById('chat-subtitle').textContent = `Заявка: ${order.projectName}`;
        
        // Отрисовываем сообщения
        const chatMessages = document.getElementById('chat-messages');
        
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="no-chat-selected">
                    <i class="fas fa-comments"></i>
                    <p>Нет сообщений</p>
                    <p style="font-size: 14px; margin-top: 8px;">Напишите первое сообщение</p>
                </div>
            `;
        } else {
            chatMessages.innerHTML = messages.map(msg => `
                <div class="message ${msg.senderId === this.currentUser.id ? 'client' : 'executor'}">
                    <div class="message-content">${msg.text}</div>
                    <div class="message-time">${formatDate(msg.timestamp, { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            `).join('');
            
            // Прокручиваем вниз
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Включаем поле ввода
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        
        if (order.assignedTo) {
            chatInput.disabled = false;
            chatInput.placeholder = "Введите сообщение...";
            sendButton.disabled = false;
        } else {
            chatInput.disabled = true;
            chatInput.placeholder = "Ожидание назначения исполнителя...";
            sendButton.disabled = true;
        }
        
        // Помечаем сообщения как прочитанные
        this.markMessagesAsRead(orderId);
    }

    // Отправить сообщение
    sendMessage() {
        const text = document.getElementById('chat-input').value.trim();
        if (!text || !this.currentChatId) return;
        
        const order = this.orders.find(o => o.id === this.currentChatId);
        if (!order || !order.assignedTo) return;
        
        const messageData = {
            orderId: this.currentChatId,
            senderId: this.currentUser.id,
            senderName: this.currentUser.fullName,
            senderRole: 'client',
            text: text
        };
        
        // Добавляем сообщение
        const newMessage = SiteCoreApp.addMessage(this.currentChatId, messageData);
        
        // Очищаем поле ввода
        document.getElementById('chat-input').value = '';
        
        // Обновляем список сообщений
        this.loadChatMessages(this.currentChatId);
        
        // Обновляем список чатов
        this.loadChats();
        
        // Обновляем статистику
        this.loadStats();
        
        showNotification('Сообщение отправлено', 'success');
    }

    // Пометить сообщения как прочитанные
    markMessagesAsRead(orderId) {
        const data = getAppData();
        const messages = data.messages[orderId] || [];
        
        let updated = false;
        messages.forEach(msg => {
            if (!msg.read && msg.senderId !== this.currentUser.id) {
                msg.read = true;
                updated = true;
            }
        });
        
        if (updated) {
            saveAppData(data);
            this.loadStats();
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Создание заявки
        document.getElementById('create-order-btn').addEventListener('click', () => {
            this.showCreateOrderModal();
        });
        
        // Обновление заявок
        document.getElementById('refresh-orders').addEventListener('click', () => {
            this.loadOrders();
            this.loadStats();
            showNotification('Список заявок обновлен', 'success');
        });
        
        // Создание заявки (форма)
        document.getElementById('create-order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createOrder();
        });
        
        // Отмена создания заявки
        document.getElementById('cancel-create-order').addEventListener('click', () => {
            document.getElementById('create-order-modal').classList.remove('active');
        });
        
        // Закрытие модального окна создания
        document.getElementById('close-create-modal').addEventListener('click', () => {
            document.getElementById('create-order-modal').classList.remove('active');
        });
        
        // Отслеживание длины промта
        document.getElementById('project-prompt').addEventListener('input', (e) => {
            const length = e.target.value.length;
            const counter = document.getElementById('prompt-counter');
            counter.textContent = `${length} / 2500 символов`;
            
            if (length < 300 || length > 2500) {
                counter.classList.add('warning');
            } else {
                counter.classList.remove('warning');
            }
        });
        
        // Отправка сообщения в чате
        document.getElementById('send-message').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Отправка сообщения по Enter
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Закрытие чата
        document.getElementById('close-chat-modal').addEventListener('click', () => {
            document.getElementById('chat-modal').classList.remove('active');
        });
        
        // Загрузка файлов
        document.getElementById('project-files').addEventListener('change', (e) => {
            const fileList = document.getElementById('file-list');
            const files = Array.from(e.target.files);
            
            fileList.innerHTML = files.map(file => `
                <div style="margin-bottom: 4px; padding: 4px 8px; background: var(--gray-light); border-radius: 4px;">
                    <i class="fas fa-file" style="margin-right: 8px;"></i>
                    ${file.name} (${this.formatFileSize(file.size)})
                </div>
            `).join('');
        });
    }

    // Создание новой заявки
    createOrder() {
        // Получаем данные формы
        const projectName = document.getElementById('project-name').value.trim();
        const budget = parseInt(document.getElementById('project-budget').value);
        const deadline = parseInt(document.getElementById('project-deadline').value);
        const priority = document.getElementById('project-priority').value;
        const prompt = document.getElementById('project-prompt').value.trim();
        
        // Получаем выбранный тип сайта
        const selectedType = document.querySelector('.type-option.selected');
        const projectType = selectedType ? selectedType.dataset.type : '';
        
        // Валидация
        if (!projectName || !budget || !deadline || !priority || !projectType || !prompt) {
            showNotification('Заполните все обязательные поля', 'error');
            return;
        }
        
        if (prompt.length < 300) {
            showNotification('Промт должен содержать не менее 300 символов', 'error');
            return;
        }
        
        if (prompt.length > 2500) {
            showNotification('Промт должен содержать не более 2500 символов', 'error');
            return;
        }
        
        // Создаем данные заявки
        const orderData = {
            clientId: this.currentUser.id,
            clientName: this.currentUser.fullName,
            clientEmail: this.currentUser.email,
            clientPhone: this.currentUser.phone,
            clientTelegram: this.currentUser.telegram,
            projectName,
            projectType,
            budget,
            deadline,
            priority,
            prompt,
            status: 'new'
        };
        
        // Создаем заявку
        const newOrder = SiteCoreApp.createOrder(orderData);
        
        // Показываем уведомление
        showNotification('Заявка успешно создана!', 'success');
        
        // Закрываем модальное окно
        document.getElementById('create-order-modal').classList.remove('active');
        
        // Обновляем данные
        this.loadOrders();
        this.loadStats();
        
        // Автоматически открываем чат для новой заявки
        setTimeout(() => {
            this.openChat(newOrder.id);
        }, 500);
    }

    // Настройка меню пользователя
    setupUserMenu() {
        const userMenu = document.getElementById('user-menu');
        const dropdownMenu = document.getElementById('dropdown-menu');
        
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        // Профиль
        document.getElementById('profile-link').addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            this.showProfile();
        });
        
        // Настройки
        document.getElementById('settings-link').addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
            this.showSettings();
        });
        
        // Выход
        document.getElementById('logout-link').addEventListener('click', () => {
            this.logout();
        });
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Показать профиль
    showProfile() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <div>
                        <div class="modal-title">Мой профиль</div>
                        <div class="modal-subtitle">Личная информация</div>
                    </div>
                    <button class="modal-close" id="close-profile-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div class="user-avatar" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto 16px;">
                            ${this.currentUser.avatar}
                        </div>
                        <h3 style="font-size: 24px; margin-bottom: 8px;">${this.currentUser.fullName}</h3>
                        <p style="color: var(--gray);">Клиент</p>
                    </div>
                    
                    <div style="display: grid; gap: 16px;">
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--gray-light);">
                            <span style="font-weight: 600;">Email:</span>
                            <span>${this.currentUser.email}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--gray-light);">
                            <span style="font-weight: 600;">Телефон:</span>
                            <span>${this.currentUser.phone}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--gray-light);">
                            <span style="font-weight: 600;">Telegram:</span>
                            <span>${this.currentUser.telegram}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--gray-light);">
                            <span style="font-weight: 600;">Дата регистрации:</span>
                            <span>${formatDate(this.currentUser.registrationDate)}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="close-profile-btn">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#close-profile-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#close-profile-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Показать настройки
    showSettings() {
        showNotification('Настройки будут доступны в следующем обновлении', 'info');
    }

    // Выход из системы
    logout() {
        SiteCoreApp.clearSession();
        window.location.href = 'index.html';
    }

    // Вспомогательные методы
    getExecutorById(executorId) {
        const data = getAppData();
        return data.executors.find(e => e.id === executorId);
    }

    getPriorityText(priority) {
        const priorities = {
            'low': 'Низкий',
            'normal': 'Обычный',
            'high': 'Высокий',
            'urgent': 'Срочный'
        };
        return priorities[priority] || 'Не указан';
    }

    getSiteTypeIcon(typeId) {
        const icons = {
            'static': 'fa-file-code',
            'dynamic': 'fa-cogs',
            'ecommerce': 'fa-shopping-cart',
            'landing': 'fa-rocket',
            'corporate': 'fa-building'
        };
        return icons[typeId] || 'fa-globe';
    }

    getHistoryActionText(event) {
        switch (event.action) {
            case 'created':
                return 'Заявка создана';
            case 'status_changed':
                const fromStatus = SiteCoreApp.getStatusById(event.from);
                const toStatus = SiteCoreApp.getStatusById(event.to);
                return `Статус изменен с "${fromStatus ? fromStatus.name : event.from}" на "${toStatus ? toStatus.name : event.to}"`;
            case 'assigned':
                const executor = this.getExecutorById(event.executorId);
                return `Назначен исполнитель: ${executor ? executor.firstName : 'Неизвестно'}`;
            default:
                return 'Действие выполнено';
        }
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const app = new ClientApp();
    app.init();
});
