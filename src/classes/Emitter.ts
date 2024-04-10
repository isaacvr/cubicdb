type Callback = (...args: any[]) => any;

export class Emitter {
  private callbackSet: Set<string>;
  private callBackObject: { [key: string]: Callback[] };

  constructor() {
    this.callbackSet = new Set<string>();
    this.callBackObject = {};
  }

  on(eventName: string, callback: Callback) {
    if ( !this.callbackSet.has(eventName) ) {
      this.callBackObject[ eventName ] = [];
    }

    this.callbackSet.add( eventName );
    this.callBackObject[ eventName ].push( callback );
  }

  off(eventName?: string, callback?: Callback) {
    if ( !eventName ) {
      this.callbackSet.clear();
      this.callBackObject = {};
      return;
    }

    if ( !callback ) {
      this.callbackSet.delete(eventName);
      delete this.callBackObject[ eventName ];
      return;
    }

    if ( !this.callbackSet.has(eventName) ) return;

    this.callBackObject[ eventName ] = this.callBackObject[ eventName ].filter(cb => cb != callback);
    
    if ( this.callBackObject[ eventName ].length === 0 ) {
      this.callbackSet.delete( eventName );
      delete this.callBackObject[ eventName ];
    }
  }

  emit<T extends string>(eventName: T, ...args: any[]) {
    if ( !this.callbackSet.has(eventName) ) {
      // console.log(`Unknown event "${eventName}"`)
      return;
    }

    // console.log(`Found event "${eventName}"`)
    this.callBackObject[eventName].forEach(cb => cb.apply(null, args));
  }
}