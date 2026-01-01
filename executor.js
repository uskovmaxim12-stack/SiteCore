// Главный объект исполнителя
const ExecutorApp = {
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
        this.setupKanban();
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
        
        // Выход
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
        
        // Поиск заказов
        document.getElementById('search-orders').addEventListener('input', (e) => {
            this.searchOrders(e.target.value);
        });
        
        // Фильтры
        document.getElementById('filter-status').addEventListener('change', () => this.loadAllOrders());
        document.getElementById('filter-type').addEventListener('change', () => this.loadAllOrders());
        document.getElementById('filter-budget').addEventListener('change', () => this.loadAllOrders());
        
        // Переключение вида
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                this.switchView(view);
            });
        });
        
        // Закрытие модальных окон
        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('order-modal').classList.remove('active');
        });
        
        document.getElementById('client-modal-close').addEventListener('click', () => {
            document.getElementById('client-modal').classList.remove('active');
        });
        
        // Смена статуса
        document.getElementById('status-select').addEventListener('change', (e) => {
            this.updateUserStatus(e.target.value);
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
            case 'all-orders':
                this.loadAllOrders();
                break;
            case 'my-orders':
                this.loadMyOrders();
                break;
            case 'messages':
                this.loadExecutorConversations();
                break;
            case 'clients':
                this.loadClients();
                break;
            case 'profile':
                this.loadExecutorProfile();
                break;
        }
        
        this.currentSection = section;
    },
    
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'Панель исполнителя',
            'all-orders': 'Все заказы',
            'my-orders': 'Мои заказы',
            'messages': 'Сообщения',
            'clients': 'Клиенты',
            'profile': 'Профиль'
        };
        
        document.getElementById('page-title').textContent = titles[section] || 'Панель исполнителя';
        document.getElementById('page-subtitle').textContent = 'SiteCore Platform';
    },
    
    updateUI() {
        if (!this.currentUser) return;
        
        // Обновляем информацию пользователя
        document.getElementById('executor-name').textContent = this.currentUser.name;
        document.getElementById('executor-position').textContent = this.currentUser.position;
        document.getElementById('executor-avatar').textContent = this.currentUser.avatar;
        document.getElementById('executor-rating').textContent = this.currentUser.rating;
        document.getElementById('executor-projects').textContent = `${this.currentUser.completedProjects} проектов`;
        document.getElementById('welcome-name').textContent = this.currentUser.name;
        
        // Обновляем статистику
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        const activeOrders = myOrders.filter(o => o.status === 'in_progress').length;
        const deadlineOrders = myOrders.filter(o => {
            if (!o.deadlineDate) return false;
            const deadline = new Date(o.deadlineDate);
            const today = new Date();
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            return daysLeft <= 3 && o.status !== 'completed';
        }).length;
        
        document.getElementById('active-tasks').textContent = activeOrders;
        document.getElementById('deadline-tasks').textContent = deadlineOrders;
        
        // Обновляем счётчики
        document.getElementById('all-orders-count').textContent = orders.filter(o => !o.assignedTo).length;
        document.getElementById('my-orders-count').textContent = myOrders.length;
    },
    
    loadDashboardData() {
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        
        // Приоритетные задачи
        const priorityList = document.getElementById('priority-list');
        const priorityOrders = myOrders
            .filter(o => o.status === 'in_progress')
            .sort((a, b) => {
                const aDeadline = new Date(a.deadlineDate || a.createdDate);
                const bDeadline = new Date(b.deadlineDate || b.createdDate);
                return aDeadline - bDeadline;
            })
            .slice(0, 3);
        
        if (priorityOrders.length === 0) {
            priorityList.innerHTML = `
                <div class="empty-priority">
                    <i class="fas fa-check-circle"></i>
                    <p>Нет активных задач</p>
                </div>
            `;
        } else {
            priorityList.innerHTML = priorityOrders.map(order => `
                <div class="priority-item ${this.isUrgent(order) ? 'urgent' : ''}">
                    <h4>${order.projectName}</h4>
                    <p>${order.prompt.substring(0, 60)}...</p>
                    <div class="priority-meta">
                        <span>${this.formatCurrency(order.budget)}</span>
                        <span>${this.getDaysLeft(order)} дней</span>
                    </div>
                </div>
            `).join('');
        }
        
        // Статистика за месяц
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const monthOrders = myOrders.filter(o => 
            new Date(o.createdDate) >= monthAgo && o.status === 'completed'
        );
        
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.budget || 0), 0);
        const avgTime = monthOrders.length > 0 ? 
            monthOrders.reduce((sum, o) => {
                const start = new Date(o.createdDate);
                const end = new Date(o.completedDate || new Date());
                return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            }, 0) / monthOrders.length : 0;
        
        document.getElementById('month-completed').textContent = monthOrders.length;
        document.getElementById('month-revenue').textContent = this.formatCurrency(monthRevenue);
        document.getElementById('avg-time').textContent = `${Math.round(avgTime)} дн.`;
        document.getElementById('satisfaction').textContent = '96%';
        
        // Сегодняшние задачи
        document.getElementById('today-tasks').textContent = priorityOrders.length;
        
        // Последняя активность
        this.loadActivity();
    },
    
    loadActivity() {
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        
        const activityList = document.getElementById('activity-list');
        const recentActivities = [];
        
        // Собираем активности из заказов
        myOrders.forEach(order => {
            recentActivities.push({
                type: 'order',
                orderId: order.id,
                clientId: order.clientId,
                clientName: order.clientName,
                projectName: order.projectName,
                action: this.getOrderAction(order),
                time: order.updatedDate || order.createdDate
            });
        });
        
        // Сортируем по времени
        recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        activityList.innerHTML = recentActivities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-header">
                    <div class="activity-avatar">${activity.clientName.charAt(0)}</div>
                    <span class="activity-client">${activity.clientName}</span>
                    <span class="activity-time">${new Date(activity.time).toLocaleDateString()}</span>
                </div>
                <div class="activity-text">
                    ${activity.action} для проекта "${activity.projectName}"
                </div>
            </div>
        `).join('');
    },
    
    getOrderAction(order) {
        switch(order.status) {
            case 'new': return 'Создан новый заказ';
            case 'in_progress': return 'Взят в работу';
            case 'review': return 'Отправлен на проверку';
            case 'completed': return 'Завершён';
            default: return 'Обновлён';
        }
    },
    
    loadAllOrders() {
        const statusFilter = document.getElementById('filter-status').value;
        const typeFilter = document.getElementById('filter-type').value;
        const budgetFilter = document.getElementById('filter-budget').value;
        
        let orders = DataManager.getOrders().filter(o => !o.assignedTo);
        
        // Применяем фильтры
        if (statusFilter !== 'all') {
            orders = orders.filter(o => o.status === statusFilter);
        }
        
        if (typeFilter !== 'all') {
            orders = orders.filter(o => o.projectType === typeFilter);
        }
        
        if (budgetFilter !== 'all') {
            switch(budgetFilter) {
                case 'low':
                    orders = orders.filter(o => o.budget <= 50000);
                    break;
                case 'medium':
                    orders = orders.filter(o => o.budget > 50000 && o.budget <= 150000);
                    break;
                case 'high':
                    orders = orders.filter(o => o.budget > 150000);
                    break;
            }
        }
        
        const ordersGrid = document.getElementById('all-orders-grid');
        
        if (orders.length === 0) {
            ordersGrid.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-clipboard-check"></i>
                    <p>Нет доступных заказов</p>
                </div>
            `;
            return;
        }
        
        ordersGrid.innerHTML = orders.map(order => `
            <div class="order-card ${this.isPriority(order) ? 'priority' : ''}">
                <div class="order-header">
                    <div>
                        <div class="order-title">${order.projectName}</div>
                        <div class="order-client">${order.clientName}</div>
                    </div>
                    <span class="order-badge ${order.status}">${this.getStatusText(order.status)}</span>
                </div>
                
                <div class="order-budget">${this.formatCurrency(order.budget)}</div>
                
                <div class="order-details">
                    <div class="order-detail">
                        <span class="order-detail-label">Тип</span>
                        <span class="order-detail-value">
                            ${order.projectType === 'static' ? 'Статический' : 'Динамический'}
                        </span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Срок</span>
                        <span class="order-detail-value">${order.deadline} дней</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Клиент</span>
                        <span class="order-detail-value">${order.clientName}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Телефон</span>
                        <span class="order-detail-value">${order.clientPhone}</span>
                    </div>
                </div>
                
                <div class="order-prompt-preview">
                    <p>${order.prompt.substring(0, 100)}...</p>
                </div>
                
                <div class="order-actions">
                    <button class="btn-take" data-id="${order.id}">Взять в работу</button>
                    <button class="btn-view" data-id="${order.id}">Подробнее</button>
                </div>
            </div>
        `).join('');
        
        // Обработчики кнопок
        document.querySelectorAll('.btn-take').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(button.getAttribute('data-id'));
                this.takeOrder(orderId);
            });
        });
        
        document.querySelectorAll('.btn-view').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(button.getAttribute('data-id'));
                this.viewOrderDetails(orderId, true);
            });
        });
        
        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', () => {
                const orderId = parseInt(card.querySelector('.btn-take').getAttribute('data-id'));
                this.viewOrderDetails(orderId, true);
            });
        });
    },
    
    takeOrder(orderId) {
        const updatedOrder = DataManager.assignOrder(orderId, this.currentUser.id);
        
        if (updatedOrder) {
            this.showNotification('Заказ успешно взят в работу!', 'success');
            this.updateUI();
            this.loadAllOrders();
            this.loadMyOrders();
        } else {
            this.showNotification('Ошибка при взятии заказа', 'error');
        }
    },
    
    viewOrderDetails(orderId, showActions = false) {
        const orders = DataManager.getOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) return;
        
        // Получаем информацию о клиенте
        const clients = DataManager.getClients();
        const client = clients.find(c => c.id === order.clientId);
        
        const modal = document.getElementById('order-modal');
        const modalBody = document.getElementById('order-info-grid');
        const clientCard = document.getElementById('client-card');
        const promptContent = document.getElementById('modal-prompt-content');
        const modalActions = document.getElementById('modal-actions');
        
        // Информация о заказе
        modalBody.innerHTML = `
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
        `;
        
        // Информация о клиенте
        clientCard.innerHTML = client ? `
            <div class="client-info">
                <div class="client-avatar">${client.avatar}</div>
                <h4>${client.name}</h4>
                <p>${client.email}</p>
                <div class="client-contact">
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>${client.phone}</span>
                    </div>
                    <div class="contact-item">
                        <i class="fab fa-telegram"></i>
                        <span>${client.telegram}</span>
                    </div>
                </div>
            </div>
        ` : '<p>Информация о клиенте не найдена</p>';
        
        // Промт
        promptContent.textContent = order.prompt;
        
        // Статистика промта
        document.getElementById('prompt-length').textContent = `${order.prompt.length} символов`;
        document.getElementById('prompt-read-time').textContent = 
            `Время чтения: ${Math.ceil(order.prompt.length / 1000)} мин`;
        
        // Кнопки действий
        if (showActions && !order.assignedTo) {
            modalActions.innerHTML = `
                <button class="btn-secondary" id="modal-close-btn">Закрыть</button>
                <button class="btn-primary" id="modal-take-btn">Взять в работу</button>
            `;
            
            document.getElementById('modal-take-btn').addEventListener('click', () => {
                this.takeOrder(orderId);
                modal.classList.remove('active');
            });
            
            document.getElementById('modal-close-btn').addEventListener('click', () => {
                modal.classList.remove('active');
            });
        } else {
            modalActions.innerHTML = `
                <button class="btn-primary" id="modal-close-btn">Закрыть</button>
            `;
            
            document.getElementById('modal-close-btn').addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        document.getElementById('modal-order-title').textContent = order.projectName;
        modal.classList.add('active');
    },
    
    loadMyOrders() {
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        
        // Обновляем колонки Канбан
        this.updateKanbanColumns(myOrders);
        
        // Обновляем счётчики
        document.getElementById('new-count').textContent = 
            myOrders.filter(o => o.status === 'new').length;
        document.getElementById('progress-count').textContent = 
            myOrders.filter(o => o.status === 'in_progress').length;
        document.getElementById('review-count').textContent = 
            myOrders.filter(o => o.status === 'review').length;
        document.getElementById('completed-count').textContent = 
            myOrders.filter(o => o.status === 'completed').length;
    },
    
    setupKanban() {
        const columns = document.querySelectorAll('.kanban-column');
        
        columns.forEach(column => {
            const columnBody = column.querySelector('.column-body');
            
            columnBody.addEventListener('dragover', (e) => {
                e.preventDefault();
                columnBody.style.background = 'rgba(102, 126, 234, 0.05)';
            });
            
            columnBody.addEventListener('dragleave', () => {
                columnBody.style.background = '';
            });
            
            columnBody.addEventListener('drop', (e) => {
                e.preventDefault();
                columnBody.style.background = '';
                
                const cardId = e.dataTransfer.getData('text/plain');
                const card = document.querySelector(`[data-id="${cardId}"]`);
                const newStatus = column.id.replace('-column', '');
                
                if (card && card.dataset.status !== newStatus) {
                    this.updateOrderStatus(cardId, newStatus);
                }
            });
        });
    },
    
    updateKanbanColumns(orders) {
        const columns = ['new', 'progress', 'review', 'completed'];
        
        columns.forEach(status => {
            const column = document.getElementById(`${status}-column`);
            const statusKey = status === 'progress' ? 'in_progress' : status;
            const columnOrders = orders.filter(o => o.status === statusKey);
            
            column.innerHTML = columnOrders.map(order => `
                <div class="kanban-card" 
                     data-id="${order.id}" 
                     data-status="${order.status}"
                     draggable="true">
                    <h5>${order.projectName}</h5>
                    <p>${order.clientName}</p>
                    <div class="kanban-meta">
                        <span>${this.formatCurrency(order.budget)}</span>
                        <span>${this.getDaysLeft(order)} дн.</span>
                    </div>
                </div>
            `).join('');
            
            // Добавляем обработчики перетаскивания
            column.querySelectorAll('.kanban-card').forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', card.dataset.id);
                    card.classList.add('dragging');
                });
                
                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                });
                
                card.addEventListener('click', () => {
                    this.viewOrderDetails(parseInt(card.dataset.id));
                });
            });
        });
    },
    
    updateOrderStatus(orderId, newStatus) {
        const updatedOrder = DataManager.updateOrderStatus(orderId, newStatus);
        
        if (updatedOrder) {
            this.showNotification('Статус заказа обновлён', 'success');
            this.loadMyOrders();
            this.updateUI();
        }
    },
    
    loadExecutorConversations() {
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        const messages = DataManager.getMessages();
        
        const conversationsList = document.getElementById('executor-conversations');
        
        if (myOrders.length === 0) {
            conversationsList.innerHTML = `
                <div class="empty-conversations">
                    <i class="fas fa-comments"></i>
                    <p>У вас пока нет диалогов</p>
                </div>
            `;
            return;
        }
        
        conversationsList.innerHTML = myOrders.map(order => {
            const orderMessages = messages[order.id] || [];
            const lastMessage = orderMessages[orderMessages.length - 1];
            
            return `
                <div class="conversation-item" data-id="${order.id}">
                    <div class="conversation-header">
                        <div class="conversation-avatar">${order.clientName.charAt(0)}</div>
                        <div class="conversation-info">
                            <h4>${order.projectName}</h4>
                            <p>${order.clientName}</p>
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
                this.loadExecutorChat(orderId);
            });
        });
    },
    
    loadExecutorChat(orderId) {
        // Заглушка для чата
        const chatMessages = document.getElementById('executor-chat-messages');
        chatMessages.innerHTML = `
            <div class="chat-info">
                <i class="fas fa-info-circle"></i>
                <p>Функция чата будет реализована в следующем обновлении</p>
            </div>
        `;
        
        // Получаем информацию о заказе
        const order = DataManager.getOrders().find(o => o.id === orderId);
        if (order) {
            const chatHeader = document.getElementById('executor-chat-header');
            chatHeader.querySelector('.partner-avatar').textContent = order.clientName.charAt(0);
            chatHeader.querySelector('h4').textContent = order.clientName;
            chatHeader.querySelector('p').textContent = order.projectName;
        }
        
        // Активируем поле ввода
        const chatInput = document.getElementById('executor-chat-input');
        const sendButton = document.getElementById('executor-send-message');
        
        chatInput.disabled = true;
        sendButton.disabled = true;
        chatInput.placeholder = "Чат будет доступен в следующем обновлении";
    },
    
    loadClients() {
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        
        // Собираем уникальных клиентов
        const clientIds = [...new Set(myOrders.map(o => o.clientId))];
        const clients = DataManager.getClients();
        const myClients = clients.filter(c => clientIds.includes(c.id));
        
        // Обновляем статистику клиентов
        document.getElementById('total-clients').textContent = myClients.length;
        document.getElementById('active-clients').textContent = 
            myClients.filter(c => {
                const clientOrders = myOrders.filter(o => o.clientId === c.id);
                return clientOrders.some(o => o.status === 'in_progress');
            }).length;
        document.getElementById('repeat-clients').textContent = 
            myClients.filter(c => {
                const clientOrders = myOrders.filter(o => o.clientId === c.id);
                return clientOrders.length > 1;
            }).length;
        
        // Отображаем клиентов
        const clientsGrid = document.getElementById('clients-grid');
        
        if (myClients.length === 0) {
            clientsGrid.innerHTML = `
                <div class="empty-clients">
                    <i class="fas fa-users"></i>
                    <p>У вас пока нет клиентов</p>
                </div>
            `;
            return;
        }
        
        clientsGrid.innerHTML = myClients.map(client => {
            const clientOrders = myOrders.filter(o => o.clientId === client.id);
            const completedOrders = clientOrders.filter(o => o.status === 'completed').length;
            const totalBudget = clientOrders.reduce((sum, o) => sum + (o.budget || 0), 0);
            
            return `
                <div class="client-card">
                    <div class="client-avatar">${client.avatar}</div>
                    <h3>${client.name}</h3>
                    <p>${client.email}</p>
                    <div class="client-contact">
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>${client.phone}</span>
                        </div>
                        <div class="contact-item">
                            <i class="fab fa-telegram"></i>
                            <span>${client.telegram}</span>
                        </div>
                    </div>
                    <div class="client-stats-mini">
                        <div class="client-stat-mini">
                            <span class="stat-value">${clientOrders.length}</span>
                            <span class="stat-label">Заказов</span>
                        </div>
                        <div class="client-stat-mini">
                            <span class="stat-value">${this.formatCurrency(totalBudget)}</span>
                            <span class="stat-label">Сумма</span>
                        </div>
                        <div class="client-stat-mini">
                            <span class="stat-value">${completedOrders}</span>
                            <span class="stat-label">Выполнено</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Обработчики кликов по карточкам клиентов
        document.querySelectorAll('.client-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.client-contact') && !e.target.closest('.client-stats-mini')) {
                    // Здесь можно добавить открытие подробной информации о клиенте
                    this.showNotification('Детальная информация о клиенте будет доступна в следующем обновлении', 'info');
                }
            });
        });
    },
    
    loadExecutorProfile() {
        if (!this.currentUser) return;
        
        // Основная информация
        document.getElementById('executor-profile-name').textContent = this.currentUser.name;
        document.getElementById('executor-profile-position').textContent = this.currentUser.position;
        document.getElementById('executor-profile-avatar').textContent = this.currentUser.avatar;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        document.getElementById('profile-phone').textContent = this.currentUser.phone;
        document.getElementById('profile-telegram').textContent = this.currentUser.telegram;
        document.getElementById('profile-bio').textContent = this.currentUser.bio;
        
        // Рейтинг и статистика
        document.getElementById('profile-rating').textContent = this.currentUser.rating;
        document.getElementById('profile-projects').textContent = this.currentUser.completedProjects;
        document.getElementById('profile-experience').textContent = this.currentUser.experience;
        
        // Навыки
        const skillTags = document.getElementById('skill-tags');
        skillTags.innerHTML = this.currentUser.skills
            .map(skill => `<span class="skill-tag">${skill}</span>`)
            .join('');
        
        // Статистика работы
        const orders = DataManager.getOrders();
        const myOrders = orders.filter(o => o.assignedTo === this.currentUser.id);
        const completedOrders = myOrders.filter(o => o.status === 'completed').length;
        
        // Среднее время выполнения (упрощённо)
        const completedWithDates = myOrders.filter(o => o.status === 'completed' && o.createdDate && o.completedDate);
        let avgTime = 14; // Значение по умолчанию
        if (completedWithDates.length > 0) {
            avgTime = completedWithDates.reduce((sum, o) => {
                const start = new Date(o.createdDate);
                const end = new Date(o.completedDate);
                return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            }, 0) / completedWithDates.length;
        }
        
        document.getElementById('stat-completed').textContent = completedOrders;
        document.getElementById('stat-avg-time').textContent = Math.round(avgTime);
        document.getElementById('stat-satisfaction').textContent = '96%';
    },
    
    switchView(view) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Здесь будет логика переключения между доской, списком и календарём
        this.showNotification(`Режим "${view}" будет доступен в следующем обновлении`, 'info');
    },
    
    updateUserStatus(status) {
        // Обновляем статус пользователя
        this.currentUser.status = status;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showNotification(`Статус изменён на "${status}"`, 'success');
    },
    
    searchOrders(query) {
        const cards = document.querySelectorAll('.order-card');
        const searchTerm = query.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('.order-title').textContent.toLowerCase();
            const client = card.querySelector('.order-client').textContent.toLowerCase();
            const prompt = card.querySelector('.order-prompt-preview p')?.textContent.toLowerCase() || '';
            
            if (title.includes(searchTerm) || client.includes(searchTerm) || prompt.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    },
    
    // Вспомогательные методы
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
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
    
    isPriority(order) {
        // Заказ приоритетный, если срок менее 7 дней
        const deadline = new Date(order.createdDate);
        deadline.setDate(deadline.getDate() + order.deadline);
        const today = new Date();
        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return daysLeft < 7;
    },
    
    isUrgent(order) {
        // Заказ срочный, если срок менее 3 дней
        const deadline = new Date(order.createdDate);
        deadline.setDate(deadline.getDate() + order.deadline);
        const today = new Date();
        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return daysLeft < 3;
    },
    
    getDaysLeft(order) {
        const deadline = new Date(order.createdDate);
        deadline.setDate(deadline.getDate() + order.deadline);
        const today = new Date();
        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 ? daysLeft : 0;
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
    ExecutorApp.init();
});