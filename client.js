// Клиентское приложение
const ClientApp = {
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
    
    // Получение заказов пользователя
    getUserOrders() {
        const data = this.getData();
        return data.orders.filter(order => order.clientId === this.currentUser.id);
    },
    
    // Обновление интерфейса
    updateUI() {
        if (!this.currentUser) return;
        
        // Обновляем информацию о пользователе
        document.getElementById('user-name').textContent = this.currentUser.name;
        document.getElementById('user-email').textContent = this.currentUser.email;
        document.getElementById('user-avatar').textContent = this.currentUser.avatar;
        document.getElementById('welcome-name').textContent = this.currentUser.name.split(' ')[0];
        
        // Обновляем дату
        this.updateDate();
        
        // Обновляем профиль
        this.updateProfile();
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
    
    // Обновление профиля
    updateProfile() {
        if (!this.currentUser) return;
        
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-avatar').textContent = this.currentUser.avatar;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        document.getElementById('profile-phone').textContent = this.currentUser.phone;
        document.getElementById('profile-telegram').textContent = this.currentUser.telegram;
        document.getElementById('profile-reg-date').textContent = 
            new Date(this.currentUser.registrationDate).toLocaleDateString('ru-RU');
        
        // Подсчет дней с регистрации
        const regDate = new Date(this.currentUser.registrationDate);
        const today = new Date();
        const daysDiff = Math.floor((today - regDate) / (1000 * 60 * 60 * 24));
        document.getElementById('profile-days').textContent = 
            daysDiff === 0 ? 'Сегодня' : daysDiff === 1 ? '1 день' : `${daysDiff} дней`;
        
        // Количество заказов
        const orders = this.getUserOrders();
        document.getElementById('profile-orders-count').textContent = orders.length;
    },
    
    // Загрузка данных дашборда
    loadDashboardData() {
        const orders = this.getUserOrders();
        
        // Обновляем статистику
        const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'in-progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const totalBudget = orders.reduce((sum, o) => sum + (o.budget || 0), 0);
        
        document.getElementById('active-orders-count').textContent = activeOrders;
        document.getElementById('completed-orders-count').textContent = completedOrders;
        document.getElementById('total-budget').textContent = this.formatCurrency(totalBudget);
        document.getElementById('orders-count').textContent = orders.length;
        
        // Загружаем последние заказы
        this.loadRecentOrders();
        
        // Загружаем все заказы для таблицы
        this.loadAllOrders();
    },
    
    // Загрузка последних заказов
    loadRecentOrders() {
        const orders = this.getUserOrders()
            .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
            .slice(0, 5);
        
        const ordersList = document.getElementById('recent-orders-list');
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <i>📝</i>
                    <h3>У вас пока нет заказов</h3>
                    <p>Создайте первый заказ, чтобы начать работу</p>
                    <button class="btn-primary btn-create" id="create-first-order">Создать первый заказ</button>
                </div>
            `;
            
            document.getElementById('create-first-order').addEventListener('click', () => {
                this.navigateTo('new-order');
            });
            return;
        }
        
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <div class="order-title">${order.projectName}</div>
                    <div class="order-status status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </div>
                </div>
                <div class="order-details">
                    <div class="order-detail">
                        <span class="order-detail-label">Тип</span>
                        <span class="order-detail-value">${this.getTypeText(order.projectType)}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Бюджет</span>
                        <span class="order-detail-value">${this.formatCurrency(order.budget)}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Срок</span>
                        <span class="order-detail-value">${order.deadline} дней</span>
                    </div>
                </div>
                <div class="order-footer">
                    <span>Создан: ${new Date(order.createdDate).toLocaleDateString()}</span>
                    <button class="btn-small view" data-id="${order.id}">Подробнее</button>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики
        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-small')) {
                    const orderId = parseInt(card.getAttribute('data-id'));
                    this.showOrderDetails(orderId);
                }
            });
        });
        
        document.querySelectorAll('.btn-small.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = parseInt(btn.getAttribute('data-id'));
                this.showOrderDetails(orderId);
            });
        });
    },
    
    // Загрузка всех заказов для таблицы
    loadAllOrders(filter = 'all') {
        let orders = this.getUserOrders();
        
        if (filter !== 'all') {
            orders = orders.filter(order => order.status === filter);
        }
        
        const tableBody = document.getElementById('orders-table-body');
        
        if (orders.length === 0) {
            tableBody.innerHTML = `
                <div class="order-row" style="text-align: center; padding: 40px;">
                    <div style="grid-column: 1 / -1;">
                        <i style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;">📝</i>
                        <p>Заказы не найдены</p>
                    </div>
                </div>
            `;
            return;
        }
        
        tableBody.innerHTML = orders.map(order => `
            <div class="order-row">
                <div style="font-weight: 600;">${order.projectName}</div>
                <div>${this.getTypeText(order.projectType)}</div>
                <div>${this.formatCurrency(order.budget)}</div>
                <div>${order.deadline} дней</div>
                <div>
                    <span class="order-status status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                <div class="order-actions">
                    <button class="btn-small view" data-id="${order.id}">Подробнее</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.btn-small.view').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = parseInt(btn.getAttribute('data-id'));
                this.showOrderDetails(orderId);
            });
        });
    },
    
    // Показать детали заказа
    showOrderDetails(orderId) {
        const orders = this.getUserOrders();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) return;
        
        const executor = order.assignedTo ? this.getExecutorById(order.assignedTo) : null;
        
        const html = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-bottom: 24px; color: var(--dark);">${order.projectName}</h3>
                
                <div style="display: grid; gap: 16px; margin-bottom: 24px;">
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
                    ${executor ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray);">Исполнитель:</span>
                        <span style="font-weight: 600;">${executor.name}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="margin-top: 24px;">
                    <h4 style="margin-bottom: 12px; color: var(--dark);">Промт для разработки:</h4>
                    <div style="background: var(--gray-lighter); padding: 20px; border-radius: var(--radius); line-height: 1.6;">
                        ${order.prompt}
                    </div>
                    <div style="margin-top: 12px; font-size: 14px; color: var(--gray); text-align: right;">
                        ${order.prompt.length} символов
                    </div>
                </div>
            </div>
        `;
        
        // Показываем модальное окно
        this.showModal('Детали заказа', html);
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
        if (section === 'orders') {
            this.loadAllOrders();
        } else if (section === 'dashboard') {
            this.loadDashboardData();
        }
    },
    
    // Обновление заголовка страницы
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'Главная',
            'orders': 'Мои заказы',
            'new-order': 'Новый заказ',
            'profile': 'Профиль'
        };
        
        const subtitles = {
            'dashboard': 'Панель управления SiteCore',
            'orders': 'Все ваши заказы на разработку сайтов',
            'new-order': 'Создание нового проекта',
            'profile': 'Ваш профиль клиента'
        };
        
        document.getElementById('page-title').textContent = titles[section] || 'Панель';
        document.getElementById('page-subtitle').textContent = subtitles[section] || '';
    },
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопка создания заказа на главной
        document.getElementById('create-order-btn').addEventListener('click', () => {
            this.navigateTo('new-order');
        });
        
        // Кнопка отмены в форме
        document.getElementById('cancel-order').addEventListener('click', () => {
            this.navigateTo('dashboard');
        });
        
        // Счетчик символов в промте
        document.getElementById('project-prompt').addEventListener('input', (e) => {
            const count = e.target.value.length;
            const counter = document.getElementById('prompt-counter');
            counter.textContent = `${count} / 2500 символов`;
            
            if (count < 300 || count > 2500) {
                counter.classList.add('warning');
            } else {
                counter.classList.remove('warning');
            }
        });
        
        // Фильтры заказов
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.getAttribute('data-filter');
                this.loadAllOrders(filter);
            });
        });
        
        // Создание нового заказа
        document.getElementById('create-order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createOrder();
        });
        
        // Выход
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
        
        // Редактирование профиля
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            this.showNotification('Редактирование профиля будет доступно в следующем обновлении', 'info');
        });
    },
    
    // Создание нового заказа
    createOrder() {
        const projectName = document.getElementById('project-name').value.trim();
        const projectType = document.getElementById('project-type').value;
        const budget = parseInt(document.getElementById('project-budget').value);
        const deadline = parseInt(document.getElementById('project-deadline').value);
        const prompt = document.getElementById('project-prompt').value.trim();
        
        // Валидация
        if (prompt.length < 300) {
            this.showNotification('Промт должен содержать не менее 300 символов', 'error');
            return;
        }
        
        if (prompt.length > 2500) {
            this.showNotification('Промт должен содержать не более 2500 символов', 'error');
            return;
        }
        
        if (!projectName || !projectType || !budget || !deadline) {
            this.showNotification('Заполните все обязательные поля', 'error');
            return;
        }
        
        const data = this.getData();
        
        // Создаем новый заказ
        const newOrder = {
            id: Date.now(),
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
            status: 'new',
            assignedTo: null,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
        
        data.orders.push(newOrder);
        this.saveData(data);
        
        // Показываем уведомление
        this.showNotification('Заказ успешно создан! Исполнитель скоро свяжется с вами.', 'success');
        
        // Очищаем форму
        document.getElementById('create-order-form').reset();
        document.getElementById('prompt-counter').textContent = '0 / 2500 символов';
        document.getElementById('prompt-counter').classList.remove('warning');
        
        // Возвращаемся на главную
        this.navigateTo('dashboard');
        
        // Обновляем данные
        this.loadDashboardData();
    },
    
    // Получение исполнителя по ID
    getExecutorById(executorId) {
        const data = this.getData();
        return data.executors.find(e => e.id === executorId);
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
    ClientApp.init();
});
