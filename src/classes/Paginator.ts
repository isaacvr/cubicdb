import { between } from "@helpers/math";

export class Paginator {
  private data: any[];
  private len: number;
  private limit: number;
  private offset: number;
  private _page: number;
  private _pages: number;
  private width: number;

  public labels: number[];

  constructor(dt?: any[], limit?: number, paginatorWidth?: number) {
    this.data = Array.isArray(dt) ? dt :[];
    this.len = this.data.length;
    this.limit = Math.abs( ~~(limit || 0) ) || 10;
    this.offset = 0;
    this._page = 0;
    this._pages = 0;
    this.width = paginatorWidth || 5;
    
    this.labels = [];

    this.update();
  }

  get start(): number {
    return this.offset;
  }

  get end(): number {
    return this.start + this.limit;
  }

  get page(): number {
    return this._page;
  }

  get pages(): number {
    return this._pages;
  }

  private update() {
    this.len = this.data.length;

    this._pages = Math.ceil(this.len / this.limit);

    this._page = between(this._page, 1, this._pages);
    this.offset = (this._page - 1) * this.limit;

    let minL = Math.max(1, this._page - (this.width >> 1)); // min label
    let maxL = Math.min(this._pages, minL + this.width - 1); // max label

    this.labels.length = 0;

    for (let i = minL; i <= maxL; i += 1) {
      this.labels.push(i);
    }

  }

  setData(d: any[]) {
    this.data = d;
    this.update();
  }

  setPage(p: number) {
    this._page = p;
    this.update();
  }

  nextPage() {
    this.setPage(this._page + 1);
  }

  prevPage() {
    this.setPage(this._page - 1);
  }
}