// Главный файл инициализации SiteCore
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация системы
    console.log('SiteCore Platform v1.0.0');
    
    // Проверка совместимости браузера
    if (!window.localStorage) {
        alert('Ваш браузер не поддерживает LocalStorage. Пожалуйста, обновите браузер.');
        return;
    }
    
    // Настройка обработки офлайн режима
    Utils.setupOfflineHandler();
    
    // Автоматическая очистка старых данных раз в день
    const lastCleanup = localStorage.getItem('lastCleanup');
    const today = new Date().toDateString();
    
    if (!lastCleanup || lastCleanup !== today) {
        SiteCore.cleanupOldData(30);
        localStorage.setItem('lastCleanup', today);
    }
    
    // Инициализация страницы в зависимости от URL
    initializePage();
});

// Инициализация страницы
function initializePage() {
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    switch(page) {
        case 'index.html':
        case '':
            initLoginPage();
            break;
        case 'client-dashboard.html':
            initClientDashboard();
            break;
        case 'executor-dashboard.html':
            initExecutorDashboard();
            break;
        default:
            // Если страница не найдена, перенаправляем на главную
            if (!Auth.isAuthenticated()) {
                window.location.href = 'index.html';
            }
    }
}

// Инициализация страницы входа
function initLoginPage() {
    // Если пользователь уже авторизован, перенаправляем
    if (Auth.isAuthenticated()) {
        if (Auth.isClient()) {
            window.location.href = 'client-dashboard.html';
        } else {
            window.location.href = 'executor-dashboard.html';
        }
        return;
    }
    
    // Настройка обработчиков событий
    setupLoginHandlers();
}

// Настройка обработчиков страницы входа
function setupLoginHandlers() {
    // Переключение между вкладками
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Обновляем активный таб
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Показываем соответствующую форму
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${tabId}-form`).classList.add('active');
        });
    });
    
    // Регистрация клиента
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('register-name').value.trim(),
                email: document.getElementById('register-email').value.trim(),
                phone: document.getElementById('register-phone').value.trim(),
                telegram: document.getElementById('register-telegram').value.trim(),
                password: document.getElementById('register-password').value
            };
            
            const result = await Auth.register(formData);
            
            if (result.success) {
                Utils.showNotification(result.message, 'success');
                setTimeout(() => {
                    window.location.href = 'client-dashboard.html';
                }, 1500);
            } else {
                Utils.showNotification(result.message, 'error');
            }
        });
    }
    
    // Вход клиента
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            const result = await Auth.login(email, password, 'client');
            
            if (result.success) {
                Utils.showNotification(result.message, 'success');
                setTimeout(() => {
                    window.location.href = 'client-dashboard.html';
                }, 1000);
            } else {
                Utils.showNotification(result.message, 'error');
            }
        });
    }
    
    // Вход разработчика
    const devLoginBtn = document.getElementById('dev-login-btn');
    if (devLoginBtn) {
        devLoginBtn.addEventListener('click', function() {
            openDevLoginModal();
        });
    }
}

// Модальное окно входа разработчика
function openDevLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'dev-login-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>Вход для разработчика</h2>
                <p>Введите пароль разработчика или администратора</p>
                
                <div class="form-group">
                    <input type="password" id="dev-password" placeholder="Пароль" class="form-input">
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary" id="cancel-dev">Отмена</button>
                    <button class="btn-primary" id="submit-dev">Войти</button>
                </div>
            </div>
        </div>
    `;
    
    // Стили
    const style = document.createElement('style');
    style.textContent = `
        .dev-login-modal .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .dev-login-modal .modal-content {
            background: white;
            padding: 32px;
            border-radius: 16px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        }
        .dev-login-modal h2 {
            margin-bottom: 12px;
            color: #333;
        }
        .dev-login-modal p {
            color: #666;
            margin-bottom: 24px;
        }
        .modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
        }
        .btn-primary, .btn-secondary {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-secondary {
            background: #e5e7eb;
            color: #333;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Обработчики
    modal.querySelector('#cancel-dev').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    });
    
    modal.querySelector('#submit-dev').addEventListener('click', async () => {
        const password = document.getElementById('dev-password').value;
        
        if (!password) {
            Utils.showNotification('Введите пароль', 'error');
            return;
        }
        
        const result = await Auth.loginDeveloper(password);
        
        if (result.success) {
            document.body.removeChild(modal);
            document.head.removeChild(style);
            
            Utils.showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = 'executor-dashboard.html';
            }, 1000);
        } else {
            Utils.showNotification(result.message, 'error');
        }
    });
    
    // Ввод по Enter
    modal.querySelector('#dev-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            modal.querySelector('#submit-dev').click();
        }
    });
}

// Инициализация клиентской панели
function initClientDashboard() {
    if (!Auth.isAuthenticated() || !Auth.isClient()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Загрузка данных
    loadClientData();
    setupClientHandlers();
}

// Загрузка данных клиента
async function loadClientData() {
    const user = Auth.getCurrentUser();
    
    // Обновляем информацию о пользователе
    if (document.getElementById('user-name')) {
        document.getElementById('user-name').textContent = user.name;
    }
    
    if (document.getElementById('user-email')) {
        document.getElementById('user-email').textContent = user.email;
    }
    
    if (document.getElementById('user-avatar')) {
        document.getElementById('user-avatar').textContent = user.avatar;
    }
    
    // Загружаем заказы
    const orders = Orders.getOrders();
    const stats = Orders.getOrderStatistics();
    
    // Обновляем статистику
    if (stats) {
        if (document.getElementById('active-orders-count')) {
            document.getElementById('active-orders-count').textContent = stats.inProgress;
        }
        if (document.getElementById('completed-orders-count')) {
            document.getElementById('completed-orders-count').textContent = stats.completed;
        }
        if (document.getElementById('total-budget')) {
            document.getElementById('total-budget').textContent = Utils.formatCurrency(stats.totalRevenue);
        }
        if (document.getElementById('orders-count')) {
            document.getElementById('orders-count').textContent = orders.length;
        }
    }
    
    // Загружаем последние заказы
    if (document.getElementById('recent-orders-list')) {
        displayRecentOrders(orders.slice(0, 5));
    }
    
    // Загружаем все заказы для таблицы
    if (document.getElementById('orders-table-body')) {
        displayAllOrders(orders);
    }
    
    // Загружаем профиль
    loadClientProfile();
}

// Отображение последних заказов
function displayRecentOrders(orders) {
    const container = document.getElementById('recent-orders-list');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i>📝</i>
                <h3>У вас пока нет заказов</h3>
                <p>Создайте первый заказ, чтобы начать работу</p>
                <button class="btn-primary" id="create-first-order">Создать первый заказ</button>
            </div>
        `;
        
        document.getElementById('create-first-order').addEventListener('click', () => {
            window.location.hash = '#new-order';
        });
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const orderData = Orders.formatOrderForDisplay(order);
        return `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <div class="order-title">${order.projectName}</div>
                    <div class="order-status status-${order.status}">
                        ${orderData.formattedStatus}
                    </div>
                </div>
                <div class="order-details">
                    <div class="order-detail">
                        <span class="order-detail-label">Тип</span>
                        <span class="order-detail-value">${orderData.formattedType}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Бюджет</span>
                        <span class="order-detail-value">${orderData.formattedBudget}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Срок</span>
                        <span class="order-detail-value">${order.deadline} дней</span>
                    </div>
                </div>
                <div class="order-footer">
                    <span>Создан: ${orderData.formattedCreatedDate}</span>
                    <button class="btn-small view" data-id="${order.id}">Подробнее</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики
    container.querySelectorAll('.btn-small.view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = parseInt(btn.getAttribute('data-id'));
            showOrderDetails(orderId);
        });
    });
}

// Инициализация панели исполнителя
function initExecutorDashboard() {
    if (!Auth.isAuthenticated() || (!Auth.isDeveloper() && !Auth.isAdmin())) {
        window.location.href = 'index.html';
        return;
    }
    
    loadExecutorData();
    setupExecutorHandlers();
}

// Экспорт всех функций для использования в HTML
window.SiteCore = SiteCore;
window.Auth = Auth;
window.Orders = Orders;
window.Utils = Utils;
window.initLoginPage = initLoginPage;
window.initClientDashboard = initClientDashboard;
window.initExecutorDashboard = initExecutorDashboard;
