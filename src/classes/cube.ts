import { Vector3D } from "./vector3d";
import { getColorByName, getNameByColor } from "@constants";
import { Matrix33, createRotationMatrix } from "./matrix33";

const sequenceRegex = /^([ULFRBDMESxyzulfrbd][w]?[2]{0,1}[']{0,1}[\s]?)*$/;
const layers = ["up", "down", "left", "right", "front", "back"];
const SIZE = 100;

class CubeBase {
  colors: string[];
  cn: Vector3D[];
  layerColor;

  constructor() {
    this.colors = new Array(6).map((e) => "");
    this.cn = new Array(8).map((e) => new Vector3D());
    this.layerColor = {};

    for (let i = 0; i < 6; i += 1) {
      this.colors[i] = getColorByName("gray");
    }

    this.setColorMap();

    let d = SIZE / 2.1;
    this.cn[0] = new Vector3D(d, d, d);
    this.cn[1] = new Vector3D(d, -d, d);
    this.cn[2] = new Vector3D(-d, -d, d);
    this.cn[3] = new Vector3D(-d, d, d);
    this.cn[4] = new Vector3D(d, d, -d);
    this.cn[5] = new Vector3D(d, -d, -d);
    this.cn[6] = new Vector3D(-d, -d, -d);
    this.cn[7] = new Vector3D(-d, d, -d);
  }

  equalTo(x: CubeBase): boolean {
    for (let i = 0, maxi = layers.length; i < maxi; i += 1) {
      if (this.layerColor[layers[i]] != x.layerColor[layers[i]]) {
        return false;
      }
    }

    return true;
  }

  setColorMap() {
    this.layerColor["up"] = this.colors[4];
    this.layerColor["U"] = this.colors[4];
    this.layerColor["top"] = this.colors[4];
    this.layerColor["down"] = this.colors[5];
    this.layerColor["D"] = this.colors[5];
    this.layerColor["bottom"] = this.colors[5];
    this.layerColor["front"] = this.colors[0];
    this.layerColor["F"] = this.colors[0];
    this.layerColor["back"] = this.colors[2];
    this.layerColor["B"] = this.colors[2];
    this.layerColor["left"] = this.colors[1];
    this.layerColor["L"] = this.colors[1];
    this.layerColor["right"] = this.colors[3];
    this.layerColor["R"] = this.colors[3];
  }

  applyMatrix(m: Matrix33) {
    for (let i = 0; i < 8; i += 1) {
      this.cn[i] = m.mulVector(this.cn[i]);
    }
  }

  getColor(layerName: string): string {
    return this.layerColor[layerName];
  }

  contains(c: string): boolean {
    for (let i = 0, maxi = layers.length; i < maxi; i += 1) {
      if (this.layerColor[layers[i]] == c) {
        return true;
      }
    }

    return false;
  }

  updateColor() {
    let groups = [
      [0, 1, 2, 3],
      [2, 3, 6, 7],
      [4, 5, 6, 7],
      [0, 1, 4, 5],
      [1, 2, 5, 6],
      [0, 3, 4, 7],
    ];

    // { "front", "left", "back", "right", "up", "down" }

    for (let i = 0; i < 6; i += 1) {
      let tmp: Vector3D = this.cn[ groups[i][0] ].clone();

      for (let j = 1; j < 4; j += 1) {
        tmp = tmp.add(this.cn[ groups[i][j] ]);
      }

      if (Math.abs(tmp.x) > 1) {
        if (tmp.x > 0) {
          this.layerColor["right"] = this.colors[i];
          this.layerColor["R"] = this.colors[i];
        } else {
          this.layerColor["left"] = this.colors[i];
          this.layerColor["L"] = this.colors[i];
        }
      } else if (Math.abs(tmp.y) > 1) {
        if (tmp.y > 0) {
          this.layerColor["down"] = this.colors[i];
          this.layerColor["D"] = this.colors[i];
          this.layerColor["bottom"] = this.colors[i];
        } else {
          this.layerColor["up"] = this.colors[i];
          this.layerColor["U"] = this.colors[i];
          this.layerColor["top"] = this.colors[i];
        }
      } else if (Math.abs(tmp.z) > 1) {
        if (tmp.z > 0) {
          this.layerColor["front"] = this.colors[i];
          this.layerColor["F"] = this.colors[i];
        } else {
          this.layerColor["back"] = this.colors[i];
          this.layerColor["B"] = this.colors[i];
        }
      } else {
        // throw new Error("Error in sub-cube position of edges");
      }
    }
  }

  clone(): CubeBase {
    let res = new CubeBase();
    res.colors = this.colors.map((e) => e);
    res.cn = this.cn.map((e) => e.clone());
    res.setColorMap();

    for (let color in this.layerColor) {
      res.layerColor[color] = this.layerColor[color];
    }

    res.updateColor();

    return res;
  }
}

function random(a, b) {
  return Math.random() * (b - a) + a;
}

export class Cube {
  a: CubeBase[][][];
  pos: Vector3D[][][];
  colors: string[];
  rotationIndex: number;
  rotationIndexL: number;
  rotationIndexR: number;
  rotations: number;
  order: number;
  rotationCcw: boolean;
  currentAnimation: string;
  animation: boolean;
  withTransition: boolean;
  layerColor;
  commands = [
    "L", "L'", "L2",
    "R", "R'", "R2",
    "U", "U'", "U2",
    "D", "D'", "D2",
    "F", "F'", "F2",
    "B", "B'", "B2",
    "M", "M'", "M2",
    "E", "E'", "E2",
    "S", "S'", "S2",
    "Lw", "Lw'", "Lw2",
    "Rw", "Rw'", "Rw2",
    "Uw", "Uw'", "Uw2",
    "Dw", "Dw'", "Dw2",
    "Fw", "Fw'", "Fw2",
    "Bw", "Bw'", "Bw2",
    "l", "l'", "l2",
    "r", "r'", "r2",
    "u", "u'", "u2",
    "d", "d'", "d2",
    "f", "f'", "f2",
    "b", "b'", "b2",
    "x", "x'", "x2",
    "y", "y'", "y2",
    "z", "z'", "z2",
  ];

  constructor(ord ?: number) {
    this.order = ord || 3;
    this.colors = new Array(6).map((e) => "");
    this.rotations = 0;
    this.rotationIndex = 0;
    this.currentAnimation = "";

    this.layerColor = {};

    this.a = [];
    this.pos = [];

    for (let i = 0; i < this.order; i += 1) {
      this.a.push([]);
      this.pos.push([]);
      for (let j = 0; j < this.order; j += 1) {
        this.a[i].push([]);
        this.pos[i].push([]);
        for (let k = 0; k < this.order; k += 1) {
          this.a[i][j].push(new CubeBase());
          this.pos[i][j].push(new Vector3D());
        }
      }
    }

    /// Esquema usual
    this.colors[0] = getColorByName("green");    /// front     verde
    this.colors[1] = getColorByName("red");      /// left      rojo
    this.colors[2] = getColorByName("blue");     /// back      azul
    this.colors[3] = getColorByName("orange");   /// right     naranja
    this.colors[4] = getColorByName("yellow");   /// up        amarillo
    this.colors[5] = getColorByName("white");    /// down      blanco

    /// Esquema para blindfolded
    // this.colors[0] = getColorByName("green");    /// front     verde
    // this.colors[1] = getColorByName("orange");   /// left      naranja
    // this.colors[2] = getColorByName("blue");     /// back      azul
    // this.colors[3] = getColorByName("red");      /// right     rojo
    // this.colors[4] = getColorByName("white");    /// up        blanco
    // this.colors[5] = getColorByName("yellow");   /// down      amarillo

    let mid = (this.order - 1) / 2;

    for (let x = 0; x < this.order; x += 1) {
      for (let y = 0; y < this.order; y += 1) {
        for (let z = 0; z < this.order; z += 1) {
          // this.a[x][y][z] = new CubeBase();
          this.pos[x][y][z] = new Vector3D(
            (x - mid) * SIZE,
            (y - mid) * SIZE,
            (z - mid) * SIZE
          );

          if (z == this.order - 1) {
            this.a[x][y][z].colors[0] = this.colors[0];
          }
          
          if (z == 0) {
            this.a[x][y][z].colors[2] = this.colors[2];
          }

          if (x == 0) {
            this.a[x][y][z].colors[1] = this.colors[1];
          } 
          
          if (x == this.order - 1) {
            this.a[x][y][z].colors[3] = this.colors[3];
          }

          if (y == 0) {
            this.a[x][y][z].colors[4] = this.colors[4];
          }
          
          if (y == this.order - 1) {
            this.a[x][y][z].colors[5] = this.colors[5];
          }

          this.a[x][y][z].setColorMap();
        }
      }
    }

    this.setColorMap();
  }

  setColorMap() {
    this.layerColor["up"] = this.colors[4];
    this.layerColor["U"] = this.colors[4];
    this.layerColor["top"] = this.colors[4];
    this.layerColor["down"] = this.colors[5];
    this.layerColor["D"] = this.colors[5];
    this.layerColor["bottom"] = this.colors[5];
    this.layerColor["front"] = this.colors[0];
    this.layerColor["F"] = this.colors[0];
    this.layerColor["back"] = this.colors[2];
    this.layerColor["B"] = this.colors[2];
    this.layerColor["left"] = this.colors[1];
    this.layerColor["L"] = this.colors[1];
    this.layerColor["right"] = this.colors[3];
    this.layerColor["R"] = this.colors[3];
  }

  getColor(layerName: string): string {
    if ( this.layerColor.hasOwnProperty(layerName) ) {
      return this.layerColor[ layerName ];
    }

    return getColorByName('gray');
  }

  getColorName(layerName: string): string {
    
    if ( this.layerColor.hasOwnProperty(layerName) ) {
      return getNameByColor( this.layerColor[ layerName ] );
    }
    return 'gray';
  }

  private rotate(rotor: Matrix33, x: number, y: number, z: number) {
    this.pos[x][y][z] = rotor.mulVector(this.pos[x][y][z]);
    this.a[x][y][z].applyMatrix(rotor);
  }

  private guessPosition() {
    let na: CubeBase[][][] = [];

    for (let i = 0; i < this.order; i += 1) {
      na.push([]);
      for (let j = 0; j < this.order; j += 1) {
        na[i].push([]);
        for (let k = 0; k < this.order; k += 1) {
          na[i][j].push(new CubeBase());
        }
      }
    }

    let mid = (this.order - 1) / 2;

    for (let x = 0; x < this.order; x += 1) {
      for (let y = 0; y < this.order; y += 1) {
        for (let z = 0; z < this.order; z += 1) {
          let cx = Math.round(this.pos[x][y][z].x / SIZE + mid);
          let cy = Math.round(this.pos[x][y][z].y / SIZE + mid);
          let cz = Math.round(this.pos[x][y][z].z / SIZE + mid);
          this.pos[x][y][z] = new Vector3D(
            (x - mid) * SIZE,
            (y - mid) * SIZE,
            (z - mid) * SIZE
          );
          na[cx][cy][cz] = this.a[x][y][z].clone();
        }
      }
    }

    for (let x = 0; x < this.order; x += 1) {
      for (let y = 0; y < this.order; y += 1) {
        for (let z = 0; z < this.order; z += 1) {
          this.a[x][y][z] = na[x][y][z].clone();

          //if ( x == 1 && y == 0 && z == 0 ) {
          // this.a[x][y][z].updateColor();
          //}
        }
      }
    }
  }

  private performRotationX(ang: number) {
    let rotor = createRotationMatrix(ang, 0, 0);
    for (let y = 0; y < this.order; y += 1) {
      for (let z = 0; z < this.order; z += 1) {
        this.rotate(rotor, this.rotationIndex, y, z);
        for (let l = 1; l <= this.rotationIndexL; l += 1) {
          this.rotate(rotor, this.rotationIndex - l, y, z);
        }

        for (let r = 1; r <= this.rotationIndexR; r += 1) {
          this.rotate(rotor, this.rotationIndex + r, y, z);
        }
      }
    }
  }

  private performRotationY(ang: number) {
    let rotor = createRotationMatrix(0, ang, 0);
    for (let x = 0; x < this.order; x += 1) {
      for (let z = 0; z < this.order; z += 1) {
        this.rotate(rotor, x, this.rotationIndex, z);
        for (let l = 1; l <= this.rotationIndexL; l += 1) {
          this.rotate(rotor, x, this.rotationIndex - l, z);
        }

        for (let r = 1; r <= this.rotationIndexR; r += 1) {
          this.rotate(rotor, x, this.rotationIndex + r, z);
        }
      }
    }
  }

  private performRotationZ(ang: number) {
    let rotor = createRotationMatrix(0, 0, ang);
    for (let x = 0; x < this.order; x += 1) {
      for (let y = 0; y < this.order; y += 1) {
        this.rotate(rotor, x, y, this.rotationIndex);
        for (let l = 1; l <= this.rotationIndexL; l += 1) {
          this.rotate(rotor, x, y, this.rotationIndex - l);
        }

        for (let r = 1; r <= this.rotationIndexR; r += 1) {
          this.rotate(rotor, x, y, this.rotationIndex + r);
        }
      }
    }
  }

  update() {
    let ang = (this.rotations * Math.PI * (this.rotationCcw ? 1 : -1)) / 2;
    if (this.currentAnimation == "rotateX") {
      this.performRotationX(ang);
    } else if (this.currentAnimation == "rotateY") {
      this.performRotationY(ang);
    } else if (this.currentAnimation == "rotateZ") {
      this.performRotationZ(-ang);
    }

    this.guessPosition();
  }

  prepareForRotation(index: number, ccw: boolean, amount: number) {
    this.rotationIndex = index;
    this.rotationIndexL = 0;
    this.rotationIndexR = 0;
    this.rotationCcw = ccw;
    this.rotations = amount & 3;
  }

  rotateX(x: number, l: number, r: number, ccw: boolean, amount: number) {
    this.currentAnimation = "rotateX";
    this.prepareForRotation(x, ccw, amount);
    this.rotationIndexL = l;
    this.rotationIndexR = r;
    this.update();
  }

  rotateY(y: number, l: number, r: number, ccw: boolean, amount: number) {
    this.currentAnimation = "rotateY";
    this.prepareForRotation(y, ccw, amount);
    this.rotationIndexL = l;
    this.rotationIndexR = r;
    this.update();
  }

  rotateZ(z: number, l: number, r: number, ccw: boolean, amount: number) {
    this.currentAnimation = "rotateZ";
    this.prepareForRotation(z, ccw, amount);
    this.rotationIndexL = l;
    this.rotationIndexR = r;
    this.update();
  }

  randomize(externalOnly = false) {
    let cant = ~~random(100, 200);
    let t1 = 1.0 / 3;
    let t2 = 2.0 / 3;
    let PI_2 = Math.PI / 2;

    for (let i = 0; i < cant; i += 1) {
      let f = Math.random();

      if (externalOnly) {
        this.rotationIndex = (~~random(0, 2) & 1) * (this.order - 1);
      } else {
        this.rotationIndex = ~~random(0, this.order);
      }

      if (f < t1) {
        this.performRotationX(PI_2);
      } else if (f < t2) {
        this.performRotationY(PI_2);
      } else {
        this.performRotationZ(PI_2);
      }
      this.guessPosition();
    }
  }

  equalTo(cube: Cube): boolean {
    let order = this.order;

    if ( order != cube.order ) {
      return false;
    }

    for (let i = 0; i < order; i += 1) {
      for (let j = 0; j < order; j += 1) {
        for (let k = 0; k < order; k += 1) {
          if ( !this.a[i][j][k].equalTo( cube.a[i][j][j] ) ) {
            return false;
          }
        }
      }
    }

    return true;

  }

  isCompleted(): boolean {
    let temp: Cube[] = [];
    let op1 = [ "", "x", "x2", "x'", "z", "z2", "z'", "y", "y2", "y'" ];

    for (let i = 0; i < 6; i += 1) {
      let r = new Cube(this.order);
      r.move( op1[i] );
      temp.push( r );
    }

    for (let i = 0, maxi = temp.length; i < maxi; i += 1) {
      if ( this.equalTo( temp[i] ) ) {
        return true;
      }
    }

    return false;
  }

  private singleMove(move: string) {
    switch (move) {
      case "L":   { this.rotateX(0, 0, 0, false, 1);              break; }
      case "L2":  { this.rotateX(0, 0, 0, false, 2);              break; }
      case "L'":  { this.rotateX(0, 0, 0, true, 1);               break; }
      case "R":   { this.rotateX(this.order - 1, 0, 0, true, 1);  break; }
      case "R2":  { this.rotateX(this.order - 1, 0, 0, true, 2);  break; }
      case "R'":  { this.rotateX(this.order - 1, 0, 0, false, 1); break; }
      case "F":   { this.rotateZ(this.order - 1, 0, 0, false, 1); break; }
      case "F2":  { this.rotateZ(this.order - 1, 0, 0, false, 2); break; }
      case "F'":  { this.rotateZ(this.order - 1, 0, 0, true, 1);  break; }
      case "B":   { this.rotateZ(0, 0, 0, true, 1);               break; }
      case "B2":  { this.rotateZ(0, 0, 0, true, 2);               break; }
      case "B'":  { this.rotateZ(0, 0, 0, false, 1);              break; }
      case "U":   { this.rotateY(0, 0, 0, false, 1);              break; }
      case "U2":  { this.rotateY(0, 0, 0, false, 2);              break; }
      case "U'":  { this.rotateY(0, 0, 0, true, 1);               break; }
      case "D":   { this.rotateY(this.order - 1, 0, 0, true, 1);  break; }
      case "D2":  { this.rotateY(this.order - 1, 0, 0, true, 2);  break; }
      case "D'":  { this.rotateY(this.order - 1, 0, 0, false, 1); break; }
      case "M":   { this.rotateX(this.order - 2, 0, 0, false, 1); break; }
      case "M2":  { this.rotateX(this.order - 2, 0, 0, false, 2); break; }
      case "M'":  { this.rotateX(this.order - 2, 0, 0, true, 1);  break; }
      case "E":   { this.rotateY(this.order - 2, 0, 0, false, 1); break; }
      case "E2":  { this.rotateY(this.order - 2, 0, 0, false, 2); break; }
      case "E'":  { this.rotateY(this.order - 2, 0, 0, true, 1);  break; }
      case "S":   { this.rotateZ(this.order - 2, 0, 0, false, 1); break; }
      case "S2":  { this.rotateZ(this.order - 2, 0, 0, false, 2); break; }
      case "S'":  { this.rotateZ(this.order - 2, 0, 0, true, 1);  break; }
      case "r":   { this.rotateX(this.order - 1, 1, 0, true, 1);  break; }
      case "r'":  { this.rotateX(this.order - 1, 1, 0, false, 1); break; }
      case "r2":  { this.rotateX(this.order - 1, 1, 0, true, 2);  break; }
      case "l":   { this.rotateX(0, 0, 1, false, 1);              break; }
      case "l2":  { this.rotateX(0, 0, 1, false, 2);              break; }
      case "l'":  { this.rotateX(0, 0, 1, true, 1);               break; }
      case "f":   { this.rotateZ(this.order - 1, 1, 0, false, 1); break; }
      case "f2":  { this.rotateZ(this.order - 1, 1, 0, false, 2); break; }
      case "f'":  { this.rotateZ(this.order - 1, 1, 0, true, 1);  break; }
      case "b":   { this.rotateZ(0, 0, 1, true, 1);               break; }
      case "b2":  { this.rotateZ(0, 0, 1, true, 2);               break; }
      case "b'":  { this.rotateZ(0, 0, 1, false, 1);              break; }
      case "u":   { this.rotateY(0, 0, 1, false, 1);              break; }
      case "u2":  { this.rotateY(0, 0, 1, false, 2);              break; }
      case "u'":  { this.rotateY(0, 0, 1, true, 1);               break; }
      case "d":   { this.rotateY(this.order - 1, 1, 0, true, 1);  break; }
      case "d2":  { this.rotateY(this.order - 1, 1, 0, true, 2);  break; }
      case "d'":  { this.rotateY(this.order - 1, 1, 0, false, 1); break; }
      // case "l":   { this.rotateX(1, 0, 0, false, 1);              break; }
      // case "l2":  { this.rotateX(1, 0, 0, false, 2);              break; }
      // case "l'":  { this.rotateX(1, 0, 0, true, 1);               break; }
      // case "r":   { this.rotateX(this.order - 2, 0, 0, true, 1);  break; }
      // case "r2":  { this.rotateX(this.order - 2, 0, 0, true, 2);  break; }
      // case "r'":  { this.rotateX(this.order - 2, 0, 0, false, 1); break; }
      // case "f":   { this.rotateZ(this.order - 2, 0, 0, false, 1); break; }
      // case "f2":  { this.rotateZ(this.order - 2, 0, 0, false, 2); break; }
      // case "f'":  { this.rotateZ(this.order - 2, 0, 0, true, 1);  break; }
      // case "b":   { this.rotateZ(1, 0, 0, true, 1);               break; }
      // case "b2":  { this.rotateZ(1, 0, 0, true, 2);               break; }
      // case "b'":  { this.rotateZ(1, 0, 0, false, 1);              break; }
      // case "u":   { this.rotateY(1, 0, 0, false, 1);              break; }
      // case "u2":  { this.rotateY(1, 0, 0, false, 2);              break; }
      // case "u'":  { this.rotateY(1, 0, 0, true, 1);               break; }
      // case "d":   { this.rotateY(this.order - 2, 0, 0, true, 1);  break; }
      // case "d2":  { this.rotateY(this.order - 2, 0, 0, true, 2);  break; }
      // case "d'":  { this.rotateY(this.order - 2, 0, 0, false, 1); break; }
      // case "Rw":  { this.rotateX(this.order - 1, 1, 0, true, 1);  break; }
      // case "Rw'": { this.rotateX(this.order - 1, 1, 0, false, 1); break; }
      // case "Rw2": { this.rotateX(this.order - 1, 1, 0, true, 2);  break; }
      // case "Lw":  { this.rotateX(0, 0, 1, false, 1);              break; }
      // case "Lw2": { this.rotateX(0, 0, 1, false, 2);              break; }
      // case "Lw'": { this.rotateX(0, 0, 1, true, 1);               break; }
      // case "Fw":  { this.rotateZ(this.order - 1, 1, 0, false, 1); break; }
      // case "Fw2": { this.rotateZ(this.order - 1, 1, 0, false, 2); break; }
      // case "Fw'": { this.rotateZ(this.order - 1, 1, 0, true, 1);  break; }
      // case "Bw":  { this.rotateZ(0, 0, 1, true, 1);               break; }
      // case "Bw2": { this.rotateZ(0, 0, 1, true, 2);               break; }
      // case "Bw'": { this.rotateZ(0, 0, 1, false, 1);              break; }
      // case "Uw":  { this.rotateY(0, 0, 1, false, 1);              break; }
      // case "Uw2": { this.rotateY(0, 0, 1, false, 2);              break; }
      // case "Uw'": { this.rotateY(0, 0, 1, true, 1);               break; }
      // case "Dw":  { this.rotateY(this.order - 1, 1, 0, true, 1);  break; }
      // case "Dw2": { this.rotateY(this.order - 1, 1, 0, true, 2);  break; }
      // case "Dw'": { this.rotateY(this.order - 1, 1, 0, false, 1); break; }
      case "x":   { this.rotateX(0, 0, this.order - 1, true, 1);  break; }
      case "x'":  { this.rotateX(0, 0, this.order - 1, false, 1); break; }
      case "x2":  { this.rotateX(0, 0, this.order - 1, true, 2);  break; }
      case "y":   { this.rotateY(0, 0, this.order - 1, false, 1); break; }
      case "y'":  { this.rotateY(0, 0, this.order - 1, true, 1);  break; }
      case "y2":  { this.rotateY(0, 0, this.order - 1, false, 2); break; }
      case "z":   { this.rotateZ(0, 0, this.order - 1, false, 1); break; }
      case "z2":  { this.rotateZ(0, 0, this.order - 1, false, 2); break; }
      case "z'":  { this.rotateZ(0, 0, this.order - 1, true, 1);  break; }
    }
  }

  static sanitizeSequence(seq: string): string[] {
    let moves = seq.split(' ');
    let res = [];

    for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
      let mv = (moves[i].indexOf("'") > -1 && moves[i].indexOf('2') > -1) ?
        moves[i].replace("'", '') : moves[i];
      res.push(mv);
    }

    return res;
  }

  static inverse(seq: string): string {
    if ( sequenceRegex.test(seq) ) {
      let moves = Cube.sanitizeSequence(seq);
      moves.reverse();
      return moves.map(e => {
        if ( e.indexOf('2') > -1 ) {
          return e;
        }
        if ( e.indexOf("'") > -1 ) {
          return e.replace("'", "");
        }
        return e + "'";
      }).join(' ');
    }
    return '';
  }

  move(seq: string, inv?: boolean) {
    if ( sequenceRegex.test(seq) ) {
      let moves;
      

      if( inv ) {
        moves = Cube.inverse(seq).split(' ');
      } else {
        moves = Cube.sanitizeSequence(seq);
      }

      for (let i = 0, maxi = moves.length; i < maxi; i += 1) {
        this.singleMove( moves[i] );
      }

    }
  }

  colorToLayer(col: string): string {
    let layers = "URFDLB";

    for (let i = 0; i < layers.length; i += 1) {
      if ( this.getColor(layers[i]) === col ) {
        return layers[i];
      }
    }
    return 'G';
  }

  asString(): string {
    let res = [];
    let order = this.order;
    let orderm1 = order - 1;

    for (let z = 0; z < order; z += 1) {
      for (let x = 0; x < order; x += 1) {
        res.push( this.colorToLayer( this.a[x][0][z].getColor('U') ) );
      }
    }

    for (let y = 0; y < order; y += 1) {
      for (let z = orderm1; z >= 0; z -= 1) {
        res.push( this.colorToLayer( this.a[ orderm1 ][y][z].getColor('R') ) );
      }
    }

    for (let y = 0; y < order; y += 1) {
      for (let x = 0; x < order; x += 1) {
        res.push( this.colorToLayer( this.a[x][y][ orderm1 ].getColor('F') ) );
      }
    }

    for (let z = orderm1; z >= 0; z -= 1) {
      for (let x = 0; x < order; x += 1) {
        res.push( this.colorToLayer( this.a[x][ orderm1 ][z].getColor('D') ) );
      }
    }

    for (let y = 0; y < order; y += 1) {
      for (let z = 0; z < order; z += 1) {
        res.push( this.colorToLayer( this.a[0][y][z].getColor('L') ) );
      }
    }

    for (let y = 0; y < order; y += 1) {
      for (let x = orderm1; x >= 0; x -= 1) {
        res.push( this.colorToLayer( this.a[x][y][ 0 ].getColor('B') ) );
      }
    }
    
    return res.join('');
  }

  static random(ord: number): Cube {
    let res = new Cube(ord);
    res.randomize( ord === 3 );
    return res;
  }

  static fromSequence(ord: number, seq: string, inv?: boolean): Cube {
    let res = new Cube(ord);
    res.move(seq, inv);
    return res;
  }
}
