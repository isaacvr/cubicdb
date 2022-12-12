const O = 4;

export class Matrix44 {

 data: number[];
  
  constructor() {
    this.data = [];

    for (let i = 0; i < O; i += 1) {
      for (let j = 0; j < O; j += 1) {
        this.data.push(0);
      }
    }
  }
  
  add(m: Matrix44): Matrix44 {
    let newMat = new Matrix44();
    let c = 0;
    for (let i = 0; i < O; i += 1) {
      for (let j = 0; j < O; j += 1) {
        newMat.data[c] = this.data[c] + m.data[c];
        c += 1;
      }
    }
    return newMat;
  }
  
  sub(m: Matrix44): Matrix44 {
    let newMat = new Matrix44();
    let c = 0;
    for (let i = 0; i < O; i += 1) {
      for (let j = 0; j < O; j += 1) {
        newMat.data[c] = this.data[c] - m.data[c];
        c += 1;
      }
    }
    return newMat;
  }
  
  mulScalar(f: number): Matrix44 {
    let newMat = new Matrix44();
    let c = 0;
    for (let i = 0; i < O; i += 1) {
      for (let j = 0; j < O; j += 1) {
        newMat.data[c] = this.data[c] * f;
        c += 1;
      }
    }
    return newMat;
  }
  
  mulMat(m: Matrix44): Matrix44 {
    let res = new Matrix44();

    for(let i = 0; i < O; i += 1) {
      for(let j = 0; j < O; j += 1) {
        for(let k = 0; k < O; k += 1) {
          res.data[i * O + j] += this.data[i * O + k] * m.data[k * O + j]; 
        }
      }
    }
    return res;
  }
  
  div(f: number): Matrix44 {
    let newMat = new Matrix44();
    let c = 0;
    for (let i = 0; i < O; i += 1) {
      for (let j = 0; j < O; j += 1) {
        newMat.data[c] = this.data[c] / f;
        c += 1;
      }
    }
    return newMat;
  }

  toFloat(): Float32Array {
    return new Float32Array(this.data);
  }

}

function createRotationMatrixX(ang: number): Matrix44 {
  let res = new Matrix44();
  res.data = [
    1, 0, 0, 0,
    0, Math.cos(ang), -Math.sin(ang), 0,
    0, Math.sin(ang), Math.cos(ang), 0,
    0, 0, 0, 1
  ];
  return res;
}

function createRotationMatrixY(ang: number): Matrix44 {
  let res = new Matrix44();
  res.data = [
    Math.cos(ang), 0, Math.sin(ang), 0,
    0, 1, 0, 0,
    -Math.sin(ang), 0, Math.cos(ang), 0,
    0, 0, 0, 1
  ];
  return res;
}

function createRotationMatrixZ(ang: number): Matrix44 {
  let res = new Matrix44();
  res.data = [
    Math.cos(ang), -Math.sin(ang), 0, 0,
    Math.sin(ang), Math.cos(ang), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
  return res;
}

export function createRotationMatrix(angx: number, angy: number, angz: number): Matrix44 {
  let rx = createRotationMatrixX(angx);
  let ry = createRotationMatrixY(angy);
  let rz = createRotationMatrixZ(angz);
  return rx.mulMat(ry).mulMat(rz);
}
