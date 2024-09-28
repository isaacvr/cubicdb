import { randomUUID } from "@helpers/strings";
import type { INotification } from "@interfaces";
import { writable, type Writable } from "svelte/store";

export class NotificationService {
  private static _instance: NotificationService;
  public notificationSub: Writable<INotification[]>;

  private constructor() {
    this.notificationSub = writable<INotification[]>([]);
  }

  static getInstance(): NotificationService {
    if (NotificationService._instance) {
      return NotificationService._instance;
    }
    return (NotificationService._instance = new NotificationService());
  }

  addNotification(n: INotification) {
    if (!n.key) {
      n.key = randomUUID();
    }
    this.notificationSub.update(v => [...v, n]);
  }

  removeNotification(key: string) {
    this.notificationSub.update(v => v.filter(nt => nt.key != key));
  }
}
