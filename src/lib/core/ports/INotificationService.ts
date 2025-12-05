export interface INotificationService {
  addNotification(opts: { header?: string; text?: string; html?: any; timeout?: number }): void;
  emit?(event: string, payload?: any): void;
}
