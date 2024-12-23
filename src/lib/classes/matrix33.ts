import { Vector3D } from "./vector3d";
export class Matrix33 {
  data: number[][];

  constructor() {
    this.data = [];

    for (let i = 0; i < 3; i += 1) {
      this.data.push([]);
      for (let j = 0; j < 3; j += 1) {
        this.data[i].push(0);
      }
    }
  }

  setData(
    v00: number,
    v01: number,
    v02: number,
    v10: number,
    v11: number,
    v12: number,
    v20: number,
    v21: number,
    v22: number
  ) {
    this.data = [
      [v00, v01, v02],
      [v10, v11, v12],
      [v20, v21, v22],
    ];
  }

  add(m: Matrix33): Matrix33 {
    const newMat = new Matrix33();

    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        newMat.data[i][j] = this.data[i][j] + m.data[i][j];
      }
    }
    return newMat;
  }

  sub(m: Matrix33): Matrix33 {
    const newMat = new Matrix33();

    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        newMat.data[i][j] = this.data[i][j] - m.data[i][j];
      }
    }
    return newMat;
  }

  mulScalar(f: number): Matrix33 {
    const newMat = new Matrix33();
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        newMat.data[i][j] = this.data[i][j] * f;
      }
    }
    return newMat;
  }

  mulVector(p: Vector3D): Vector3D {
    const res = new Vector3D(0, 0, 0);
    res.x = this.data[0][0] * p.x + this.data[0][1] * p.y + this.data[0][2] * p.z;
    res.y = this.data[1][0] * p.x + this.data[1][1] * p.y + this.data[1][2] * p.z;
    res.z = this.data[2][0] * p.x + this.data[2][1] * p.y + this.data[2][2] * p.z;
    return res;
  }

  mulMat(m: Matrix33): Matrix33 {
    const res = new Matrix33();

    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        for (let k = 0; k < 3; k += 1) {
          res.data[i][j] += this.data[i][k] * m.data[k][j];
        }
      }
    }
    return res;
  }

  div(f: number): Matrix33 {
    const newMat = new Matrix33();

    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        newMat.data[i][j] = this.data[i][j] / f;
      }
    }
    return newMat;
  }
}

function createRotationMatrixX(ang: number): Matrix33 {
  const res = new Matrix33();
  res.data[0][0] = 1;
  res.data[0][1] = 0;
  res.data[0][2] = 0;

  res.data[1][0] = 0;
  res.data[1][1] = Math.cos(ang);
  res.data[1][2] = -Math.sin(ang);

  res.data[2][0] = 0;
  res.data[2][1] = Math.sin(ang);
  res.data[2][2] = Math.cos(ang);
  return res;
}

function createRotationMatrixY(ang: number): Matrix33 {
  const res = new Matrix33();
  res.data[0][0] = Math.cos(ang);
  res.data[0][1] = 0;
  res.data[0][2] = Math.sin(ang);

  res.data[1][0] = 0;
  res.data[1][1] = 1;
  res.data[1][2] = 0;

  res.data[2][0] = -Math.sin(ang);
  res.data[2][1] = 0;
  res.data[2][2] = Math.cos(ang);
  return res;
}

function createRotationMatrixZ(ang: number): Matrix33 {
  const res = new Matrix33();
  res.data[0][0] = Math.cos(ang);
  res.data[0][1] = -Math.sin(ang);
  res.data[0][2] = 0;

  res.data[1][0] = Math.sin(ang);
  res.data[1][1] = Math.cos(ang);
  res.data[1][2] = 0;

  res.data[2][0] = 0;
  res.data[2][1] = 0;
  res.data[2][2] = 1;
  return res;
}

export function createRotationMatrix(angx: number, angy: number, angz: number): Matrix33 {
  const rx = createRotationMatrixX(angx);
  const ry = createRotationMatrixY(angy);
  const rz = createRotationMatrixZ(angz);
  return rx.mulMat(ry).mulMat(rz);
}
