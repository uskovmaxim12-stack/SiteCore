// Главный модуль данных
const SiteCoreApp = {
    // Инициализация приложения
    initialize() {
        this.initData();
        this.loadSession();
    },
    
    // Инициализация данных
    initData() {
        if (!localStorage.getItem('sitecore_data')) {
            const initialData = {
                clients: [],
                orders: [],
                messages: {},
                executors: [
                    {
                        id: 1,
                        firstName: "Максим",
                        lastName: "Администратор",
                        fullName: "Максим Администратор",
                        role: "admin",
                        permissions: ["all"],
                        avatar: "МА",
                        status: "online",
                        lastActive: new Date().toISOString()
                    },
                    {
                        id: 2,
                        firstName: "Александр",
                        lastName: "Разработчик",
                        fullName: "Александр Разработчик",
                        role: "executor",
                        permissions: ["view_orders", "take_orders", "update_status", "chat"],
                        avatar: "АР",
                        status: "online",
                        lastActive: new Date().toISOString()
                    }
                ],
                settings: {
                    minPromptLength: 300,
                    maxPromptLength: 2500,
                    orderStatuses: [
                        { id: 'new', name: 'Новая', color: '#3b82f6' },
                        { id: 'in_progress', name: 'В работе', color: '#f59e0b' },
                        { id: 'review', name: 'На проверке', color: '#8b5cf6' },
                        { id: 'completed', name: 'Завершена', color: '#10b981' },
                        { id: 'rejected', name: 'Отклонена', color: '#ef4444' }
                    ],
                    siteTypes: [
                        { id: 'static', name: 'Статический сайт', priceRange: 'от 15 000 ₽' },
                        { id: 'dynamic', name: 'Динамический сайт', priceRange: 'от 50 000 ₽' },
                        { id: 'ecommerce', name: 'Интернет-магазин', priceRange: 'от 80 000 ₽' },
                        { id: 'landing', name: 'Лендинг', priceRange: 'от 25 000 ₽' },
                        { id: 'corporate', name: 'Корпоративный сайт', priceRange: 'от 100 000 ₽' }
                    ]
                }
            };
            
            localStorage.setItem('sitecore_data', JSON.stringify(initialData));
        }
    },
    
    // Получение данных
    getData() {
        return JSON.parse(localStorage.getItem('sitecore_data'));
    },
    
    // Сохранение данных
    saveData(data) {
        localStorage.setItem('sitecore_data', JSON.stringify(data));
    },
    
    // Загрузка сессии
    loadSession() {
        return JSON.parse(localStorage.getItem('current_session'));
    },
    
    // Сохранение сессии
    saveSession(user) {
        // Не храним пароль в сессии
        const { password, ...userWithoutPassword } = user;
        localStorage.setItem('current_session', JSON.stringify(userWithoutPassword));
    },
    
    // Очистка сессии
    clearSession() {
        localStorage.removeItem('current_session');
    },
    
    // Проверка авторизации
    checkAuth(requiredRole = null) {
        const session = this.loadSession();
        
        if (!session) {
            return { auth: false, user: null };
        }
        
        if (requiredRole && session.role !== requiredRole) {
            return { auth: false, user: null };
        }
        
        return { auth: true, user: session };
    },
    
    // Создание нового заказа
    createOrder(orderData) {
        const data = this.getData();
        
        const newOrder = {
            id: Date.now(),
            ...orderData,
            status: 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            history: [
                {
                    action: 'created',
                    timestamp: new Date().toISOString(),
                    user: orderData.clientName
                }
            ]
        };
        
        data.orders.push(newOrder);
        this.saveData(data);
        
        return newOrder;
    },
    
    // Обновление статуса заказа
    updateOrderStatus(orderId, status, executorId = null) {
        const data = this.getData();
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) return null;
        
        const oldStatus = data.orders[orderIndex].status;
        
        data.orders[orderIndex] = {
            ...data.orders[orderIndex],
            status,
            updatedAt: new Date().toISOString(),
            assignedTo: executorId || data.orders[orderIndex].assignedTo
        };
        
        // Добавляем в историю
        data.orders[orderIndex].history.push({
            action: 'status_changed',
            from: oldStatus,
            to: status,
            timestamp: new Date().toISOString(),
            executorId
        });
        
        this.saveData(data);
        
        return data.orders[orderIndex];
    },
    
    // Назначение заказа исполнителю
    assignOrder(orderId, executorId, assignedBy = null) {
        const data = this.getData();
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) return null;
        
        data.orders[orderIndex] = {
            ...data.orders[orderIndex],
            assignedTo: executorId,
            status: 'in_progress',
            updatedAt: new Date().toISOString()
        };
        
        // Добавляем в историю
        data.orders[orderIndex].history.push({
            action: 'assigned',
            executorId,
            assignedBy,
            timestamp: new Date().toISOString()
        });
        
        this.saveData(data);
        
        return data.orders[orderIndex];
    },
    
    // Добавление сообщения
    addMessage(orderId, messageData) {
        const data = this.getData();
        
        if (!data.messages[orderId]) {
            data.messages[orderId] = [];
        }
        
        const newMessage = {
            id: Date.now(),
            ...messageData,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        data.messages[orderId].push(newMessage);
        this.saveData(data);
        
        return newMessage;
    },
    
    // Получение статистики
    getStatistics() {
        const data = this.getData();
        const orders = data.orders;
        
        const totalOrders = orders.length;
        const newOrders = orders.filter(o => o.status === 'new').length;
        const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        
        // Общий доход (сумма завершенных заказов)
        const totalRevenue = orders
            .filter(o => o.status === 'completed' && o.budget)
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        // Доход за последние 30 дней
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentRevenue = orders
            .filter(o => o.status === 'completed' && o.budget && new Date(o.updatedAt) > thirtyDaysAgo)
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        // Среднее время выполнения
        let avgCompletionTime = 0;
        const completedWithDates = orders.filter(o => o.status === 'completed' && o.createdAt && o.updatedAt);
        
        if (completedWithDates.length > 0) {
            const totalTime = completedWithDates.reduce((sum, o) => {
                const start = new Date(o.createdAt);
                const end = new Date(o.updatedAt);
                return sum + (end - start);
            }, 0);
            
            avgCompletionTime = Math.round(totalTime / completedWithDates.length / (1000 * 60 * 60 * 24));
        }
        
        return {
            totalOrders,
            newOrders,
            inProgressOrders,
            completedOrders,
            totalRevenue,
            recentRevenue,
            avgCompletionTime,
            totalClients: data.clients.length,
            activeClients: data.clients.filter(c => c.status === 'active').length
        };
    },
    
    // Форматирование валюты
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    // Форматирование даты
    formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        
        const defaultOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('ru-RU', { ...defaultOptions, ...options });
    },
    
    // Получение статуса по ID
    getStatusById(statusId) {
        const data = this.getData();
        return data.settings.orderStatuses.find(s => s.id === statusId);
    },
    
    // Получение типа сайта по ID
    getSiteTypeById(typeId) {
        const data = this.getData();
        return data.settings.siteTypes.find(t => t.id === typeId);
    }
};

// Глобальные функции для использования в HTML
function initializeApp() {
    SiteCoreApp.initialize();
}

function getAppData() {
    return SiteCoreApp.getData();
}

function saveAppData(data) {
    SiteCoreApp.saveData(data);
}

function saveSession(user) {
    SiteCoreApp.saveSession(user);
}

function getCurrentUser() {
    return SiteCoreApp.loadSession();
}

function isAuthenticated(requiredRole = null) {
    const auth = SiteCoreApp.checkAuth(requiredRole);
    return auth.auth;
}

function redirectIfNotAuthenticated(requiredRole = null, redirectTo = 'index.html') {
    const auth = SiteCoreApp.checkAuth(requiredRole);
    
    if (!auth.auth) {
        window.location.href = redirectTo;
        return false;
    }
    
    return auth.user;
}

function formatCurrency(amount) {
    return SiteCoreApp.formatCurrency(amount);
}

function formatDate(dateString, options) {
    return SiteCoreApp.formatDate(dateString, options);
}

function showNotification(message, type = 'info', duration = 3000) {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.sitecore-notification');
    existingNotifications.forEach(n => n.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `sitecore-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon ${type === 'success' ? 'fas fa-check-circle' : 
                                           type === 'error' ? 'fas fa-exclamation-circle' : 
                                           type === 'warning' ? 'fas fa-exclamation-triangle' : 
                                           'fas fa-info-circle'}"></i>
            <span class="notification-text">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : 
                      type === 'error' ? '#ef4444' : 
                      type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        min-width: 300px;
    `;
    
    const contentStyle = `
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    const iconStyle = `
        font-size: 20px;
    `;
    
    const textStyle = `
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
    `;
    
    const closeStyle = `
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.3s ease;
    `;
    
    notification.querySelector('.notification-content').style.cssText = contentStyle;
    notification.querySelector('.notification-icon').style.cssText = iconStyle;
    notification.querySelector('.notification-text').style.cssText = textStyle;
    notification.querySelector('.notification-close').style.cssText = closeStyle;
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Обработчики событий
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Автоматическое скрытие
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    // CSS анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    
    if (!document.querySelector('#notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }
    
    return notification;
}

// Создаем глобальные стили
function createGlobalStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.5;
        }
        
        .btn {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #4361ee, #7209b7);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(67, 97, 238, 0.3);
        }
        
        .btn-secondary {
            background: white;
            color: #1e293b;
            border: 2px solid #e2e8f0;
        }
        
        .btn-secondary:hover {
            border-color: #4361ee;
            background: rgba(67, 97, 238, 0.02);
        }
        
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        
        .btn-danger:hover {
            background: #dc2626;
            transform: translateY(-2px);
        }
        
        .btn-success {
            background: #10b981;
            color: white;
        }
        
        .btn-success:hover {
            background: #059669;
            transform: translateY(-2px);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #4361ee;
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.15);
        }
        
        .form-select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
        }
        
        .form-select:focus {
            outline: none;
            border-color: #4361ee;
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.15);
        }
        
        .form-textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            min-height: 120px;
            resize: vertical;
            font-family: inherit;
        }
        
        .form-textarea:focus {
            outline: none;
            border-color: #4361ee;
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.15);
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-align: center;
        }
        
        .status-new {
            background: #dbeafe;
            color: #1d4ed8;
        }
        
        .status-in_progress {
            background: #fef3c7;
            color: #d97706;
        }
        
        .status-review {
            background: #fce7f3;
            color: #be185d;
        }
        
        .status-completed {
            background: #dcfce7;
            color: #16a34a;
        }
        
        .status-rejected {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            padding: 24px;
            transition: all 0.3s ease;
        }
        
        .card:hover {
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        }
        
        .modal {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease;
        }
        
        .modal-header {
            padding: 24px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #64748b;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .modal-close:hover {
            background: #f1f5f9;
            color: #1e293b;
        }
        
        .modal-body {
            padding: 24px;
        }
        
        .modal-footer {
            padding: 24px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #e2e8f0;
            border-top-color: #4361ee;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            .btn {
                padding: 10px 20px;
                font-size: 13px;
            }
            
            .card {
                padding: 20px;
            }
            
            .modal {
                max-width: 100%;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

// Инициализация глобальных стилей
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createGlobalStyles);
} else {
    createGlobalStyles();
}
