// Главный объект исполнителя
class ExecutorApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.currentOrderId = null;
        this.currentChatId = null;
        this.draggedOrder = null;
        
        this.init();
    }
    
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
    }
    
    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }
    
    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateTo(section);
            });
        });
        
        // Поиск заказов
        const searchInput = document.getElementById('search-orders');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchOrders(e.target.value);
            });
        }
        
        // Фильтры
        const filterStatus = document.getElementById('filter-status');
        const filterType = document.getElementById('filter-type');
        const filterBudget = document.getElementById('filter-budget');
        
        if (filterStatus) filterStatus.addEventListener('change', () => this.loadAllOrders());
        if (filterType) filterType.addEventListener('change', () => this.loadAllOrders());
        if (filterBudget) filterBudget.addEventListener('change', () => this.loadAllOrders());
        
        // Переключение вида
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.switchView(view);
            });
        });
        
        // Смена статуса
        const statusSelect = document.getElementById('status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                this.updateUserStatus(e.target.value);
            });
        }
        
        // Закрытие модальных окон
        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        const clientModalClose = document.getElementById('client-modal-close');
        if (clientModalClose) {
            clientModalClose.addEventListener('click', () => {
                this.closeClientModal();
            });
        }
        
        // Выход
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }
    
    setupKanban() {
        // Настройка перетаскивания для карточек заказов
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                this.draggedOrder = {
                    id: parseInt(e.target.getAttribute('data-id')),
                    element: e.target
                };
                e.target.classList.add('dragging');
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.remove('dragging');
                this.draggedOrder = null;
            }
        });
        
        // Настройка зон сброса для колонок
        document.querySelectorAll('.kanban-column').forEach(column => {
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
                
                if (this.draggedOrder) {
                    const newStatus = column.id.replace('-column', '');
                    const statusMap = {
                        'new': 'new',
                        'progress': 'in_progress',
                        'review': 'review',
                        'completed': 'completed'
                    };
                    
                    const actualStatus = statusMap[newStatus];
                    this.updateOrderStatus(this.draggedOrder.id, actualStatus);
                }
            });
        });
    }
    
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
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Обновляем заголовок
        this.updatePageTitle(section);
        
        // Загружаем данные для секции
        this.loadSectionData(section);
        
        this.currentSection = section;
    }
    
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'Панель исполнителя',
            'all-orders': 'Все заказы',
            'my-orders': 'Мои заказы',
            'messages': 'Сообщения',
            'clients': 'Клиенты',
            'profile': 'Профиль'
        };
        
        const titleElement = document.getElementById('page-title');
        const subtitleElement = document.getElementById('page-subtitle');
        
        if (titleElement) {
            titleElement.textContent = titles[section] || 'Панель исполнителя';
        }
        
        if (subtitleElement) {
            subtitleElement.textContent = 'SiteCore Platform';
        }
    }
    
    loadSectionData(section) {
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
    }
    
    updateUI() {
        if (!this.currentUser) return;
        
        // Обновляем информацию пользователя
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('executor-name', this.currentUser.name);
        updateElement('executor-position', this.currentUser.position);
        updateElement('executor-avatar', this.currentUser.avatar);
        updateElement('welcome-name', this.currentUser.name);
        
        // Обновляем статистику
        const orders = DataManager.getAllOrders();
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        const availableOrders = DataManager.getAvailableOrders();
        
        const activeTasks = myOrders.filter(o => 
            o.status === 'in_progress' || o.status === 'review'
        ).length;
        
        // Заказы с близким дедлайном (менее 3 дней)
        const deadlineTasks = myOrders.filter(o => {
            if (o.status === 'completed' || o.status === 'paid') return false;
            const deadline = DataManager.calculateDeadline(o.deadline);
            const today = new Date();
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            return daysLeft <= 3;
        }).length;
        
        updateElement('active-tasks', activeTasks);
        updateElement('deadline-tasks', deadlineTasks);
        updateElement('all-orders-count', availableOrders.length);
        updateElement('my-orders-count', myOrders.length);
        
        // Обновляем уведомления
        const newMessages = this.countUnreadMessages();
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            const count = newMessages > 0 ? newMessages : '';
            notificationBell.querySelector('.notification-count').textContent = count;
        }
        
        updateElement('messages-count', newMessages);
    }
    
    countUnreadMessages() {
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        let unreadCount = 0;
        
        myOrders.forEach(order => {
            const messages = DataManager.getOrderMessages(order.id);
            const unread = messages.filter(msg => 
                msg.senderRole === 'client' && !msg.read
            ).length;
            unreadCount += unread;
        });
        
        return unreadCount;
    }
    
    loadDashboardData() {
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        
        // Приоритетные задачи (с близким дедлайном)
        const priorityOrders = myOrders
            .filter(o => {
                if (o.status === 'completed' || o.status === 'paid') return false;
                const deadline = DataManager.calculateDeadline(o.deadline);
                const today = new Date();
                const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                return daysLeft <= 5;
            })
            .sort((a, b) => {
                const deadlineA = DataManager.calculateDeadline(a.deadline);
                const deadlineB = DataManager.calculateDeadline(b.deadline);
                return deadlineA - deadlineB;
            })
            .slice(0, 3);
        
        const priorityList = document.getElementById('priority-list');
        if (priorityList) {
            if (priorityOrders.length === 0) {
                priorityList.innerHTML = `
                    <div class="empty-priority">
                        <i class="fas fa-check-circle"></i>
                        <p>Нет срочных задач</p>
                    </div>
                `;
            } else {
                priorityList.innerHTML = priorityOrders.map(order => {
                    const deadline = DataManager.calculateDeadline(order.deadline);
                    const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft <= 2;
                    
                    return `
                        <div class="priority-item ${isUrgent ? 'urgent' : ''}" data-id="${order.id}">
                            <h4>${order.projectName}</h4>
                            <p>${order.clientName}</p>
                            <div class="priority-meta">
                                <span>${DataManager.formatCurrency(order.budget)}</span>
                                <span>${daysLeft} дней</span>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Обработчики кликов по приоритетным задачам
                document.querySelectorAll('.priority-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const orderId = parseInt(item.getAttribute('data-id'));
                        this.viewOrderDetails(orderId);
                    });
                });
            }
        }
        
        // Сегодняшние задачи
        const todayTasks = myOrders.filter(o => 
            o.status === 'in_progress' || o.status === 'review'
        ).length;
        
        const todayTasksElement = document.getElementById('today-tasks');
        if (todayTasksElement) {
            todayTasksElement.textContent = todayTasks;
        }
        
        // Статистика за месяц
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const monthOrders = myOrders.filter(o => 
            new Date(o.createdDate) >= monthAgo && o.status === 'completed'
        );
        
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.budget || 0), 0);
        
        // Среднее время выполнения
        let avgTime = 14;
        const completedWithDates = monthOrders.filter(o => o.completedDate);
        if (completedWithDates.length > 0) {
            avgTime = completedWithDates.reduce((sum, o) => {
                const start = new Date(o.createdDate);
                const end = new Date(o.completedDate);
                return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            }, 0) / completedWithDates.length;
        }
        
        // Обновляем статистику
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateStat('month-completed', monthOrders.length);
        updateStat('month-revenue', DataManager.formatCurrency(monthRevenue));
        updateStat('avg-time', `${Math.round(avgTime)} дн.`);
        
        // Последняя активность
        this.loadActivity();
    }
    
    loadActivity() {
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id)
            .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate))
            .slice(0, 5);
        
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;
        
        if (myOrders.length === 0) {
            activityList.innerHTML = `
                <div class="empty-activity">
                    <i class="fas fa-history"></i>
                    <p>Активность отсутствует</p>
                </div>
            `;
            return;
        }
        
        activityList.innerHTML = myOrders.map(order => {
            const timeAgo = this.getTimeAgo(new Date(order.updatedDate));
            
            return `
                <div class="activity-item" data-id="${order.id}">
                    <div class="activity-header">
                        <div class="activity-avatar">${order.clientName.charAt(0)}</div>
                        <span class="activity-client">${order.clientName}</span>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                    <div class="activity-text">
                        ${this.getActivityText(order)}
                    </div>
                </div>
            `;
        }).join('');
        
        // Обработчики кликов по активности
        document.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('click', () => {
                const orderId = parseInt(item.getAttribute('data-id'));
                this.viewOrderDetails(orderId);
            });
        });
    }
    
    getActivityText(order) {
        const statusText = DataManager.getStatusText(order.status);
        const projectName = order.projectName.length > 30 ? 
            order.projectName.substring(0, 30) + '...' : order.projectName;
        
        return `Заказ "${projectName}" - ${statusText}`;
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins} мин назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч назад`;
        } else if (diffDays === 1) {
            return 'Вчера';
        } else {
            return `${diffDays} дн назад`;
        }
    }
    
    loadAllOrders() {
        const statusFilter = document.getElementById('filter-status')?.value || 'all';
        const typeFilter = document.getElementById('filter-type')?.value || 'all';
        const budgetFilter = document.getElementById('filter-budget')?.value || 'all';
        
        let orders = DataManager.getAvailableOrders();
        
        // Применяем фильтры
        if (statusFilter !== 'all') {
            orders = orders.filter(order => order.status === statusFilter);
        }
        
        if (typeFilter !== 'all') {
            orders = orders.filter(order => order.projectType === typeFilter);
        }
        
        if (budgetFilter !== 'all') {
            switch(budgetFilter) {
                case 'low':
                    orders = orders.filter(order => order.budget <= 50000);
                    break;
                case 'medium':
                    orders = orders.filter(order => order.budget > 50000 && order.budget <= 150000);
                    break;
                case 'high':
                    orders = orders.filter(order => order.budget > 150000);
                    break;
            }
        }
        
        const ordersGrid = document.getElementById('all-orders-grid');
        if (!ordersGrid) return;
        
        if (orders.length === 0) {
            ordersGrid.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-clipboard-check"></i>
                    <p>Нет доступных заказов</p>
                </div>
            `;
            return;
        }
        
        ordersGrid.innerHTML = orders.map(order => {
            const deadline = DataManager.calculateDeadline(order.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
            const isPriority = daysLeft <= 3;
            
            return `
                <div class="order-card ${isPriority ? 'priority' : ''}" data-id="${order.id}">
                    <div class="order-header">
                        <div>
                            <div class="order-title">${order.projectName}</div>
                            <div class="order-client">${order.clientName}</div>
                        </div>
                        <span class="order-badge ${order.status}">${DataManager.getStatusText(order.status)}</span>
                    </div>
                    
                    <div class="order-budget">${DataManager.formatCurrency(order.budget)}</div>
                    
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
            `;
        }).join('');
        
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
        
        // Обработчики кликов по карточкам
        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-take') && !e.target.closest('.btn-view')) {
                    const orderId = parseInt(card.getAttribute('data-id'));
                    this.viewOrderDetails(orderId, true);
                }
            });
        });
    }
    
    searchOrders(query) {
        const cards = document.querySelectorAll('.order-card');
        const searchTerm = query.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('.order-title')?.textContent.toLowerCase() || '';
            const client = card.querySelector('.order-client')?.textContent.toLowerCase() || '';
            const prompt = card.querySelector('.order-prompt-preview p')?.textContent.toLowerCase() || '';
            
            if (title.includes(searchTerm) || client.includes(searchTerm) || prompt.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    takeOrder(orderId) {
        const result = DataManager.assignOrder(orderId, this.currentUser.id);
        
        if (result.success) {
            this.showNotification('Заказ успешно взят в работу!', 'success');
            
            // Обновляем UI
            this.updateUI();
            this.loadAllOrders();
            this.loadMyOrders();
            this.loadDashboardData();
        } else {
            this.showNotification(result.message, 'error');
        }
    }
    
    viewOrderDetails(orderId, showActions = false) {
        const order = DataManager.getAllOrders().find(o => o.id === orderId);
        if (!order) return;
        
        // Получаем информацию о клиенте
        const clients = DataManager.getClients();
        const client = clients.find(c => c.id === order.clientId);
        
        const modal = document.getElementById('order-modal');
        const modalBody = document.getElementById('order-info-grid');
        const clientCard = document.getElementById('client-card');
        const promptContent = document.getElementById('modal-prompt-content');
        const modalActions = document.getElementById('modal-actions');
        
        if (!modal || !modalBody || !clientCard || !promptContent || !modalActions) return;
        
        // Информация о заказе
        const deadline = DataManager.calculateDeadline(order.deadline);
        const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        
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
                <span class="info-value">${DataManager.formatCurrency(order.budget)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Срок:</span>
                <span class="info-value">${order.deadline} дней</span>
            </div>
            <div class="info-item">
                <span class="info-label">Осталось дней:</span>
                <span class="info-value ${daysLeft < 3 ? 'urgent' : ''}">
                    ${daysLeft > 0 ? daysLeft : 'Просрочен'}
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">Статус:</span>
                <span class="info-value status-${order.status}">
                    ${DataManager.getStatusText(order.status)}
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">Дата создания:</span>
                <span class="info-value">${new Date(order.createdDate).toLocaleDateString()}</span>
            </div>
            ${order.assignedDate ? `
            <div class="info-item">
                <span class="info-label">Дата назначения:</span>
                <span class="info-value">${new Date(order.assignedDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
        `;
        
        // Информация о клиенте
        clientCard.innerHTML = client ? `
            <div class="client-info" data-client-id="${client.id}">
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
                <button class="btn-small view-client-profile">
                    <i class="fas fa-user"></i> Профиль клиента
                </button>
            </div>
        ` : '<p>Информация о клиенте не найдена</p>';
        
        // Обработчик кнопки просмотра профиля клиента
        const viewClientBtn = clientCard.querySelector('.view-client-profile');
        if (viewClientBtn && client) {
            viewClientBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewClientProfile(client);
            });
        }
        
        // Промт
        promptContent.textContent = order.prompt;
        
        // Статистика промта
        document.getElementById('prompt-length').textContent = `${order.prompt.length} символов`;
        document.getElementById('prompt-read-time').textContent = 
            `Время чтения: ${Math.ceil(order.prompt.length / 1000)} мин`;
        
        // Кнопки действий
        if (showActions && !order.executorId) {
            modalActions.innerHTML = `
                <button class="btn-secondary" id="modal-close-btn">Закрыть</button>
                <button class="btn-primary" id="modal-take-btn">Взять в работу</button>
            `;
            
            document.getElementById('modal-take-btn').addEventListener('click', () => {
                this.takeOrder(orderId);
                this.closeModal();
            });
            
            document.getElementById('modal-close-btn').addEventListener('click', () => {
                this.closeModal();
            });
        } else if (order.executorId === this.currentUser.id) {
            // Если заказ принадлежит текущему исполнителю
            modalActions.innerHTML = `
                <button class="btn-secondary" id="modal-close-btn">Закрыть</button>
                <button class="btn-primary" id="modal-chat-btn">
                    <i class="fas fa-comment"></i> Перейти в чат
                </button>
            `;
            
            document.getElementById('modal-chat-btn').addEventListener('click', () => {
                this.openChat(orderId);
                this.closeModal();
            });
            
            document.getElementById('modal-close-btn').addEventListener('click', () => {
                this.closeModal();
            });
        } else {
            modalActions.innerHTML = `
                <button class="btn-primary" id="modal-close-btn">Закрыть</button>
            `;
            
            document.getElementById('modal-close-btn').addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        document.getElementById('modal-order-title').textContent = order.projectName;
        modal.classList.add('active');
    }
    
    viewClientProfile(client) {
        const modal = document.getElementById('client-modal');
        const modalBody = document.getElementById('client-modal-body');
        
        if (!modal || !modalBody) return;
        
        // Получаем заказы клиента
        const clientOrders = DataManager.getClientOrders(client.id);
        const completedOrders = clientOrders.filter(o => o.status === 'completed').length;
        const totalSpent = clientOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        modalBody.innerHTML = `
            <div class="client-profile">
                <div class="client-profile-header">
                    <div class="client-avatar-large">${client.avatar}</div>
                    <div>
                        <h3>${client.name}</h3>
                        <p>Клиент SiteCore</p>
                    </div>
                </div>
                
                <div class="client-profile-info">
                    <div class="info-section">
                        <h4>Контактная информация</h4>
                        <div class="contact-details">
                            <div class="contact-detail">
                                <i class="fas fa-envelope"></i>
                                <span>${client.email}</span>
                            </div>
                            <div class="contact-detail">
                                <i class="fas fa-phone"></i>
                                <span>${client.phone}</span>
                            </div>
                            <div class="contact-detail">
                                <i class="fab fa-telegram"></i>
                                <span>${client.telegram}</span>
                            </div>
                            <div class="contact-detail">
                                <i class="fas fa-calendar"></i>
                                <span>С нами с ${new Date(client.registrationDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h4>Статистика</h4>
                        <div class="client-stats">
                            <div class="client-stat">
                                <span class="stat-value">${clientOrders.length}</span>
                                <span class="stat-label">Всего заказов</span>
                            </div>
                            <div class="client-stat">
                                <span class="stat-value">${completedOrders}</span>
                                <span class="stat-label">Завершено</span>
                            </div>
                            <div class="client-stat">
                                <span class="stat-value">${DataManager.formatCurrency(totalSpent)}</span>
                                <span class="stat-label">Потрачено</span>
                            </div>
                        </div>
                    </div>
                    
                    ${clientOrders.length > 0 ? `
                    <div class="info-section">
                        <h4>История заказов</h4>
                        <div class="client-orders">
                            ${clientOrders.map(order => `
                                <div class="client-order-item" data-id="${order.id}">
                                    <span class="order-name">${order.projectName}</span>
                                    <span class="order-status status-${order.status}">
                                        ${DataManager.getStatusText(order.status)}
                                    </span>
                                    <span class="order-budget">${DataManager.formatCurrency(order.budget)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Обработчики кликов по заказам клиента
        document.querySelectorAll('.client-order-item').forEach(item => {
            item.addEventListener('click', () => {
                const orderId = parseInt(item.getAttribute('data-id'));
                this.closeClientModal();
                this.viewOrderDetails(orderId);
            });
        });
        
        document.getElementById('client-modal-title').textContent = `Клиент: ${client.name}`;
        modal.classList.add('active');
    }
    
    loadMyOrders() {
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        
        // Обновляем колонки Канбан
        this.updateKanbanColumns(myOrders);
        
        // Обновляем счётчики
        const updateCounter = (id, status) => {
            const element = document.getElementById(id);
            if (element) {
                const count = myOrders.filter(o => o.status === status).length;
                element.textContent = count;
            }
        };
        
        updateCounter('new-count', 'new');
        updateCounter('progress-count', 'in_progress');
        updateCounter('review-count', 'review');
        updateCounter('completed-count', 'completed');
    }
    
    updateKanbanColumns(orders) {
        const columns = {
            'new': 'new-column',
            'progress': 'progress-column',
            'review': 'review-column',
            'completed': 'completed-column'
        };
        
        const statusMap = {
            'new': 'new',
            'progress': 'in_progress',
            'review': 'review',
            'completed': 'completed'
        };
        
        Object.entries(columns).forEach(([key, columnId]) => {
            const column = document.getElementById(columnId);
            if (!column) return;
            
            const status = statusMap[key];
            const columnOrders = orders.filter(o => o.status === status);
            
            column.innerHTML = columnOrders.map(order => {
                const deadline = DataManager.calculateDeadline(order.deadline);
                const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
                
                return `
                    <div class="kanban-card" 
                         data-id="${order.id}" 
                         data-status="${order.status}"
                         draggable="true">
                        <h5>${order.projectName}</h5>
                        <p>${order.clientName}</p>
                        <div class="kanban-meta">
                            <span>${DataManager.formatCurrency(order.budget)}</span>
                            <span>${daysLeft} дн.</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Обработчики для карточек
            column.querySelectorAll('.kanban-card').forEach(card => {
                card.addEventListener('click', () => {
                    const orderId = parseInt(card.getAttribute('data-id'));
                    this.viewOrderDetails(orderId);
                });
            });
        });
    }
    
    updateOrderStatus(orderId, newStatus) {
        const result = DataManager.updateOrderStatus(orderId, newStatus);
        
        if (result.success) {
            this.showNotification('Статус заказа обновлён', 'success');
            
            // Обновляем UI
            this.loadMyOrders();
            this.updateUI();
            this.loadDashboardData();
        } else {
            this.showNotification(result.message, 'error');
        }
    }
    
    switchView(view) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Здесь будет логика переключения между видами
        // Пока просто показываем уведомление
        if (view !== 'board') {
            this.showNotification(`Режим "${view}" будет реализован в следующем обновлении`, 'info');
        }
    }
    
    updateUserStatus(status) {
        // Обновляем статус пользователя в данных
        this.currentUser.online = status === 'online';
        
        // В реальном приложении здесь была бы синхронизация с сервером
        this.showNotification(`Статус изменён на "${status}"`, 'success');
    }
    
    loadExecutorConversations() {
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        const conversationsList = document.getElementById('executor-conversations');
        
        if (!conversationsList) return;
        
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
            const messages = DataManager.getOrderMessages(order.id);
            const lastMessage = messages[messages.length - 1];
            const unreadCount = messages.filter(msg => 
                msg.senderRole === 'client' && !msg.read
            ).length;
            
            return `
                <div class="conversation-item ${order.id === this.currentChatId ? 'active' : ''}" 
                     data-id="${order.id}">
                    <div class="conversation-header">
                        <div class="conversation-avatar">${order.clientName.charAt(0)}</div>
                        <div class="conversation-info">
                            <h4>${order.projectName}</h4>
                            <p>${order.clientName}</p>
                        </div>
                        ${unreadCount > 0 ? `
                        <span class="conversation-badge">${unreadCount}</span>
                        ` : ''}
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
        
        // Загружаем чат если есть текущий
        if (this.currentChatId) {
            this.loadExecutorChat(this.currentChatId);
        }
    }
    
    loadExecutorChat(orderId) {
        const chatMessages = document.getElementById('executor-chat-messages');
        const chatHeader = document.getElementById('executor-chat-header');
        const chatInput = document.getElementById('executor-chat-input');
        const sendButton = document.getElementById('executor-send-message');
        
        if (!chatMessages || !chatHeader || !chatInput || !sendButton) return;
        
        // Получаем информацию о заказе
        const order = DataManager.getAllOrders().find(o => o.id === orderId);
        if (!order) return;
        
        // Обновляем заголовок чата
        chatHeader.querySelector('.partner-avatar').textContent = order.clientName.charAt(0);
        chatHeader.querySelector('h4').textContent = order.clientName;
        chatHeader.querySelector('p').textContent = order.projectName;
        
        // Загружаем сообщения
        const messages = DataManager.getOrderMessages(orderId);
        this.renderExecutorMessages(chatMessages, messages);
        
        // Активируем поле ввода
        chatInput.disabled = false;
        chatInput.placeholder = "Напишите сообщение клиенту...";
        sendButton.disabled = false;
        
        // Обработчик отправки сообщения
        sendButton.onclick = () => this.sendExecutorMessage(orderId, chatInput);
        
        // Отправка по Enter
        chatInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendExecutorMessage(orderId, chatInput);
            }
        };
        
        // Помечаем сообщения как прочитанные
        this.markExecutorMessagesAsRead(orderId);
        
        // Обновляем текущий чат
        this.currentChatId = orderId;
        
        // Обновляем список диалогов
        this.loadExecutorConversations();
    }
    
    renderExecutorMessages(container, messages) {
        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <p>Начните общение с клиентом</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = messages.map(msg => {
            const isExecutor = msg.senderRole === 'executor';
            const isSystem = msg.senderRole === 'system';
            const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            if (isSystem) {
                return `
                    <div class="message system">
                        <div class="message-content">
                            <i class="fas fa-info-circle"></i>
                            ${msg.text}
                        </div>
                        <div class="message-time">${time}</div>
                    </div>
                `;
            }
            
            return `
                <div class="message ${isExecutor ? 'executor' : 'client'}">
                    <div class="message-header">
                        <span class="message-sender">${msg.senderName}</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-content">${msg.text}</div>
                </div>
            `;
        }).join('');
        
        // Прокручиваем вниз
        container.scrollTop = container.scrollHeight;
    }
    
    sendExecutorMessage(orderId, inputElement) {
        const text = inputElement.value.trim();
        if (!text) return;
        
        // Добавляем сообщение
        DataManager.addMessage(orderId, {
            senderId: this.currentUser.id,
            senderName: this.currentUser.name,
            senderRole: 'executor',
            text: text
        });
        
        // Очищаем поле ввода
        inputElement.value = '';
        
        // Обновляем чат
        this.loadExecutorChat(orderId);
        
        // Обновляем UI
        this.updateUI();
        this.loadExecutorConversations();
        
        // Показываем уведомление
        this.showNotification('Сообщение отправлено', 'success');
    }
    
    markExecutorMessagesAsRead(orderId) {
        const messages = DataManager.getOrderMessages(orderId);
        const updatedMessages = messages.map(msg => {
            if (msg.senderRole === 'client' && !msg.read) {
                return { ...msg, read: true };
            }
            return msg;
        });
        
        DataManager.saveOrderMessages(orderId, updatedMessages);
    }
    
    loadClients() {
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        
        // Собираем уникальных клиентов
        const clientIds = [...new Set(myOrders.map(o => o.clientId))];
        const clients = DataManager.getClients();
        const myClients = clients.filter(c => clientIds.includes(c.id));
        
        // Обновляем статистику клиентов
        const updateClientStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateClientStat('total-clients', myClients.length);
        
        const activeClients = myClients.filter(c => {
            const clientOrders = myOrders.filter(o => o.clientId === c.id);
            return clientOrders.some(o => o.status === 'in_progress' || o.status === 'review');
        }).length;
        
        updateClientStat('active-clients', activeClients);
        
        const repeatClients = myClients.filter(c => {
            const clientOrders = myOrders.filter(o => o.clientId === c.id);
            return clientOrders.length > 1;
        }).length;
        
        updateClientStat('repeat-clients', repeatClients);
        
        // Отображаем клиентов
        const clientsGrid = document.getElementById('clients-grid');
        if (!clientsGrid) return;
        
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
                <div class="client-card" data-client-id="${client.id}">
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
                            <span class="stat-value">${DataManager.formatCurrency(totalBudget)}</span>
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
                    const clientId = parseInt(card.getAttribute('data-client-id'));
                    const client = myClients.find(c => c.id === clientId);
                    if (client) {
                        this.viewClientProfile(client);
                    }
                }
            });
        });
    }
    
    loadExecutorProfile() {
        if (!this.currentUser) return;
        
        // Обновляем информацию профиля
        const updateProfileElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateProfileElement('executor-profile-name', this.currentUser.name);
        updateProfileElement('executor-profile-position', this.currentUser.position);
        updateProfileElement('executor-profile-avatar', this.currentUser.avatar);
        
        // Получаем статистику исполнителя
        const myOrders = DataManager.getExecutorOrders(this.currentUser.id);
        const completedOrders = myOrders.filter(o => o.status === 'completed').length;
        const activeOrders = myOrders.filter(o => 
            o.status === 'in_progress' || o.status === 'review'
        ).length;
        
        // Расчет среднего времени выполнения
        let avgTime = 14;
        const completedWithDates = myOrders.filter(o => 
            o.status === 'completed' && o.completedDate
        );
        
        if (completedWithDates.length > 0) {
            avgTime = completedWithDates.reduce((sum, o) => {
                const start = new Date(o.createdDate);
                const end = new Date(o.completedDate);
                return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            }, 0) / completedWithDates.length;
        }
        
        // Расчет удовлетворенности клиентов (упрощенно)
        const satisfactionRate = completedOrders > 0 ? '96%' : '100%';
        
        updateProfileElement('profile-rating', '4.8');
        updateProfileElement('profile-projects', completedOrders);
        updateProfileElement('profile-experience', '5 лет');
        
        updateProfileElement('stat-completed', completedOrders);
        updateProfileElement('stat-avg-time', Math.round(avgTime));
        updateProfileElement('stat-satisfaction', satisfactionRate);
    }
    
    closeModal() {
        const modal = document.getElementById('order-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    closeClientModal() {
        const modal = document.getElementById('client-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    openChat(orderId) {
        this.navigateTo('messages');
        this.loadExecutorChat(orderId);
    }
    
    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        if (!notification || !text) return;
        
        text.textContent = message;
        notification.className = `notification ${type} active`;
        
        setTimeout(() => {
            notification.classList.remove('active');
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.executorApp = new ExecutorApp();
});