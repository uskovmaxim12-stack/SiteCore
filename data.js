// Модуль управления данными
const DataManager = {
    // Инициализация данных
    initialize() {
        if (!localStorage.getItem('sitecore_users')) {
            this.initializeDefaultData();
        }
        
        // Обновляем структуру данных если нужно
        this.updateDataStructure();
    },
    
    // Инициализация начальных данных
    initializeDefaultData() {
        // Исполнители по умолчанию
        const defaultExecutors = [
            {
                id: 1,
                name: "Александр",
                email: "a99664425@gmail.com",
                password: "789653",
                role: "executor",
                position: "Старший разработчик",
                avatar: "А",
                experience: "5 лет",
                skills: ["HTML/CSS", "JavaScript", "React", "Node.js"],
                rating: 4.8,
                completedProjects: 47,
                phone: "+7 (922) 231-80-58",
                telegram: "@tylerderden2",
                bio: "Специализируюсь на работе с клиентами.",
                status: "online"
            },
            {
                id: 2,
                name: "Максим",
                email: "mikhail.potapych.01@internet.ru",
                password: "140612",
                role: "executor",
                position: "Frontend специалист",
                avatar: "М",
                bio: "Специализируюсь на создании сайтов.",
                status: "online"
            }
        ];
        
        // Пустые массивы для клиентов, заказов и сообщений
        const defaultData = {
            users: defaultExecutors,
            clients: [],
            orders: [],
            messages: {}
        };
        
        localStorage.setItem('sitecore_users', JSON.stringify(defaultData.users));
        localStorage.setItem('sitecore_clients', JSON.stringify(defaultData.clients));
        localStorage.setItem('sitecore_orders', JSON.stringify(defaultData.orders));
        localStorage.setItem('sitecore_messages', JSON.stringify(defaultData.messages));
    },
    
    // Обновление структуры данных
    updateDataStructure() {
        // Если устаревшая структура, обновляем
        if (localStorage.getItem('sitecore_data')) {
            const oldData = JSON.parse(localStorage.getItem('sitecore_data'));
            
            // Миграция на новую структуру
            const users = oldData.users || [];
            const clients = oldData.clients || [];
            const orders = oldData.orders || [];
            const messages = oldData.messages || {};
            
            localStorage.setItem('sitecore_users', JSON.stringify(users));
            localStorage.setItem('sitecore_clients', JSON.stringify(clients));
            localStorage.setItem('sitecore_orders', JSON.stringify(orders));
            localStorage.setItem('sitecore_messages', JSON.stringify(messages));
            
            localStorage.removeItem('sitecore_data');
        }
    },
    
    // Регистрация клиента
    registerClient(name, email, phone, telegram, password) {
        const clients = this.getClients();
        const users = this.getUsers();
        
        // Проверка уникальности email
        const emailExists = [...clients, ...users].some(user => user.email === email);
        if (emailExists) {
            return { success: false, message: "Email уже зарегистрирован" };
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
            registrationDate: new Date().toISOString().split('T')[0],
            status: "active"
        };
        
        clients.push(newClient);
        localStorage.setItem('sitecore_clients', JSON.stringify(clients));
        
        return { success: true, user: newClient };
    },
    
    // Аутентификация пользователя
    authenticate(email, password, role) {
        let users = [];
        
        if (role === 'client') {
            users = this.getClients();
        } else {
            users = this.getUsers();
        }
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            // Создаем сессионную копию без пароля
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        
        return null;
    },
    
    // Получение данных
    getUsers() {
        return JSON.parse(localStorage.getItem('sitecore_users') || '[]');
    },
    
    getClients() {
        return JSON.parse(localStorage.getItem('sitecore_clients') || '[]');
    },
    
    getOrders() {
        return JSON.parse(localStorage.getItem('sitecore_orders') || '[]');
    },
    
    getMessages() {
        return JSON.parse(localStorage.getItem('sitecore_messages') || '{}');
    },
    
    // Сохранение данных
    saveOrders(orders) {
        localStorage.setItem('sitecore_orders', JSON.stringify(orders));
    },
    
    saveMessages(messages) {
        localStorage.setItem('sitecore_messages', JSON.stringify(messages));
    },
    
    saveClients(clients) {
        localStorage.setItem('sitecore_clients', JSON.stringify(clients));
    },
    
    // Создание нового заказа
    createOrder(orderData) {
        const orders = this.getOrders();
        const newOrder = {
            id: Date.now(),
            ...orderData,
            createdDate: new Date().toISOString(),
            status: 'new',
            assignedTo: null,
            messages: []
        };
        
        orders.push(newOrder);
        this.saveOrders(orders);
        
        // Инициализируем чат для этого заказа
        const messages = this.getMessages();
        messages[newOrder.id] = [];
        this.saveMessages(messages);
        
        return newOrder;
    },
    
    // Обновление заказа
    updateOrder(orderId, updates) {
        const orders = this.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex] = { ...orders[orderIndex], ...updates };
            this.saveOrders(orders);
            return orders[orderIndex];
        }
        
        return null;
    },
    
    // Добавление сообщения
    addMessage(orderId, message) {
        const messages = this.getMessages();
        
        if (!messages[orderId]) {
            messages[orderId] = [];
        }
        
        const newMessage = {
            id: Date.now(),
            ...message,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        messages[orderId].push(newMessage);
        this.saveMessages(messages);
        
        return newMessage;
    },
    
    // Получение заказов по пользователю
    getUserOrders(userId, role) {
        const orders = this.getOrders();
        
        if (role === 'client') {
            return orders.filter(order => order.clientId === userId);
        } else {
            return orders;
        }
    },
    
    // Назначение заказа исполнителю
    assignOrder(orderId, executorId) {
        return this.updateOrder(orderId, {
            assignedTo: executorId,
            status: 'in_progress',
            assignedDate: new Date().toISOString()
        });
    },
    
    // Обновление статуса заказа
    updateOrderStatus(orderId, status) {
        return this.updateOrder(orderId, { status });
    },
    
    // Получение статистики
    getStatistics() {
        const orders = this.getOrders();
        const clients = this.getClients();
        const executors = this.getUsers();
        
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const activeOrders = orders.filter(o => o.status === 'in_progress').length;
        const totalRevenue = orders
            .filter(o => o.status === 'completed' || o.status === 'paid')
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        return {
            totalOrders,
            completedOrders,
            activeOrders,
            totalClients: clients.length,
            totalExecutors: executors.length,
            totalRevenue
        };
    }
};

// Глобальные функции для использования в HTML
function initializeData() {
    DataManager.initialize();
}

function registerClient(name, email, phone, telegram, password) {
    return DataManager.registerClient(name, email, phone, telegram, password);
}

function authenticateUser(email, password, role) {
    return DataManager.authenticate(email, password, role);
}