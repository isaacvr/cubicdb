export class Vector2D {
  x: number;
  y: number;

  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  }

  static cross(a: Vector2D, b: Vector2D): number {
    return a.x * b.y - b.x * a.y;
  }

  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  mul(f: number): Vector2D {
    return new Vector2D(this.x * f, this.y * f);
  }

  multiply(v: Vector2D): Vector2D {
    return new Vector2D(this.x * v.x - this.y * v.y, this.x * v.y + this.y * v.x);
  }

  div(f: number): Vector2D {
    return new Vector2D(this.x / f, this.y / f);
  }

  rot(ang: number): Vector2D {
    return new Vector2D(
      this.x * Math.cos(ang) - this.y * Math.sin(ang),
      this.x * Math.sin(ang) + this.y * Math.cos(ang)
    );
  }

  abs() {
    return (this.x ** 2 + this.y ** 2) ** 0.5;
  }

  unit() {
    const len = this.abs();
    return new Vector2D(this.x / len, this.y / len);
  }
}
