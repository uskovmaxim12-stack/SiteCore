// Ядро системы SiteCore
class SiteCoreSystem {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }
    
    // Инициализация системы
    init() {
        if (!localStorage.getItem('sitecore_system')) {
            this.initializeDefaultData();
        }
        this.loadData();
        this.isInitialized = true;
        console.log('SiteCore System initialized');
    }
    
    // Инициализация начальных данных
    initializeDefaultData() {
        const defaultData = {
            version: '1.0.0',
            settings: {
                minPromptLength: 300,
                maxPromptLength: 2500,
                minBudget: 10000,
                maxDeadline: 365,
                currency: 'RUB'
            },
            developers: [
                {
                    id: 1,
                    name: "Александр",
                    password: "789653",
                    role: "developer",
                    specialization: "Старший разработчик",
                    avatar: "А",
                    status: "online",
                    email: "alex@sitecore.local",
                    phone: "+7 (999) 111-11-11",
                    telegram: "@alex_dev",
                    experience: "5 лет",
                    skills: ["HTML/CSS", "JavaScript", "React", "Node.js"],
                    rating: 4.8,
                    completedProjects: 0,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: "Максим",
                    password: "140612",
                    role: "developer",
                    specialization: "Frontend разработчик",
                    avatar: "М",
                    status: "online",
                    email: "max@sitecore.local",
                    phone: "+7 (999) 222-22-22",
                    telegram: "@max_frontend",
                    experience: "3 года",
                    skills: ["Vue.js", "TypeScript", "UI/UX", "Animations"],
                    rating: 4.6,
                    completedProjects: 0,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 3,
                    name: "Администратор",
                    password: "admin123",
                    role: "admin",
                    specialization: "Администратор системы",
                    avatar: "A",
                    status: "online",
                    email: "admin@sitecore.local",
                    phone: "+7 (999) 333-33-33",
                    telegram: "@sitecore_admin",
                    createdAt: new Date().toISOString()
                }
            ],
            clients: [],
            orders: [],
            messages: {},
            notifications: [],
            activityLog: []
        };
        
        localStorage.setItem('sitecore_system', JSON.stringify(defaultData));
        this.logActivity('system', 'Система инициализирована');
    }
    
    // Загрузка данных
    loadData() {
        const data = JSON.parse(localStorage.getItem('sitecore_system'));
        this.data = data;
        return data;
    }
    
    // Сохранение данных
    saveData() {
        localStorage.setItem('sitecore_system', JSON.stringify(this.data));
    }
    
    // Регистрация клиента
    registerClient(clientData) {
        const { name, email, phone, telegram, password } = clientData;
        
        // Валидация
        if (!name || !email || !phone || !telegram || !password) {
            throw new Error('Все поля обязательны для заполнения');
        }
        
        if (password.length < 6) {
            throw new Error('Пароль должен содержать не менее 6 символов');
        }
        
        if (!telegram.startsWith('@')) {
            throw new Error('Telegram должен начинаться с @');
        }
        
        // Проверка уникальности email
        const emailExists = this.data.clients.some(client => client.email === email);
        if (emailExists) {
            throw new Error('Пользователь с таким email уже зарегистрирован');
        }
        
        // Создание нового клиента
        const newClient = {
            id: Date.now(),
            name,
            email,
            phone,
            telegram,
            password,
            role: "client",
            avatar: name.charAt(0).toUpperCase(),
            registrationDate: new Date().toISOString(),
            status: "active",
            orders: [],
            notifications: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.data.clients.push(newClient);
        this.saveData();
        
        this.logActivity('client_registered', `Зарегистрирован новый клиент: ${name}`);
        
        return newClient;
    }
    
    // Авторизация
    login(email, password, role = 'client') {
        let user = null;
        
        if (role === 'client') {
            user = this.data.clients.find(c => c.email === email && c.password === password);
        } else if (role === 'developer' || role === 'admin') {
            user = this.data.developers.find(d => d.password === password);
        }
        
        if (!user) {
            throw new Error('Неверные учетные данные');
        }
        
        // Обновляем статус
        user.status = 'online';
        user.lastLogin = new Date().toISOString();
        this.saveData();
        
        this.currentUser = user;
        
        // Создаем сессию без пароля
        const { password: _, ...userWithoutPassword } = user;
        localStorage.setItem('currentSession', JSON.stringify(userWithoutPassword));
        
        this.logActivity('login', `Пользователь ${user.name} вошел в систему`);
        
        return userWithoutPassword;
    }
    
    // Выход из системы
    logout() {
        if (this.currentUser) {
            const user = this.getUserById(this.currentUser.id);
            if (user) {
                user.status = 'offline';
                this.saveData();
            }
            
            this.logActivity('logout', `Пользователь ${this.currentUser.name} вышел из системы`);
            this.currentUser = null;
        }
        
        localStorage.removeItem('currentSession');
    }
    
    // Создание заказа
    createOrder(orderData) {
        const { clientId, projectName, projectType, budget, deadline, prompt } = orderData;
        
        // Валидация
        if (!projectName || !projectType || !budget || !deadline || !prompt) {
            throw new Error('Все поля обязательны для заполнения');
        }
        
        if (budget < this.data.settings.minBudget) {
            throw new Error(`Бюджет должен быть не менее ${this.formatCurrency(this.data.settings.minBudget)}`);
        }
        
        if (deadline > this.data.settings.maxDeadline) {
            throw new Error(`Срок не может превышать ${this.data.settings.maxDeadline} дней`);
        }
        
        if (prompt.length < this.data.settings.minPromptLength) {
            throw new Error(`Промт должен содержать не менее ${this.data.settings.minPromptLength} символов`);
        }
        
        if (prompt.length > this.data.settings.maxPromptLength) {
            throw new Error(`Промт должен содержать не более ${this.data.settings.maxPromptLength} символов`);
        }
        
        const client = this.getClientById(clientId);
        if (!client) {
            throw new Error('Клиент не найден');
        }
        
        // Создание нового заказа
        const newOrder = {
            id: Date.now(),
            clientId,
            clientName: client.name,
            clientEmail: client.email,
            clientPhone: client.phone,
            clientTelegram: client.telegram,
            projectName,
            projectType,
            budget: parseInt(budget),
            deadline: parseInt(deadline),
            prompt,
            status: 'new',
            assignedTo: null,
            assignedDate: null,
            completedDate: null,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            messages: [],
            attachments: [],
            progress: 0,
            paymentStatus: 'not_paid'
        };
        
        this.data.orders.push(newOrder);
        
        // Инициализируем чат для заказа
        this.data.messages[newOrder.id] = [];
        
        // Обновляем клиента
        client.orders.push(newOrder.id);
        client.updatedAt = new Date().toISOString();
        
        this.saveData();
        
        // Создаем уведомления для разработчиков
        this.createNotificationForDevelopers('new_order', {
            orderId: newOrder.id,
            projectName: newOrder.projectName,
            clientName: newOrder.clientName,
            budget: newOrder.budget
        });
        
        this.logActivity('order_created', `Создан новый заказ: ${projectName}`);
        
        return newOrder;
    }
    
    // Назначение заказа разработчику
    assignOrder(orderId, developerId) {
        const order = this.getOrderById(orderId);
        const developer = this.getDeveloperById(developerId);
        
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        if (!developer) {
            throw new Error('Разработчик не найден');
        }
        
        if (order.status !== 'new') {
            throw new Error('Заказ уже взят в работу');
        }
        
        // Обновляем заказ
        order.assignedTo = developerId;
        order.assignedDate = new Date().toISOString();
        order.status = 'in_progress';
        order.updatedDate = new Date().toISOString();
        
        // Обновляем разработчика
        if (!developer.assignedOrders) developer.assignedOrders = [];
        developer.assignedOrders.push(orderId);
        developer.updatedAt = new Date().toISOString();
        
        // Создаем уведомление для клиента
        this.createNotificationForClient(order.clientId, 'order_assigned', {
            orderId: order.id,
            projectName: order.projectName,
            developerName: developer.name
        });
        
        // Отправляем системное сообщение
        this.addSystemMessage(orderId, `Заказ назначен разработчику ${developer.name}`);
        
        this.saveData();
        
        this.logActivity('order_assigned', `Заказ ${order.projectName} назначен разработчику ${developer.name}`);
        
        return order;
    }
    
    // Обновление статуса заказа
    updateOrderStatus(orderId, status, progress = null) {
        const order = this.getOrderById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        const validStatuses = ['new', 'in_progress', 'review', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Недопустимый статус');
        }
        
        const oldStatus = order.status;
        order.status = status;
        order.updatedDate = new Date().toISOString();
        
        if (progress !== null) {
            order.progress = Math.min(100, Math.max(0, progress));
        }
        
        if (status === 'completed') {
            order.completedDate = new Date().toISOString();
            
            // Обновляем статистику разработчика
            if (order.assignedTo) {
                const developer = this.getDeveloperById(order.assignedTo);
                if (developer) {
                    developer.completedProjects = (developer.completedProjects || 0) + 1;
                    developer.updatedAt = new Date().toISOString();
                }
            }
        }
        
        // Создаем уведомление для клиента
        if (oldStatus !== status) {
            this.createNotificationForClient(order.clientId, 'status_updated', {
                orderId: order.id,
                projectName: order.projectName,
                oldStatus: this.getStatusText(oldStatus),
                newStatus: this.getStatusText(status)
            });
        }
        
        this.saveData();
        
        this.logActivity('status_updated', `Статус заказа ${order.projectName} изменен: ${oldStatus} → ${status}`);
        
        return order;
    }
    
    // Добавление сообщения в чат
    addMessage(orderId, senderId, senderName, text, senderRole) {
        const order = this.getOrderById(orderId);
        if (!order) {
            throw new Error('Заказ не найден');
        }
        
        if (!this.data.messages[orderId]) {
            this.data.messages[orderId] = [];
        }
        
        const newMessage = {
            id: Date.now(),
            orderId,
            senderId,
            senderName,
            senderRole,
            text,
            timestamp: new Date().toISOString(),
            read: false,
            attachments: []
        };
        
        this.data.messages[orderId].push(newMessage);
        this.saveData();
        
        // Создаем уведомление для получателя
        const receiverId = senderRole === 'client' ? order.assignedTo : order.clientId;
        if (receiverId) {
            this.createNotification(receiverId, 'new_message', {
                orderId: order.id,
                projectName: order.projectName,
                senderName: senderName,
                message: text.substring(0, 50) + (text.length > 50 ? '...' : '')
            });
        }
        
        return newMessage;
    }
    
    // Добавление системного сообщения
    addSystemMessage(orderId, text) {
        return this.addMessage(orderId, 0, 'Система', text, 'system');
    }
    
    // Создание уведомления
    createNotification(userId, type, data) {
        const notification = {
            id: Date.now(),
            userId,
            type,
            data,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        this.data.notifications.push(notification);
        this.saveData();
        
        return notification;
    }
    
    // Создание уведомления для клиента
    createNotificationForClient(clientId, type, data) {
        return this.createNotification(clientId, type, data);
    }
    
    // Создание уведомления для всех разработчиков
    createNotificationForDevelopers(type, data) {
        this.data.developers.forEach(developer => {
            if (developer.role === 'developer') {
                this.createNotification(developer.id, type, data);
            }
        });
    }
    
    // Логирование активности
    logActivity(action, description, userId = null) {
        const activity = {
            id: Date.now(),
            action,
            description,
            userId: userId || (this.currentUser ? this.currentUser.id : null),
            userName: this.currentUser ? this.currentUser.name : 'Система',
            timestamp: new Date().toISOString(),
            ip: 'localhost',
            userAgent: navigator.userAgent
        };
        
        this.data.activityLog.push(activity);
        
        // Сохраняем только последние 1000 записей
        if (this.data.activityLog.length > 1000) {
            this.data.activityLog = this.data.activityLog.slice(-1000);
        }
        
        this.saveData();
        
        return activity;
    }
    
    // Получение данных
    getClientById(id) {
        return this.data.clients.find(c => c.id === id);
    }
    
    getDeveloperById(id) {
        return this.data.developers.find(d => d.id === id);
    }
    
    getUserById(id) {
        return this.getClientById(id) || this.getDeveloperById(id);
    }
    
    getOrderById(id) {
        return this.data.orders.find(o => o.id === id);
    }
    
    getOrdersByClient(clientId) {
        return this.data.orders.filter(o => o.clientId === clientId);
    }
    
    getOrdersByDeveloper(developerId) {
        return this.data.orders.filter(o => o.assignedTo === developerId);
    }
    
    getAvailableOrders() {
        return this.data.orders.filter(o => o.status === 'new' && !o.assignedTo);
    }
    
    getMessagesByOrder(orderId) {
        return this.data.messages[orderId] || [];
    }
    
    getNotificationsByUser(userId) {
        return this.data.notifications.filter(n => n.userId === userId && !n.read);
    }
    
    getStatistics() {
        const stats = {
            totalClients: this.data.clients.length,
            totalDevelopers: this.data.developers.filter(d => d.role === 'developer').length,
            totalOrders: this.data.orders.length,
            newOrders: this.data.orders.filter(o => o.status === 'new').length,
            inProgressOrders: this.data.orders.filter(o => o.status === 'in_progress').length,
            completedOrders: this.data.orders.filter(o => o.status === 'completed').length,
            totalRevenue: this.data.orders
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.budget, 0),
            averageBudget: this.data.orders.length > 0 ? 
                this.data.orders.reduce((sum, o) => sum + o.budget, 0) / this.data.orders.length : 0,
            averageCompletionTime: this.calculateAverageCompletionTime()
        };
        
        return stats;
    }
    
    // Вспомогательные методы
    calculateAverageCompletionTime() {
        const completedOrders = this.data.orders.filter(o => o.status === 'completed' && o.createdDate && o.completedDate);
        
        if (completedOrders.length === 0) return 0;
        
        const totalDays = completedOrders.reduce((sum, order) => {
            const start = new Date(order.createdDate);
            const end = new Date(order.completedDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);
        
        return Math.round(totalDays / completedOrders.length);
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: this.data.settings.currency || 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    }
    
    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершён',
            'cancelled': 'Отменён'
        };
        return statuses[status] || status;
    }
    
    getTypeText(type) {
        const types = {
            'static': 'Статический сайт',
            'dynamic': 'Динамический сайт',
            'landing': 'Landing Page',
            'ecommerce': 'Интернет-магазин',
            'other': 'Другое'
        };
        return types[type] || type;
    }
    
    // Очистка устаревших данных
    cleanupOldData(days = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // Очищаем старые уведомления
        this.data.notifications = this.data.notifications.filter(n => 
            new Date(n.createdAt) > cutoffDate
        );
        
        // Очищаем старые логи активности
        this.data.activityLog = this.data.activityLog.filter(a => 
            new Date(a.timestamp) > cutoffDate
        );
        
        this.saveData();
        
        this.logActivity('cleanup', `Очищены данные старше ${days} дней`);
    }
}

// Создаем глобальный экземпляр системы
const SiteCore = new SiteCoreSystem();
