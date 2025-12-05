import type { Callback } from "@interfaces";

export class Emitter {
  private callbackSet: Set<string>;
  private callBackObject: { [key: string]: Callback[] };

  constructor() {
    this.callbackSet = new Set<string>();
    this.callBackObject = {};
  }

  on(eventName: string, callback: Callback) {
    if (!this.callbackSet.has(eventName)) {
      this.callBackObject[eventName] = [];
    }

    this.callbackSet.add(eventName);
    this.callBackObject[eventName].push(callback);
  }

  off(eventName?: string, callback?: Callback) {
    if (eventName === "*") {
      Object.entries(this.callBackObject).forEach(e => {
        this.callBackObject[e[0]] = e[1].filter(e1 => e1 != callback);

        if (this.callBackObject[e[0]].length === 0) {
          this.callbackSet.delete(e[0]);
          delete this.callBackObject[e[0]];
        }
      });
      return;
    }

    if (!eventName) {
      this.callbackSet.clear();
      this.callBackObject = {};
      return;
    }

    if (!callback) {
      this.callbackSet.delete(eventName);
      delete this.callBackObject[eventName];
      return;
    }

    if (!this.callbackSet.has(eventName)) return;

    this.callBackObject[eventName] = this.callBackObject[eventName].filter(cb => cb != callback);

    if (this.callBackObject[eventName].length === 0) {
      this.callbackSet.delete(eventName);
      delete this.callBackObject[eventName];
    }
  }

  emit<T extends string>(eventName: T, ...args: any[]) {
    if (this.callbackSet.has("*")) {
      this.callBackObject["*"].forEach(cb => cb(eventName, ...args));
    }

    if (!this.callbackSet.has(eventName)) {
      return;
    }

    this.callBackObject[eventName].forEach(cb => cb(...args));
  }
}
