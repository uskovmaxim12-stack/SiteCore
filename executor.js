// Приложение исполнителя
const ExecutorApp = {
    currentUser: null,
    
    // Инициализация
    init() {
        this.loadUser();
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        this.setupEventListeners();
        this.updateUI();
        this.loadDashboardData();
        this.setupNavigation();
    },
    
    // Загрузка пользователя
    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    },
    
    // Получение данных
    getData() {
        return JSON.parse(localStorage.getItem('sitecore_data')) || { clients: [], orders: [], messages: {}, executors: [] };
    },
    
    // Сохранение данных
    saveData(data) {
        localStorage.setItem('sitecore_data', JSON.stringify(data));
    },
    
    // Получение доступных заказов
    getAvailableOrders() {
        const data = this.getData();
        return data.orders.filter(order => order.status === 'new' && !order.assignedTo);
    },
    
    // Получение заказов исполнителя
    getMyOrders() {
        const data = this.getData();
        return data.orders.filter(order => order.assignedTo === this.currentUser.id);
    },
    
    // Обновление интерфейса
    updateUI() {
        if (!this.currentUser) return;
        
        // Обновляем информацию об исполнителе
        document.getElementById('executor-name').textContent = this.currentUser.name;
        document.getElementById('executor-avatar').textContent = this.currentUser.avatar;
        document.getElementById('executor-role').textContent = this.currentUser.specialization || 'Разработчик';
        document.getElementById('welcome-name').textContent = this.currentUser.name;
        
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-avatar').textContent = this.currentUser.avatar;
        document.getElementById('profile-specialization').textContent = this.currentUser.specialization || 'Разработчик';
        document.getElementById('profile-specialization-value').textContent = this.currentUser.specialization || 'Разработчик';
        document.getElementById('profile-status').textContent = this.currentUser.status || 'Online';
        
        // Обновляем дату
        this.updateDate();
        
        // Обновляем статистику
        this.updateStats();
    },
    
    // Обновление даты
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
    
    // Обновление статистики
    updateStats() {
        const availableOrders = this.getAvailableOrders();
        const myOrders = this.getMyOrders();
        
        // Обновляем счетчики
        document.getElementById('available-orders-count').textContent = availableOrders.length;
        document.getElementById('my-orders-count').textContent = myOrders.length;
        
        document.getElementById('active-tasks').textContent = 
            myOrders.filter(o => o.status === 'in-progress').length;
        document.getElementById('available-tasks').textContent = availableOrders.length;
        
        document.getElementById('available-count').textContent = availableOrders.length;
        document.getElementById('my-count').textContent = myOrders.length;
        document.getElementById('in-progress-count').textContent = 
            myOrders.filter(o => o.status === 'in-progress').length;
        document.getElementById('review-count').textContent = 
            myOrders.filter(o => o.status === 'review').length;
        
        // Общая статистика
        const data = this.getData();
        const allOrders = data.orders;
        
        const totalOrders = allOrders.length;
        const totalRevenue = allOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('total-revenue').textContent = this.formatCurrency(totalRevenue);
        
        // Статистика профиля
        const completedOrders = myOrders.filter(o => o.status === 'completed').length;
        const myRevenue = myOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        document.getElementById('profile-total-orders').textContent = completedOrders;
        document.getElementById('profile-total-revenue').textContent = this.formatCurrency(myRevenue);
        document.getElementById('stats-total-orders').textContent = myOrders.length;
        document.getElementById('stats-completed').textContent = completedOrders;
        document.getElementById('stats-in-progress').textContent = 
            myOrders.filter(o => o.status === 'in-progress').length;
        document.getElementById('stats-revenue').textContent = this.formatCurrency(myRevenue);
    },
    
    // Загрузка данных дашборда
    loadDashboardData() {
        // Обновляем статистику
        this.updateStats();
        
        // Загружаем доступные заказы
        this.loadAvailableOrders();
        
        // Загружаем заказы исполнителя
        this.loadMyOrders();
    },
    
    // Загрузка доступных заказов
    loadAvailableOrders() {
        const orders = this.getAvailableOrders();
        const grid = document.getElementById('available-orders-grid');
        
        if (orders.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i>📝</i>
                    <h3>Нет доступных заказов</h3>
                    <p>Все текущие заказы уже взяты в работу</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = orders.map(order => `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <div>
                        <div class="order-title">${order.projectName}</div>
                        <div class="order-client">${order.clientName}</div>
                    </div>
                    <div class="order-badge new">Новый</div>
                </div>
                
                <div class="order-budget">${this.formatCurrency(order.budget)}</div>
                
                <div class="order-details">
                    <div class="order-detail">
                        <span class="order-detail-label">Тип</span>
                        <span class="order-detail-value">${this.getTypeText(order.projectType)}</span>
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
                
                <div class="order-preview">
                    <p>${order.prompt.substring(0, 100)}...</p>
                </div>
                
                <div class="order-actions">
                    <button class="btn-take" data-id="${order.id}">Взять в работу</button>
                    <button class="btn-view" data-id="${order.id}">Подробнее</button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики
        document.querySelectorAll('.btn-take').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(btn.getAttribute('data-id'));
                this.takeOrder(orderId);
            });
        });
        
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(btn.getAttribute('data-id'));
                this.viewOrderDetails(orderId);
            });
        });
        
        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-take') && !e.target.classList.contains('btn-view')) {
                    const orderId = parseInt(card.getAttribute('data-id'));
                    this.viewOrderDetails(orderId);
                }
            });
        });
    },
    
    // Загрузка заказов исполнителя
    loadMyOrders() {
        const orders = this.getMyOrders();
        const grid = document.getElementById('my-orders-grid');
        
        if (orders.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i>👨‍💻</i>
                    <h3>У вас пока нет заказов</h3>
                    <p>Возьмите первый заказ из доступных</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = orders.map(order => `
            <div class="my-order-card" data-id="${order.id}">
                <div class="my-order-header">
                    <div class="my-order-title">${order.projectName}</div>
                    <select class="status-select" data-id="${order.id}">
                        <option value="in-progress" ${order.status === 'in-progress' ? 'selected' : ''}>В работе</option>
                        <option value="review" ${order.status === 'review' ? 'selected' : ''}>На проверке</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершён</option>
                    </select>
                </div>
                
                <div class="my-order-info">
                    <div class="my-order-info-item">
                        <span class="my-order-info-label">Клиент:</span>
                        <span class="my-order-info-value">${order.clientName}</span>
                    </div>
                    <div class="my-order-info-item">
                        <span class="my-order-info-label">Бюджет:</span>
                        <span class="my-order-info-value">${this.formatCurrency(order.budget)}</span>
                    </div>
                    <div class="my-order-info-item">
                        <span class="my-order-info-label">Срок:</span>
                        <span class="my-order-info-value">${order.deadline} дней</span>
                    </div>
                    <div class="my-order-info-item">
                        <span class="my-order-info-label">Создан:</span>
                        <span class="my-order-info-value">${new Date(order.createdDate).toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div class="my-order-actions">
                    <button class="btn-small primary" data-id="${order.id}">Подробнее</button>
                    <button class="btn-small secondary" data-id="${order.id}">Чат с клиентом</button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const orderId = parseInt(e.target.getAttribute('data-id'));
                const newStatus = e.target.value;
                this.updateOrderStatus(orderId, newStatus);
            });
        });
        
        document.querySelectorAll('.btn-small.primary').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = parseInt(btn.getAttribute('data-id'));
                this.viewOrderDetails(orderId);
            });
        });
        
        document.querySelectorAll('.btn-small.secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = parseInt(btn.getAttribute('data-id'));
                this.openChat(orderId);
            });
        });
    },
    
    // Взять заказ в работу
    takeOrder(orderId) {
        const data = this.getData();
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            this.showNotification('Заказ не найден', 'error');
            return;
        }
        
        // Обновляем заказ
        data.orders[orderIndex] = {
            ...data.orders[orderIndex],
            assignedTo: this.currentUser.id,
            status: 'in-progress',
            updatedDate: new Date().toISOString()
        };
        
        this.saveData(data);
        
        // Показываем уведомление
        this.showNotification('Заказ взят в работу!', 'success');
        
        // Обновляем данные
        this.loadDashboardData();
    },
    
    // Обновить статус заказа
    updateOrderStatus(orderId, newStatus) {
        const data = this.getData();
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            this.showNotification('Заказ не найден', 'error');
            return;
        }
        
        // Обновляем заказ
        data.orders[orderIndex] = {
            ...data.orders[orderIndex],
            status: newStatus,
            updatedDate: new Date().toISOString()
        };
        
        this.saveData(data);
        
        // Показываем уведомление
        this.showNotification('Статус заказа обновлён', 'success');
        
        // Обновляем данные
        this.loadDashboardData();
    },
    
    // Просмотр деталей заказа
    viewOrderDetails(orderId) {
        const data = this.getData();
        const order = data.orders.find(o => o.id === orderId);
        
        if (!order) return;
        
        const client = data.clients.find(c => c.id === order.clientId);
        
        const html = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-bottom: 24px; color: var(--dark);">${order.projectName}</h3>
                
                <div style="display: grid; gap: 16px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Клиент:</span>
                        <span style="font-weight: 600;">${order.clientName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Email:</span>
                        <span style="font-weight: 600;">${order.clientEmail}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Телефон:</span>
                        <span style="font-weight: 600;">${order.clientPhone}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Telegram:</span>
                        <span style="font-weight: 600;">${order.clientTelegram}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Тип сайта:</span>
                        <span style="font-weight: 600;">${this.getTypeText(order.projectType)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Бюджет:</span>
                        <span style="font-weight: 600;">${this.formatCurrency(order.budget)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Срок:</span>
                        <span style="font-weight: 600;">${order.deadline} дней</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Статус:</span>
                        <span class="order-status status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Создан:</span>
                        <span style="font-weight: 600;">${new Date(order.createdDate).toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <h4 style="margin-bottom: 12px; color: var(--dark);">Промт от клиента:</h4>
                    <div style="background: var(--gray-lighter); padding: 20px; border-radius: var(--radius); line-height: 1.6;">
                        ${order.prompt}
                    </div>
                    <div style="margin-top: 12px; font-size: 14px; color: var(--gray); text-align: right;">
                        ${order.prompt.length} символов
                    </div>
                </div>
            </div>
        `;
        
        this.showModal('Детали заказа', html);
    },
    
    // Открыть чат с клиентом
    openChat(orderId) {
        const data = this.getData();
        const order = data.orders.find(o => o.id === orderId);
        
        if (!order) return;
        
        const html = `
            <div style="padding: 20px; max-width: 500px;">
                <h3 style="margin-bottom: 24px; color: var(--dark);">Чат с клиентом</h3>
                <p style="margin-bottom: 16px; color: var(--gray);">
                    Для связи с клиентом <strong>${order.clientName}</strong> используйте:
                </p>
                <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--gray-lighter); border-radius: var(--radius);">
                        <span style="font-weight: 600;">📧 Email:</span>
                        <span>${order.clientEmail}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--gray-lighter); border-radius: var(--radius);">
                        <span style="font-weight: 600;">📱 Телефон:</span>
                        <span>${order.clientPhone}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--gray-lighter); border-radius: var(--radius);">
                        <span style="font-weight: 600;">✈️ Telegram:</span>
                        <span>${order.clientTelegram}</span>
                    </div>
                </div>
                <p style="color: var(--gray); font-size: 14px;">
                    <em>Интегрированный чат будет добавлен в следующем обновлении</em>
                </p>
            </div>
        `;
        
        this.showModal('Чат с клиентом', html);
    },
    
    // Показать модальное окно
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: var(--radius-lg); max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 24px; border-bottom: 1px solid var(--gray-light); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--dark);">${title}</h3>
                    <button id="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray);">&times;</button>
                </div>
                <div>${content}</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Обработчик закрытия
        modal.querySelector('#modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    },
    
    // Настройка навигации
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.navigateTo(section);
            });
        });
    },
    
    // Навигация по разделам
    navigateTo(section) {
        // Обновляем активный пункт меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Скрываем все разделы
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        
        // Показываем выбранный раздел
        document.getElementById(`${section}-section`).classList.add('active');
        
        // Обновляем заголовок
        this.updatePageTitle(section);
        
        // Загружаем данные для раздела
        if (section === 'available-orders') {
            this.loadAvailableOrders();
        } else if (section === 'my-orders') {
            this.loadMyOrders();
        } else if (section === 'dashboard') {
            this.loadDashboardData();
        }
    },
    
    // Обновление заголовка страницы
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'Панель исполнителя',
            'available-orders': 'Доступные заказы',
            'my-orders': 'Мои заказы',
            'profile': 'Профиль'
        };
        
        const subtitles = {
            'dashboard': 'Обзор и быстрый доступ',
            'available-orders': 'Новые проекты, ожидающие исполнителя',
            'my-orders': 'Проекты, которые вы взяли в работу',
            'profile': 'Ваш профиль исполнителя'
        };
        
        document.getElementById('page-title').textContent = titles[section] || 'Панель';
        document.getElementById('page-subtitle').textContent = subtitles[section] || '';
    },
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопки быстрого доступа
        document.getElementById('view-available-btn').addEventListener('click', () => {
            this.navigateTo('available-orders');
        });
        
        document.getElementById('view-my-orders-btn').addEventListener('click', () => {
            this.navigateTo('my-orders');
        });
        
        // Смена статуса
        document.getElementById('status-select').addEventListener('change', (e) => {
            this.currentUser.status = e.target.value;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showNotification(`Статус изменён на "${e.target.value}"`, 'info');
        });
        
        // Выход
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
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
            'in-progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершён'
        };
        return statuses[status] || status;
    },
    
    getTypeText(type) {
        const types = {
            'static': 'Статический',
            'dynamic': 'Динамический',
            'landing': 'Landing Page',
            'ecommerce': 'Интернет-магазин'
        };
        return types[type] || type;
    },
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    ExecutorApp.init();
});
