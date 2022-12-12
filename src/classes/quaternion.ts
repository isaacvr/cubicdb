const qDimensions = ["w", "x", "y", "z"];
const qProductSign = [
  [1, 1, 1, 1],
  [1, -1, 1, -1],
  [1, -1, -1, 1],
  [1, 1, -1, -1],
];
const qProductAxis = [
  [0, 1, 2, 3],
  [1, 0, 3, 2],
  [2, 3, 0, 1],
  [3, 2, 1, 0],
];

export class Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
  constructor(w: number, x: number, y: number, z: number) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  conjugate(): Quaternion {
    return new Quaternion(this.w, -this.x, -this.y, -this.z);
  }

  multiply(q: Quaternion): Quaternion {
    const product = new Quaternion(0, 0, 0, 0);
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        product[qDimensions[qProductAxis[x][y]]] +=
          qProductSign[x][y] * this[qDimensions[x]] * q[qDimensions[y]];
      }
    }
    return product;
  }
}
