/**
 * Sistema de notificações user-friendly
 */

export enum NotificationType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

class NotificationManager {
  private container: HTMLElement | null = null;
  private notifications: Map<string, HTMLElement> = new Map();

  private createContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  private createNotification(
    message: string, 
    type: NotificationType, 
    options: NotificationOptions = {}
  ): HTMLElement {
    const notification = document.createElement('div');
    const id = Date.now().toString();
    
    const colors = {
      success: { bg: '#10b981', border: '#059669', icon: '✅' },
      info: { bg: '#3b82f6', border: '#2563eb', icon: 'ℹ️' },
      warning: { bg: '#f59e0b', border: '#d97706', icon: '⚠️' },
      error: { bg: '#ef4444', border: '#dc2626', icon: '❌' }
    };

    const color = colors[type];
    
    notification.style.cssText = `
      background: ${color.bg};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid ${color.border};
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: all 0.3s ease;
      pointer-events: auto;
      min-width: 300px;
      max-width: 400px;
      word-wrap: break-word;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    notification.innerHTML = `
      <span style="flex-shrink: 0;">${color.icon}</span>
      <span style="flex: 1;">${message}</span>
      <button style="
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
      " onclick="this.parentElement.remove();">×</button>
    `;

    notification.dataset.id = id;
    this.notifications.set(id, notification);

    // Animação de entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remove se não for persistente
    if (!options.persistent) {
      const duration = options.duration || (type === 'error' ? 5000 : 3000);
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }

    return notification;
  }

  private removeNotification(id: string) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
        this.notifications.delete(id);
      }, 300);
    }
  }

  show(message: string, type: NotificationType = NotificationType.INFO, options: NotificationOptions = {}) {
    this.createContainer();
    const notification = this.createNotification(message, type, options);
    this.container!.appendChild(notification);
  }

  success(message: string, options: NotificationOptions = {}) {
    this.show(message, NotificationType.SUCCESS, options);
  }

  info(message: string, options: NotificationOptions = {}) {
    this.show(message, NotificationType.INFO, options);
  }

  warning(message: string, options: NotificationOptions = {}) {
    this.show(message, NotificationType.WARNING, options);
  }

  error(message: string, options: NotificationOptions = {}) {
    this.show(message, NotificationType.ERROR, { duration: 5000, ...options });
  }

  clear() {
    this.notifications.forEach((_, id) => this.removeNotification(id));
  }
}

// Instância singleton do notification manager
export const notifications = new NotificationManager();