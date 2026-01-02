// Система аутентификации SiteCore
class SiteCoreAuth {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        this.loadSession();
    }
    
    // Загрузка сессии
    loadSession() {
        const sessionData = localStorage.getItem('currentSession');
        if (sessionData) {
            try {
                this.currentUser = JSON.parse(sessionData);
                return this.currentUser;
            } catch (e) {
                console.error('Ошибка загрузки сессии:', e);
                this.clearSession();
            }
        }
        return null;
    }
    
    // Регистрация клиента
    async register(clientData) {
        try {
            const newClient = SiteCore.registerClient(clientData);
            
            // Автоматический вход после регистрации
            const sessionUser = SiteCore.login(newClient.email, clientData.password, 'client');
            
            this.currentUser = sessionUser;
            this.saveSession(sessionUser);
            
            return {
                success: true,
                user: sessionUser,
                message: 'Регистрация успешна'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Вход в систему
    async login(email, password, role = 'client') {
        try {
            const user = SiteCore.login(email, password, role);
            
            this.currentUser = user;
            this.saveSession(user);
            
            return {
                success: true,
                user: user,
                message: 'Вход выполнен успешно'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Вход разработчика/админа по паролю
    async loginDeveloper(password) {
        try {
            // Проверяем пароли разработчиков и админа
            const data = SiteCore.loadData();
            const developer = data.developers.find(d => d.password === password);
            
            if (!developer) {
                throw new Error('Неверный пароль');
            }
            
            const user = SiteCore.login(developer.email, password, developer.role);
            
            this.currentUser = user;
            this.saveSession(user);
            
            return {
                success: true,
                user: user,
                message: 'Вход выполнен успешно'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Выход из системы
    logout() {
        SiteCore.logout();
        this.currentUser = null;
        this.clearSession();
        
        return {
            success: true,
            message: 'Выход выполнен успешно'
        };
    }
    
    // Проверка авторизации
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // Проверка роли
    hasRole(role) {
        if (!this.currentUser) return false;
        return this.currentUser.role === role;
    }
    
    isClient() {
        return this.hasRole('client');
    }
    
    isDeveloper() {
        return this.hasRole('developer');
    }
    
    isAdmin() {
        return this.hasRole('admin');
    }
    
    // Получение текущего пользователя
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Сохранение сессии
    saveSession(user) {
        const { password, ...userWithoutPassword } = user;
        localStorage.setItem('currentSession', JSON.stringify(userWithoutPassword));
    }
    
    // Очистка сессии
    clearSession() {
        localStorage.removeItem('currentSession');
        this.currentUser = null;
    }
    
    // Обновление профиля
    async updateProfile(userData) {
        if (!this.currentUser) {
            throw new Error('Пользователь не авторизован');
        }
        
        try {
            const data = SiteCore.loadData();
            let user = null;
            
            if (this.currentUser.role === 'client') {
                user = data.clients.find(c => c.id === this.currentUser.id);
            } else {
                user = data.developers.find(d => d.id === this.currentUser.id);
            }
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            // Обновляем данные
            Object.assign(user, userData, {
                updatedAt: new Date().toISOString()
            });
            
            SiteCore.saveData();
            
            // Обновляем сессию
            const { password, ...updatedUser } = user;
            this.currentUser = updatedUser;
            this.saveSession(updatedUser);
            
            SiteCore.logActivity('profile_updated', `Пользователь ${user.name} обновил профиль`);
            
            return {
                success: true,
                user: updatedUser,
                message: 'Профиль обновлен'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Смена пароля
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            throw new Error('Пользователь не авторизован');
        }
        
        if (newPassword.length < 6) {
            throw new Error('Новый пароль должен содержать не менее 6 символов');
        }
        
        try {
            const data = SiteCore.loadData();
            let user = null;
            
            if (this.currentUser.role === 'client') {
                user = data.clients.find(c => c.id === this.currentUser.id);
            } else {
                user = data.developers.find(d => d.id === this.currentUser.id);
            }
            
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            // Проверяем текущий пароль
            if (user.password !== currentPassword) {
                throw new Error('Неверный текущий пароль');
            }
            
            // Обновляем пароль
            user.password = newPassword;
            user.updatedAt = new Date().toISOString();
            
            SiteCore.saveData();
            
            SiteCore.logActivity('password_changed', `Пользователь ${user.name} сменил пароль`);
            
            return {
                success: true,
                message: 'Пароль успешно изменен'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// Глобальный экземпляр аутентификации
const Auth = new SiteCoreAuth();
