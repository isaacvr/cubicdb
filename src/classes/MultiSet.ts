export class MultiSet<T = number> {
  private data: T[];

  constructor(arr?: T[]) {
    this.data = Array.isArray(arr) ? arr.slice().sort() : [];
  }

  get size(): number {
    return this.data.length;
  }

  private search(v: T, toInsert?: boolean): number {
    let ini = 0, fin = this.data.length;

    while (ini < fin) {
      let mid = (ini + fin) >> 1;

      if ( this.data[mid] === v ) {
        return mid;
      }

      ini = this.data[mid] < v ? mid + 1 : ini; 
      fin = this.data[mid] > v ? mid : fin; 
    }

    return toInsert ? ini : -1;
  }

  has(v: T): boolean {
    return this.search(v) > -1;
  }

  add(v: T) {
    let pos = this.search(v, true);
    this.data.splice(pos, 0, v);
  }

  // add alias
  push(v: T) { this.add(v); }
  insert(v: T) { this.add(v); }

  delete(v: T) {
    let pos = this.search(v);

    if ( pos > -1 ) {
      this.data.splice(pos, 1);
    }
  }

  // delete alias
  del(v: T) { this.delete(v); }
  remove(v: T) { this.delete(v); }
  rem(v: T) { this.delete(v); }

  deleteAll(v: T) {
    while (true) {
      let pos = this.search(v);
      if ( pos === -1 ) break;
      this.data.splice(pos, 1);
    }
  }

  // deleteAll alias
  delAll(v: T) { this.deleteAll(v); }
  removeAll(v: T) { this.deleteAll(v); }
  remAll(v: T) { this.deleteAll(v); }

  clear() {
    this.data.length = 0;
  }

  isEmpty(): boolean {
    return this.data.length === 0;
  }

  toArray(): T[] {
    return this.data.slice();
  }

}