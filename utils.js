// Вспомогательные утилиты SiteCore
class SiteCoreUtils {
    constructor() {
        this.init();
    }
    
    init() {
        // Инициализация
    }
    
    // Форматирование валюты
    formatCurrency(amount) {
        return SiteCore.formatCurrency(amount);
    }
    
    // Форматирование даты
    formatDate(date, format = 'full') {
        if (!date) return '';
        
        const d = new Date(date);
        
        const formats = {
            'date': d.toLocaleDateString('ru-RU'),
            'time': d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            'datetime': d.toLocaleString('ru-RU'),
            'full': d.toLocaleString('ru-RU', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            'relative': this.getRelativeTime(d)
        };
        
        return formats[format] || d.toLocaleString('ru-RU');
    }
    
    // Относительное время
    getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) {
            return 'только что';
        } else if (diffMin < 60) {
            return `${diffMin} ${this.pluralize(diffMin, ['минуту', 'минуты', 'минут'])} назад`;
        } else if (diffHour < 24) {
            return `${diffHour} ${this.pluralize(diffHour, ['час', 'часа', 'часов'])} назад`;
        } else if (diffDay === 1) {
            return 'вчера';
        } else if (diffDay < 7) {
            return `${diffDay} ${this.pluralize(diffDay, ['день', 'дня', 'дней'])} назад`;
        } else {
            return this.formatDate(date, 'date');
        }
    }
    
    // Склонение слов
    pluralize(number, words) {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    }
    
    // Валидация email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Валидация телефона
    validatePhone(phone) {
        const re = /^[\+]?[0-9\s\-\(\)]+$/;
        return re.test(phone);
    }
    
    // Валидация Telegram
    validateTelegram(telegram) {
        return telegram.startsWith('@');
    }
    
    // Генерация цвета на основе строки
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }
    
    // Сокращение текста
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';
        
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // Создание уникального ID
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }
    
    // Копирование в буфер обмена
    copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(resolve)
                    .catch(reject);
            } else {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    resolve();
                } catch (err) {
                    reject(err);
                }
                
                document.body.removeChild(textArea);
            }
        });
    }
    
    // Скачивание файла
    downloadFile(content, fileName, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Чтение файла
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }
    
    // Обработка ошибок
    handleError(error, userMessage = 'Произошла ошибка') {
        console.error('SiteCore Error:', error);
        
        // Логируем ошибку
        SiteCore.logActivity('error', error.message || error.toString());
        
        // Возвращаем понятное сообщение для пользователя
        return {
            success: false,
            message: userMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
    
    // Показать уведомление
    showNotification(message, type = 'info', duration = 3000) {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `sitecore-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        // Добавляем в документ
        document.body.appendChild(notification);
        
        // Закрытие по клику
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Автоматическое закрытие
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
        
        // Добавляем стили анимации
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .sitecore-notification .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .sitecore-notification .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: auto;
                }
            `;
            document.head.appendChild(style);
        }
        
        return notification;
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': '✓',
            'error': '✗',
            'warning': '⚠',
            'info': 'ℹ'
        };
        return icons[type] || 'ℹ';
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || '#3b82f6';
    }
    
    // Загрузка данных
    async loadData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw this.handleError(error, 'Ошибка загрузки данных');
        }
    }
    
    // Сохранение данных
    async saveData(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            throw this.handleError(error, 'Ошибка сохранения данных');
        }
    }
    
    // Проверка онлайн статуса
    isOnline() {
        return navigator.onLine;
    }
    
    // Обработка офлайн режима
    setupOfflineHandler() {
        window.addEventListener('online', () => {
            this.showNotification('Соединение восстановлено', 'success');
            SiteCore.logActivity('connection', 'Восстановлено соединение с интернетом');
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('Потеряно соединение с интернетом', 'warning', 0);
            SiteCore.logActivity('connection', 'Потеряно соединение с интернетом');
        });
    }
}

// Глобальный экземпляр утилит
const Utils = new SiteCoreUtils();
