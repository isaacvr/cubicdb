import { ImageSticker } from "@classes/puzzle/ImageSticker";
import { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import { Puzzle } from "@classes/puzzle/puzzle";
import { Vector2D } from "@classes/vector2-d";
import { CENTER, Vector3D } from "@classes/vector3d";
import { CubeMode, EPS } from "@constants";
import { cubeToThree, piecesToTree } from "@helpers/cubeToThree";
import { getLagrangeInterpolation } from "@helpers/math";
import type { PuzzleType } from "@interfaces";
import {
  FrontSide,
  Matrix3,
  Matrix4,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Intersection,
} from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";

interface ThreeJSAdaptorConfig {
  canvas: HTMLCanvasElement;
  selectedPuzzle: PuzzleType;
  enableKeyboard: boolean;
  enableDrag: boolean;
  showBackFace: boolean;
  order: number;
  animationTime: number;
  zoom: number;
}

interface UserData {
  data: Piece | Sticker;
  anchor?: Vector3D;
}

interface DragResult {
  buffer: Object3D[][];
  userData: UserData[][];
  u: Vector3D;
  dir: number;
  ang: number[];
  animationTime: number[];
  centers: Vector3D[];
}

interface PuzzleAnimation {
  animBuffer: Object3D[][];
  userData: UserData[][];
  u: Vector3D;
  angs: number[];
  from: Matrix4[][];
  animationTimes: number[];
  centers: Vector3D[];
  timeIni: number;
  ignoreUserData?: boolean;
}

function findPiece(p: Piece, arr: Piece[]): boolean {
  for (let i = 0, maxi = arr.length; i < maxi; i += 1) {
    if (arr[i].equal(p)) {
      return true;
    }
  }

  return false;
}

function vectorsFromCamera(vecs: any[], cam: PerspectiveCamera) {
  return vecs.map(e => {
    let vp = new Vector3(e.x, e.y, e.z).project(cam);
    return new Vector3D(vp.x, -vp.y, 0);
  });
}

function vectorsFromCameraInv(vecs: any[], cam: PerspectiveCamera) {
  return vecs.map(e => {
    let vp = new Vector3(e.x, e.y, e.z).unproject(cam);
    return new Vector3D(vp.x, vp.y, vp.z);
  });
}

// Linear approximation does not provide a good UX
const lagrange = getLagrangeInterpolation([
  new Vector2D(3, 40), // Closest
  new Vector2D(6, 33), //
  new Vector2D(12, 20), // Farest
]);

const MOVE_THRESHOLD = 10;

export class ThreeJSAdaptor {
  // Internal data
  cube: Puzzle;
  animationTime: number;
  selectedPuzzle: PuzzleType = "rubik";
  order = 3;
  group: Object3D = new Object3D();
  backFace: Object3D = new Object3D();
  piece: Intersection | null = null;
  ini: Vector2 | null = null;
  iniM: Vector3 | null = null;
  zoom = 12;
  mcx = 0; // Mouse coordinates
  mcy = 0;
  W = 0;
  H = 0;

  // ThreeJS
  renderer: WebGLRenderer;
  scene = new Scene();
  canvas: HTMLCanvasElement;
  camera = new PerspectiveCamera(40, 1, 0.1, 50);
  controls: TrackballControls;

  // Animations
  currentAnimation: PuzzleAnimation | null = null;
  animationQueue: PuzzleAnimation[] = [];
  moveQueue: any[] = [];
  dragging = false;
  animating = false;
  enableKeyboard = false;
  enableDrag = false;
  showBackFace = false;

  private rotating = false;
  private rotationData: DragResult | null = null;
  private animation: PuzzleAnimation | null = null;
  private distance: number;
  private angleFactor = 0;

  constructor(config: ThreeJSAdaptorConfig) {
    this.enableKeyboard = config.enableKeyboard;
    this.enableDrag = config.enableDrag;
    this.selectedPuzzle = config.selectedPuzzle;
    this.order = config.order;
    this.animationTime = config.animationTime;
    this.showBackFace = config.showBackFace;
    this.zoom = config.zoom;
    this.distance = config.zoom;

    this.cube = new Puzzle({ type: this.selectedPuzzle });
    this.canvas = config.canvas;
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      canvas: this.canvas,
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";

    this.canvas.addEventListener("pointerdown", ev => this.downHandler(ev));
    this.canvas.addEventListener("pointerup", () => this.upHandler());
    this.canvas.addEventListener("pointerleave", () => this.upHandler());
    this.canvas.addEventListener("pointermove", ev => this.moveHandler(ev));

    this.controls = new TrackballControls(this.camera, this.canvas);
    this.controls.rotateSpeed = 3;
    this.controls.noPan = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 12;
  }

  setZoom(z: number) {
    this.zoom = z;
    this.distance = z;
  }

  dataFromGroup(pc: any, best: Vector3D, vv: Vector3D, dir: number, fp = findPiece): DragResult {
    let animationBuffer: Object3D[][] = [];
    let userData: UserData[][] = [];
    let angs: number[] = [];
    let animationTimes: number[] = [];
    let centers: Vector3D[] = [];

    let toMove = this.cube.p.toMove ? this.cube.p.toMove(pc[0], pc[1], best) : [];
    let groupToMove = Array.isArray(toMove) ? toMove : [toMove];

    let u: any = best;

    groupToMove.forEach(g => {
      if ("dir" in g) {
        let cr = vv.cross(vectorsFromCamera([g.dir], this.camera)[0]);
        dir = -Math.sign(cr.z);
        u = g.dir;
      }

      if ("center" in g) {
        centers.push(g.center);
      } else {
        centers.push(this.cube.p.center.clone());
      }

      let pieces: Piece[] = g.pieces;
      let subBuffer: Object3D[] = [];
      let subUserData: UserData[] = [];

      this.group.children.forEach((p: Object3D, pos: number) => {
        if (fp(<Piece>p.userData.data, pieces)) {
          subUserData.push(p.userData as UserData);
          subBuffer.push(p);

          subUserData.push({ data: new Piece([]) });
          subBuffer.push(this.backFace.children[pos]);
        }
      });

      userData.push(subUserData);
      animationBuffer.push(subBuffer);
      angs.push(g.ang);
      animationTimes.push(g.animationTime);
    });

    return {
      buffer: animationBuffer,
      userData,
      u,
      dir,
      ang: angs,
      animationTime: animationTimes,
      centers,
    };
  }

  drag(piece: Intersection, ini: Vector2, fin: Vector2, camera: PerspectiveCamera) {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    let pc = [piece.object.parent!.userData.data, piece.object.userData.data!];
    let po = pc[1].getOrientation();
    let vecs: Vector3D[] = pc[1].vecs.filter((v: Vector3D) => v.cross(po).abs() > EPS);
    let v = fin.clone().sub(ini);
    let vv = new Vector3D(v.x, v.y, 0);

    let faceVectors = vectorsFromCamera(vecs, camera);

    let dir: number = 0;
    let best: Vector3D = new Vector3D(0, 0, 0);

    faceVectors.reduce((ac, fv, p) => {
      let cr = vv.cross(fv);
      if (cr.abs() > ac) {
        best = vecs[p];
        dir = -Math.sign(cr.z);
        return cr.abs();
      }
      return ac;
    }, -Infinity);

    if (best.x === 0 && best.y === 0 && best.z === 0) {
      return null;
    }

    return this.dataFromGroup(pc, best, vv, dir);
  }

  resizeHandler(contained: boolean) {
    this.W = Math.min(window.innerWidth, window.screen.availWidth);
    this.H = Math.min(window.innerHeight, window.screen.availHeight);

    if (contained && this.canvas?.parentElement) {
      this.W = (this.canvas.parentElement as any).clientWidth;
      this.H = (this.canvas.parentElement as any).clientHeight;
    }

    this.renderer.setSize(this.W, this.H);
    this.camera.aspect = this.W / this.H;
    this.camera.updateProjectionMatrix();
    this.controls.handleResize();
  }

  render() {
    if (!this.animating) {
      if (this.moveQueue.length) {
        if (this.addMove(this.moveQueue[0])) {
          this.setAnimationData();
          this.animating = true;
        }

        this.moveQueue.shift();
      } else if (this.animationQueue.length) {
        this.setAnimationData();
        this.animating = true;
        let { userData, ignoreUserData } = this.currentAnimation!;

        !ignoreUserData &&
          userData.forEach(dataList =>
            dataList.forEach(({ data, anchor }) => {
              if (data instanceof Piece && anchor && data.anchor.abs()) {
                let a = data.anchor;
                anchor.setCoords(a.x, a.y, a.z);
              }
            })
          );
      }
    }

    if (this.animating && this.currentAnimation) {
      let currAnim = this.currentAnimation;
      let total = currAnim.animBuffer.length;
      let anim = 0;
      let animLen = this.moveQueue.length;

      for (let i = 0; i < total; i += 1) {
        let animationTime = currAnim.animationTimes[i];
        let alpha = (performance.now() - currAnim.timeIni) / animationTime;

        if (animLen) {
          alpha = 2;
        }

        if (alpha > 1) {
          this.interpolate(currAnim, i, 1);

          !currAnim.ignoreUserData &&
            currAnim.userData[i].forEach((dt: UserData) => {
              const { data } = dt;

              if (data instanceof Piece && data.hasCallback) {
                data.callback(data, currAnim.centers[i], currAnim.u, currAnim.angs[i]);
              } else {
                data.rotate(currAnim.centers[i], currAnim.u, currAnim.angs[i], true);
              }
            });
        } else {
          anim += 1;
          this.interpolate(currAnim, i, alpha);
        }
      }

      if (anim === 0) {
        this.animationQueue.shift();
        this.animating = false;
      }
    }

    this.backFace.visible = this.showBackFace;

    this.controls.update();
    this.distance = this.camera.position.distanceTo({ x: 0, y: 0, z: 0 });
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }

  interpolate(animation: PuzzleAnimation, pos: number, alpha: number) {
    const { angs, animBuffer, from, u, userData, centers } = animation;

    let nu = new Vector3(u.x, u.y, u.z).normalize();
    let center = centers[pos];
    let c = new Vector3(center.x, center.y, center.z);
    let ang = angs[pos] * alpha;

    userData[pos].forEach((p, idx) => {
      const { data } = p;
      let d = animBuffer[pos][idx];
      d.rotation.setFromRotationMatrix(from[pos][idx]);
      d.position.setFromMatrixPosition(from[pos][idx]);
      if (data instanceof Piece && data.hasCallback) {
        data.callback(d, new Vector3(0, 0, 0), u, ang, true, Vector3, animation.ignoreUserData);
      } else {
        d.parent?.localToWorld(d.position);
        d.position.sub(c);
        d.position.applyAxisAngle(nu, ang);
        d.position.add(c);
        d.parent?.worldToLocal(d.position);
        d.rotateOnWorldAxis(nu, ang);
      }
    });
  }

  setAnimationData() {
    this.currentAnimation = this.animationQueue[0];
  }

  addMove(mov: any[]) {
    let m = mov[0];
    this.animationTime = Math.min(100, (mov[1] * 2) / 3);

    let mv = ["R", "L", "U", "D", "F", "B"];
    let mc = [
      new Vector3D(0.9, 0, 0),
      new Vector3D(-0.9, 0, 0),
      new Vector3D(0, 0.9, 0),
      new Vector3D(0, -0.9, 0),
      new Vector3D(0, 0, 0.9),
      new Vector3D(0, 0, -0.9),
    ];

    let pos = mv.indexOf(m[0]);

    if (pos < 0) {
      return false;
    }

    let dir = m[1] === "'" ? 1 : -1;
    let u: any = mc[pos];
    let piece = this.cube.pieces.find(p => p.direction1(u, u) === 0 && p.stickers.length > 4);
    let sticker = piece?.stickers.find(s => s.vecs.length === 3);

    let data = this.dataFromGroup([piece, sticker], u, u, dir);
    data && this.prepareFromDrag(data);
    return true;
  }

  moveFromKeyboard(vec: Vector2) {
    if (this.animating || !this.enableKeyboard) return;

    let allStickers: Object3D[] = [];

    this.group.children.forEach((c: Object3D) => {
      allStickers.push(...c.children);
    });

    let mcm = new Vector3((this.mcx / this.W) * 2 - 1, -(this.mcy / this.H) * 2 + 1);

    let intersects = this.mouseIntersection(mcm.x, mcm.y, allStickers, this.camera);

    let piece = null;

    let pos;

    if (intersects.length > 0) {
      for (let i = 0, maxi = intersects.length; i < maxi; i += 1) {
        if ((<any>intersects[i].object).material.color.getHex()) {
          piece = intersects[i];
          pos = intersects[i].point;
        } else {
          break;
        }
      }

      this.controls.enabled = false;
    }

    if (!piece) return;

    let data = this.drag(piece, new Vector2(this.mcx, this.mcy), vec, this.camera);

    if (data && pos) {
      this.prepareFromDrag(data);
      this.setAnimationData();
      this.animating = true;
    }
  }

  moveHandler(event: MouseEvent) {
    event.preventDefault && event.preventDefault();

    this.mcx = event.clientX;
    this.mcy = event.clientY;

    if (!this.dragging && !this.rotating) {
      return;
    }

    let fin = new Vector2(event.clientX, event.clientY);
    let len = fin
      .clone()
      .sub(this.ini as Vector2)
      .length();

    let animation = this.animation;

    if (this.rotating && this.rotationData && animation) {
      let { animBuffer, angs } = animation;
      let vec = vectorsFromCamera([this.rotationData.u], this.camera)[0];
      let vNormal = new Vector2D(vec.x, vec.y).unit().mul(0.2);
      let dirNormal = new Vector2D(fin.x, fin.y).sub(new Vector2D(this.ini!.x, this.ini!.y));
      let dir = Vector2D.cross(vNormal, dirNormal) * this.rotationData.dir;
      let maxAng = Math.PI / (2 * angs.reduce((a, b) => Math.max(Math.abs(a), Math.abs(b)), 0));
      let factor = (dir * maxAng) / lagrange(this.distance);
      this.angleFactor = factor;

      let total = animBuffer.length;

      for (let i = 0; i < total; i += 1) {
        this.interpolate({ ...animation, u: this.rotationData.u }, i, this.angleFactor);
      }
    } else if (!this.rotating && this.piece && len > MOVE_THRESHOLD) {
      let data = this.drag(this.piece, this.ini as Vector2, fin, this.camera);

      if (data) {
        let anim = this.prepareFromDrag(data, false);
        this.rotationData = data;
        this.animation = anim;
        this.rotating = true;
      }

      this.dragging = false;
    }
  }

  downHandler(event: MouseEvent) {
    event.preventDefault && event.preventDefault();

    if (this.animating) {
      this.controls.enabled = false;
      return;
    }

    if (!this.enableDrag) {
      this.dragging = false;
      return;
    }

    this.dragging = true;
    this.rotating = false;
    this.rotationData = null;

    this.ini = new Vector2(event.clientX, event.clientY);
    this.iniM = new Vector3((event.clientX / this.W) * 2 - 1, -(event.clientY / this.H) * 2 + 1);

    let allStickers: Object3D[] = [];

    this.group.children.forEach((c: Object3D) => {
      allStickers.push(...c.children);
    });

    let intersects = this.mouseIntersection(this.iniM.x, this.iniM.y, allStickers, this.camera);

    this.piece = null;

    if (intersects.length > 0) {
      for (let i = 0, maxi = intersects.length; i < maxi; i += 1) {
        if ((<any>intersects[i].object).material.color.getHex()) {
          this.piece = intersects[i];
          this.controls.enabled = false;

          if (this.cube.type === "clock") {
            if (this.piece.object.userData.data.name === "pin") {
              let data = this.drag(this.piece, new Vector2(0, 0), new Vector2(1, 0), this.camera);

              if (data) {
                let anim = this.prepareFromDrag(data, false);
                let factor = event.ctrlKey ? 1 : -1;
                anim.angs = anim.angs.map(a => Math.abs(a) * factor);
                anim.timeIni = performance.now();
                anim.animationTimes = anim.animationTimes.map(_ => 0);
                this.animationQueue.push(anim);
              }

              this.piece = null;
              this.dragging = false;
            }

            return;
          }
        } else {
          break;
        }
      }
    }
  }

  upHandler() {
    if (this.rotating && this.rotationData && this.animation) {
      const N1 = Math.floor(this.angleFactor);
      const N2 = Math.ceil(this.angleFactor);
      let N = Math.abs(N1 - this.angleFactor) < Math.abs(N2 - this.angleFactor) ? N1 : N2;

      const { animBuffer, angs, userData, animationTimes, centers } = this.animation;

      let from1 = animBuffer.map((g: any[]) => g.map(e => e.matrixWorld.clone()));
      let u = this.rotationData.u.clone();

      this.animationQueue.push({
        animBuffer: animBuffer.map((objList, pos) =>
          objList.map(obj => {
            let data = obj.userData as UserData;

            if (data.anchor && data.data instanceof Piece) {
              let newAnchor = data.data.anchor.rotate(CENTER, u, angs[pos] * this.angleFactor);
              data.anchor.setCoords(newAnchor.x, newAnchor.y, newAnchor.z);
            }

            return obj;
          })
        ),
        angs: angs.map(a => a * (N - this.angleFactor)),
        animationTimes: animationTimes.map(t => (t * Math.abs(N - this.angleFactor)) / 0.5),
        from: from1,
        timeIni: performance.now(),
        u,
        userData,
        centers,
        ignoreUserData: true,
      });

      this.animation.u = u;
      this.animation.timeIni = performance.now();
      this.animation.animationTimes = this.animation.animationTimes.map(() => 0);
      this.animation.angs = this.animation.angs.map(ang => ang * N);
      this.animationQueue.push(this.animation);
      // this.setAnimationData();
    }

    this.dragging = false;
    this.rotating = false;
    this.controls.enabled = true;
    this.rotationData = null;
    this.animation = null;
  }

  prepareFromDrag(data: DragResult, push = true) {
    let animation: PuzzleAnimation = {
      animBuffer: data.buffer,
      userData: data.userData,
      centers: data.centers,
      u: data.u,
      angs: data.ang.map((a: number) => a * data.dir),
      from: data.buffer.map((g: any[]) => g.map(e => e.matrixWorld.clone())),
      animationTimes: data.animationTime.map((e: any) => e || this.animationTime),
      timeIni: performance.now(),
      ignoreUserData: false,
    };

    push && this.animationQueue.push(animation);

    return animation;
  }

  mouseIntersection(mx: number, my: number, arr: any[], camera: PerspectiveCamera): Intersection[] {
    let mouse = new Vector2(mx, my);
    let raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, camera);

    return raycaster.intersectObjects(arr).filter(e => {
      const object = e.object;
      const face = e.face;

      // Check visibility
      if (!object.visible || !face) {
        return false;
      }

      if (object.userData.data.nonInteractive) {
        return false;
      }

      const cameraDirection = new Vector3();
      camera.getWorldDirection(cameraDirection);

      // Get the normal matrix
      const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
      const faceNormal = face.normal.clone().applyMatrix3(normalMatrix).normalize();

      // If the dot product of the camera direction and face normal is greater than 0, it's a backface
      return cameraDirection.dot(faceNormal) < 0;
    });
  }

  resetCamera() {
    let pos = new Vector3D(0.68068, 0.34081, 0.6485).setLength(this.zoom);

    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  applyMove(m: string, t: number) {
    if (this.cube.type != "icarry" && this.cube.type != "rubik") return;
    this.moveQueue.push([m, t]);
  }

  resetPuzzle(facelet?: string, scramble = false, useScr = "") {
    let children = this.scene.children;
    this.scene.remove(...children);

    // Scene preparation

    let light = new PointLight("#ffffff", 3, 3, 1);
    light.position.set(0, 2, 0);
    light.castShadow = true;
    this.scene.add(light);

    // Puzzle setup
    if (facelet) {
      this.cube = Puzzle.fromFacelet(facelet, this.selectedPuzzle);
    } else {
      this.cube = Puzzle.fromSequence(useScr, {
        type: this.selectedPuzzle,
        view: "trans",
        order: Array.isArray(this.order) ? this.order : [this.order, this.order, this.order],
        mode: CubeMode.NORMAL,
      });

      scramble && this.cube.p.scramble && this.cube.p.scramble();
    }

    // @ts-ignore
    // window.cube = cube;

    let ctt = cubeToThree(this.cube);
    let bfc = piecesToTree(
      this.cube,
      1,
      (st: Sticker[]) => {
        if (this.cube.type === "clock") return [];
        return st
          .filter(s => this.cube.p.faceColors.indexOf(s.color) > -1 && !(s instanceof ImageSticker))
          .map(s =>
            s
              .reflect1(
                s.getMassCenter().add(s.getOrientation().mul(0.6)),
                s.getOrientation(),
                true
              )
              .mul(1.3)
          );
      },
      FrontSide
    );

    this.group = ctt.group;
    this.cube = ctt.nc;
    this.backFace = bfc.group;

    this.group.castShadow = true;

    this.scene.add(this.group);
    this.scene.add(this.backFace);

    this.group.rotation.x = 0;
    this.group.rotation.y = 0;
    this.group.rotation.z = 0;

    this.resetCamera();
  }

  keyDownHandler(e: KeyboardEvent) {
    if (!this.enableKeyboard) return;

    let mc = new Vector2(this.mcx, this.mcy);

    switch (e.code) {
      case "ArrowUp": {
        this.moveFromKeyboard(mc.add(new Vector2(0, -50)));
        break;
      }
      case "ArrowDown": {
        this.moveFromKeyboard(mc.add(new Vector2(0, 50)));
        break;
      }
      case "ArrowLeft": {
        this.moveFromKeyboard(mc.add(new Vector2(-50, 0)));
        break;
      }
      case "ArrowRight": {
        this.moveFromKeyboard(mc.add(new Vector2(50, 0)));
        break;
      }
      case "KeyS": {
        if (e.ctrlKey) {
          this.resetPuzzle(undefined, true);
        }
        break;
      }
    }
  }

  destroy() {
    this.renderer.domElement.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.controls.dispose();
  }
}
