// Модуль управления данными SiteCore Platform
const DataManager = {
    // Инициализация данных
    initialize() {
        // Инициализируем структуры если они пустые
        if (!localStorage.getItem('sitecore_executors')) {
            this.initializeExecutors();
        }
        
        if (!localStorage.getItem('sitecore_clients')) {
            localStorage.setItem('sitecore_clients', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('sitecore_orders')) {
            localStorage.setItem('sitecore_orders', JSON.stringify([]));
        }
        
        if (!localStorage.getItem('sitecore_messages')) {
            localStorage.setItem('sitecore_messages', JSON.stringify({}));
        }
    },
    
    // Инициализация исполнителей
    initializeExecutors() {
        const executors = [
            {
                id: 1,
                name: "Александр",
                password: "789653",
                role: "executor",
                position: "Team Lead Разработчик",
                avatar: "А",
                online: true,
                currentTasks: 0,
                completedTasks: 0
            },
            {
                id: 2,
                name: "Максим",
                password: "140612",
                role: "executor",
                position: "Frontend Специалист",
                avatar: "М",
                online: true,
                currentTasks: 0,
                completedTasks: 0
            }
        ];
        
        localStorage.setItem('sitecore_executors', JSON.stringify(executors));
    },
    
    // Регистрация клиента
    registerClient(clientData) {
        const clients = this.getClients();
        
        // Проверка на существующего клиента по email
        const existingClient = clients.find(c => c.email === clientData.email);
        if (existingClient) {
            return {
                success: false,
                message: "Клиент с таким email уже зарегистрирован"
            };
        }
        
        // Проверка на существующего клиента по телефону
        const existingPhone = clients.find(c => c.phone === clientData.phone);
        if (existingPhone) {
            return {
                success: false,
                message: "Клиент с таким телефоном уже зарегистрирован"
            };
        }
        
        // Создание нового клиента
        const newClient = {
            id: Date.now(),
            ...clientData,
            role: "client",
            avatar: clientData.name.charAt(0).toUpperCase(),
            registrationDate: new Date().toISOString(),
            status: "active",
            ordersCount: 0,
            totalSpent: 0
        };
        
        clients.push(newClient);
        localStorage.setItem('sitecore_clients', JSON.stringify(clients));
        
        return {
            success: true,
            user: newClient
        };
    },
    
    // Аутентификация клиента
    authenticateClient(email, password) {
        const clients = this.getClients();
        const client = clients.find(c => c.email === email && c.password === password);
        
        if (client) {
            const { password: _, ...clientWithoutPassword } = client;
            return clientWithoutPassword;
        }
        
        return null;
    },
    
    // Аутентификация исполнителя
    authenticateExecutor(name, password) {
        const executors = this.getExecutors();
        const executor = executors.find(e => 
            e.name === name && e.password === password
        );
        
        if (executor) {
            const { password: _, ...executorWithoutPassword } = executor;
            return executorWithoutPassword;
        }
        
        return null;
    },
    
    // Получение всех заказов
    getAllOrders() {
        return JSON.parse(localStorage.getItem('sitecore_orders') || '[]');
    },
    
    // Получение заказов клиента
    getClientOrders(clientId) {
        const orders = this.getAllOrders();
        return orders.filter(order => order.clientId === clientId);
    },
    
    // Получение заказов исполнителя
    getExecutorOrders(executorId) {
        const orders = this.getAllOrders();
        return orders.filter(order => order.executorId === executorId);
    },
    
    // Получение доступных заказов (без исполнителя)
    getAvailableOrders() {
        const orders = this.getAllOrders();
        return orders.filter(order => !order.executorId && order.status === 'new');
    },
    
    // Создание нового заказа
    createOrder(orderData) {
        const orders = this.getAllOrders();
        const clients = this.getClients();
        
        const client = clients.find(c => c.id === orderData.clientId);
        if (!client) {
            return { success: false, message: "Клиент не найден" };
        }
        
        // Валидация промта
        if (orderData.prompt.length < 300) {
            return { success: false, message: "Промт должен содержать минимум 300 символов" };
        }
        
        if (orderData.prompt.length > 2500) {
            return { success: false, message: "Промт должен содержать максимум 2500 символов" };
        }
        
        // Создание заказа
        const newOrder = {
            id: Date.now(),
            ...orderData,
            status: 'new',
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            executorId: null,
            progress: 0,
            messagesCount: 0,
            attachments: orderData.attachments || []
        };
        
        orders.push(newOrder);
        localStorage.setItem('sitecore_orders', JSON.stringify(orders));
        
        // Обновляем статистику клиента
        client.ordersCount = (client.ordersCount || 0) + 1;
        this.updateClient(client);
        
        // Создаем чат для заказа
        this.initOrderChat(newOrder.id);
        
        return {
            success: true,
            order: newOrder
        };
    },
    
    // Назначение заказа исполнителю
    assignOrder(orderId, executorId) {
        const orders = this.getAllOrders();
        const executors = this.getExecutors();
        
        const orderIndex = orders.findIndex(o => o.id === orderId);
        const executor = executors.find(e => e.id === executorId);
        
        if (orderIndex === -1) {
            return { success: false, message: "Заказ не найден" };
        }
        
        if (!executor) {
            return { success: false, message: "Исполнитель не найден" };
        }
        
        // Обновляем заказ
        orders[orderIndex] = {
            ...orders[orderIndex],
            executorId: executorId,
            executorName: executor.name,
            status: 'in_progress',
            assignedDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
        
        localStorage.setItem('sitecore_orders', JSON.stringify(orders));
        
        // Обновляем статистику исполнителя
        executor.currentTasks = (executor.currentTasks || 0) + 1;
        this.updateExecutor(executor);
        
        // Создаем системное сообщение
        this.addSystemMessage(orderId, `Заказ назначен исполнителю ${executor.name}`);
        
        return {
            success: true,
            order: orders[orderIndex]
        };
    },
    
    // Обновление статуса заказа
    updateOrderStatus(orderId, status) {
        const orders = this.getAllOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            return { success: false, message: "Заказ не найден" };
        }
        
        const oldStatus = orders[orderIndex].status;
        orders[orderIndex] = {
            ...orders[orderIndex],
            status: status,
            updatedDate: new Date().toISOString()
        };
        
        // Если заказ завершен, обновляем статистику исполнителя
        if (status === 'completed' && oldStatus !== 'completed') {
            const executors = this.getExecutors();
            const executor = executors.find(e => e.id === orders[orderIndex].executorId);
            
            if (executor) {
                executor.currentTasks = Math.max(0, (executor.currentTasks || 0) - 1);
                executor.completedTasks = (executor.completedTasks || 0) + 1;
                this.updateExecutor(executor);
            }
            
            // Добавляем дату завершения
            orders[orderIndex].completedDate = new Date().toISOString();
        }
        
        localStorage.setItem('sitecore_orders', JSON.stringify(orders));
        
        // Создаем системное сообщение
        const statusText = this.getStatusText(status);
        this.addSystemMessage(orderId, `Статус изменен на: ${statusText}`);
        
        return {
            success: true,
            order: orders[orderIndex]
        };
    },
    
    // Добавление сообщения в чат заказа
    addMessage(orderId, messageData) {
        const messages = this.getOrderMessages(orderId);
        
        const newMessage = {
            id: Date.now(),
            ...messageData,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        messages.push(newMessage);
        this.saveOrderMessages(orderId, messages);
        
        // Обновляем счетчик сообщений в заказе
        const orders = this.getAllOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].messagesCount = (orders[orderIndex].messagesCount || 0) + 1;
            orders[orderIndex].updatedDate = new Date().toISOString();
            localStorage.setItem('sitecore_orders', JSON.stringify(orders));
        }
        
        return newMessage;
    },
    
    // Добавление системного сообщения
    addSystemMessage(orderId, text) {
        return this.addMessage(orderId, {
            senderId: 'system',
            senderName: 'Система',
            senderRole: 'system',
            text: text,
            type: 'system'
        });
    },
    
    // Инициализация чата для заказа
    initOrderChat(orderId) {
        const messages = this.getOrderMessages(orderId);
        
        // Добавляем приветственное сообщение
        this.addSystemMessage(orderId, 'Заказ создан. Ожидайте назначения исполнителя.');
        
        return messages;
    },
    
    // Получение сообщений заказа
    getOrderMessages(orderId) {
        const allMessages = JSON.parse(localStorage.getItem('sitecore_messages') || '{}');
        return allMessages[orderId] || [];
    },
    
    // Сохранение сообщений заказа
    saveOrderMessages(orderId, messages) {
        const allMessages = JSON.parse(localStorage.getItem('sitecore_messages') || '{}');
        allMessages[orderId] = messages;
        localStorage.setItem('sitecore_messages', JSON.stringify(allMessages));
    },
    
    // Получение всех исполнителей
    getExecutors() {
        return JSON.parse(localStorage.getItem('sitecore_executors') || '[]');
    },
    
    // Получение всех клиентов
    getClients() {
        return JSON.parse(localStorage.getItem('sitecore_clients') || '[]');
    },
    
    // Обновление данных клиента
    updateClient(client) {
        const clients = this.getClients();
        const clientIndex = clients.findIndex(c => c.id === client.id);
        
        if (clientIndex !== -1) {
            clients[clientIndex] = client;
            localStorage.setItem('sitecore_clients', JSON.stringify(clients));
        }
    },
    
    // Обновление данных исполнителя
    updateExecutor(executor) {
        const executors = this.getExecutors();
        const executorIndex = executors.findIndex(e => e.id === executor.id);
        
        if (executorIndex !== -1) {
            executors[executorIndex] = executor;
            localStorage.setItem('sitecore_executors', JSON.stringify(executors));
        }
    },
    
    // Получение статистики
    getStatistics() {
        const orders = this.getAllOrders();
        const clients = this.getClients();
        const executors = this.getExecutors();
        
        const totalOrders = orders.length;
        const newOrders = orders.filter(o => o.status === 'new').length;
        const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        
        const totalRevenue = orders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        
        return {
            totalOrders,
            newOrders,
            inProgressOrders,
            completedOrders,
            totalClients: clients.length,
            totalExecutors: executors.length,
            totalRevenue
        };
    },
    
    // Получение текста статуса
    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен',
            'paid': 'Оплачен'
        };
        return statuses[status] || status;
    },
    
    // Форматирование валюты
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    // Расчет дедлайна
    calculateDeadline(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    },
    
    // Проверка промта
    validatePrompt(prompt) {
        if (!prompt || prompt.trim().length === 0) {
            return { valid: false, message: "Промт не может быть пустым" };
        }
        
        if (prompt.length < 300) {
            return { valid: false, message: "Промт должен содержать минимум 300 символов" };
        }
        
        if (prompt.length > 2500) {
            return { valid: false, message: "Промт должен содержать максимум 2500 символов" };
        }
        
        return { valid: true, message: "Промт валиден" };
    }
};

// Глобальные функции
window.DataManager = DataManager;
window.initializeData = () => DataManager.initialize();
