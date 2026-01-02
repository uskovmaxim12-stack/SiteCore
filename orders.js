// Система управления заказами SiteCore
class SiteCoreOrders {
    constructor() {
        this.init();
    }
    
    init() {
        // Инициализация системы
    }
    
    // Создание заказа
    async createOrder(orderData) {
        try {
            if (!Auth.isClient()) {
                throw new Error('Только клиенты могут создавать заказы');
            }
            
            // Добавляем clientId из текущего пользователя
            const orderWithClient = {
                ...orderData,
                clientId: Auth.currentUser.id
            };
            
            const order = SiteCore.createOrder(orderWithClient);
            
            return {
                success: true,
                order: order,
                message: 'Заказ успешно создан'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Получение заказов пользователя
    getOrders() {
        if (!Auth.isAuthenticated()) {
            return [];
        }
        
        let orders = [];
        
        if (Auth.isClient()) {
            orders = SiteCore.getOrdersByClient(Auth.currentUser.id);
        } else if (Auth.isDeveloper()) {
            orders = SiteCore.getOrdersByDeveloper(Auth.currentUser.id);
        } else if (Auth.isAdmin()) {
            orders = SiteCore.data.orders;
        }
        
        return orders.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    }
    
    // Получение доступных заказов (для разработчиков)
    getAvailableOrders() {
        if (!Auth.isDeveloper() && !Auth.isAdmin()) {
            return [];
        }
        
        return SiteCore.getAvailableOrders();
    }
    
    // Получение заказа по ID
    getOrderById(orderId) {
        const order = SiteCore.getOrderById(orderId);
        
        if (!order) {
            return null;
        }
        
        // Проверяем доступ к заказу
        if (Auth.isClient() && order.clientId !== Auth.currentUser.id) {
            return null;
        }
        
        if (Auth.isDeveloper() && order.assignedTo !== Auth.currentUser.id && !Auth.isAdmin()) {
            return null;
        }
        
        return order;
    }
    
    // Назначение заказа разработчику
    async assignOrder(orderId, developerId = null) {
        try {
            if (!Auth.isDeveloper() && !Auth.isAdmin()) {
                throw new Error('Только разработчики и администраторы могут назначать заказы');
            }
            
            const assignDeveloperId = developerId || (Auth.isDeveloper() ? Auth.currentUser.id : null);
            
            if (!assignDeveloperId) {
                throw new Error('Не указан разработчик');
            }
            
            const order = SiteCore.assignOrder(orderId, assignDeveloperId);
            
            return {
                success: true,
                order: order,
                message: 'Заказ успешно назначен'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Обновление статуса заказа
    async updateOrderStatus(orderId, status, progress = null) {
        try {
            const order = this.getOrderById(orderId);
            
            if (!order) {
                throw new Error('Заказ не найден или нет доступа');
            }
            
            // Проверяем права на изменение статуса
            if (Auth.isClient() && status !== 'cancelled') {
                throw new Error('Клиенты могут только отменять заказы');
            }
            
            if (Auth.isDeveloper() && order.assignedTo !== Auth.currentUser.id) {
                throw new Error('Вы не являетесь исполнителем этого заказа');
            }
            
            const updatedOrder = SiteCore.updateOrderStatus(orderId, status, progress);
            
            return {
                success: true,
                order: updatedOrder,
                message: 'Статус заказа обновлен'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Получение статистики заказов
    getOrderStatistics() {
        if (!Auth.isAuthenticated()) {
            return null;
        }
        
        let orders = [];
        
        if (Auth.isClient()) {
            orders = SiteCore.getOrdersByClient(Auth.currentUser.id);
        } else if (Auth.isDeveloper()) {
            orders = SiteCore.getOrdersByDeveloper(Auth.currentUser.id);
        } else if (Auth.isAdmin()) {
            orders = SiteCore.data.orders;
        }
        
        const stats = {
            total: orders.length,
            new: orders.filter(o => o.status === 'new').length,
            inProgress: orders.filter(o => o.status === 'in_progress').length,
            review: orders.filter(o => o.status === 'review').length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            totalRevenue: orders
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.budget, 0),
            averageBudget: orders.length > 0 ? 
                orders.reduce((sum, o) => sum + o.budget, 0) / orders.length : 0
        };
        
        return stats;
    }
    
    // Получение сообщений заказа
    getOrderMessages(orderId) {
        const order = this.getOrderById(orderId);
        
        if (!order) {
            return [];
        }
        
        return SiteCore.getMessagesByOrder(orderId);
    }
    
    // Отправка сообщения в чат заказа
    async sendMessage(orderId, text, attachments = []) {
        try {
            const order = this.getOrderById(orderId);
            
            if (!order) {
                throw new Error('Заказ не найден или нет доступа');
            }
            
            // Проверяем, что заказ не завершен
            if (order.status === 'completed' || order.status === 'cancelled') {
                throw new Error('Нельзя отправлять сообщения в завершенный заказ');
            }
            
            const message = SiteCore.addMessage(
                orderId,
                Auth.currentUser.id,
                Auth.currentUser.name,
                text,
                Auth.currentUser.role
            );
            
            // Добавляем вложения если есть
            if (attachments.length > 0) {
                message.attachments = attachments;
            }
            
            return {
                success: true,
                message: message,
                order: order
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Получение уведомлений пользователя
    getNotifications() {
        if (!Auth.isAuthenticated()) {
            return [];
        }
        
        return SiteCore.getNotificationsByUser(Auth.currentUser.id);
    }
    
    // Отметка уведомлений как прочитанных
    async markNotificationsAsRead(notificationIds = []) {
        try {
            const data = SiteCore.loadData();
            
            if (notificationIds.length === 0) {
                // Помечаем все уведомления пользователя как прочитанные
                data.notifications.forEach(notification => {
                    if (notification.userId === Auth.currentUser.id && !notification.read) {
                        notification.read = true;
                    }
                });
            } else {
                // Помечаем указанные уведомления
                notificationIds.forEach(id => {
                    const notification = data.notifications.find(n => n.id === id);
                    if (notification && notification.userId === Auth.currentUser.id) {
                        notification.read = true;
                    }
                });
            }
            
            SiteCore.saveData();
            
            return {
                success: true,
                message: 'Уведомления отмечены как прочитанные'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Получение разработчиков
    getDevelopers() {
        if (!Auth.isAuthenticated()) {
            return [];
        }
        
        return SiteCore.data.developers.filter(d => d.role === 'developer');
    }
    
    // Получение клиентов (только для админа)
    getClients() {
        if (!Auth.isAdmin()) {
            return [];
        }
        
        return SiteCore.data.clients;
    }
    
    // Форматирование данных для отображения
    formatOrderForDisplay(order) {
        if (!order) return null;
        
        const formatted = {
            ...order,
            formattedBudget: SiteCore.formatCurrency(order.budget),
            formattedStatus: SiteCore.getStatusText(order.status),
            formattedType: SiteCore.getTypeText(order.projectType),
            formattedCreatedDate: new Date(order.createdDate).toLocaleDateString('ru-RU'),
            formattedUpdatedDate: new Date(order.updatedDate).toLocaleDateString('ru-RU'),
            isAssigned: !!order.assignedTo,
            isCompleted: order.status === 'completed',
            isCancelled: order.status === 'cancelled'
        };
        
        // Добавляем информацию о разработчике если есть
        if (order.assignedTo) {
            const developer = SiteCore.getDeveloperById(order.assignedTo);
            if (developer) {
                formatted.developer = {
                    name: developer.name,
                    avatar: developer.avatar,
                    specialization: developer.specialization
                };
            }
        }
        
        // Добавляем информацию о клиенте если есть права
        if (Auth.isDeveloper() || Auth.isAdmin()) {
            const client = SiteCore.getClientById(order.clientId);
            if (client) {
                formatted.client = {
                    name: client.name,
                    email: client.email,
                    phone: client.phone,
                    telegram: client.telegram,
                    avatar: client.avatar
                };
            }
        }
        
        return formatted;
    }
    
    // Экспорт заказов (только для админа)
    exportOrders(format = 'json') {
        if (!Auth.isAdmin()) {
            return null;
        }
        
        const orders = SiteCore.data.orders;
        
        switch(format) {
            case 'json':
                return JSON.stringify(orders, null, 2);
            case 'csv':
                return this.convertToCSV(orders);
            default:
                return JSON.stringify(orders, null, 2);
        }
    }
    
    convertToCSV(orders) {
        const headers = ['ID', 'Проект', 'Клиент', 'Бюджет', 'Статус', 'Тип', 'Создан', 'Завершен'];
        const rows = orders.map(order => [
            order.id,
            order.projectName,
            order.clientName,
            order.budget,
            SiteCore.getStatusText(order.status),
            SiteCore.getTypeText(order.projectType),
            new Date(order.createdDate).toLocaleDateString('ru-RU'),
            order.completedDate ? new Date(order.completedDate).toLocaleDateString('ru-RU') : ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }
}

// Глобальный экземпляр системы заказов
const Orders = new SiteCoreOrders();
