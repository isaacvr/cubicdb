import { ImageSticker } from "@classes/puzzle/ImageSticker";
import { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import { Puzzle } from "@classes/puzzle/puzzle";
import { Vector2D } from "@classes/vector2-d";
import { CENTER, Vector3D } from "@classes/vector3d";
import { CubeMode, EPS } from "@constants";
import { cubeToThree, piecesToTree } from "@helpers/cubeToThree";
import { getLagrangeInterpolation, map } from "@helpers/math";
import type { PuzzleType, ToMoveResult } from "@interfaces";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  EquirectangularReflectionMapping,
  FrontSide,
  HemisphereLight,
  Matrix3,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Intersection,
} from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { browser } from "$app/environment";
import { dataService } from "$lib/data-services/data.service";
import { get } from "svelte/store";
import { Emitter } from "@classes/Emitter";

const textureLoader = new TextureLoader();
let texture: any = null;

if (browser) {
  if (get(dataService).isElectron) {
    texture = await textureLoader.loadAsync("/assets/textures/cube-texture.jpg");
  } else {
    texture = await textureLoader.loadAsync("/assets/textures/cube-texture2.jpg");
  }
  texture.mapping = EquirectangularReflectionMapping;
}

interface ThreeJSAdaptorConfig {
  canvas: HTMLCanvasElement;
  selectedPuzzle: PuzzleType;
  enableKeyboard: boolean;
  enableDrag: boolean;
  showBackFace: boolean;
  order: number;
  animationTime: number;
  zoom: number;
  renderer?: WebGLRenderer;
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
  onstart?: Function;
  onprogress?: Function;
  onend?: Function;
}

declare type ThreeJSAdaptorEvents = "move" | "move:start" | "move:end" | "solved";

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
    const vp = new Vector3(e.x, e.y, e.z).project(cam);
    return new Vector3D(vp.x, -vp.y, 0);
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
  cube: Puzzle | null = null;
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
  private destroyed = false;
  private emitter = new Emitter();

  constructor(config: ThreeJSAdaptorConfig) {
    this.enableKeyboard = config.enableKeyboard;
    this.enableDrag = config.enableDrag;
    this.selectedPuzzle = config.selectedPuzzle;
    this.order = config.order;
    this.animationTime = config.animationTime;
    this.showBackFace = config.showBackFace;
    this.zoom = config.zoom;
    this.distance = config.zoom;

    this.canvas = config.canvas;
    this.renderer =
      config.renderer ||
      new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        canvas: this.canvas,
      });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

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

  on(ev: ThreeJSAdaptorEvents, cb: (...args: any[]) => void) {
    this.emitter.on(ev, cb);
  }

  off(ev?: ThreeJSAdaptorEvents, cb?: (...args: any[]) => void) {
    this.emitter.off(ev, cb);
  }

  private emit(ev: ThreeJSAdaptorEvents, ...args: any[]) {
    this.emitter.emit(ev, ...args);
  }

  setZoom(z: number) {
    this.zoom = z;
    this.distance = z;
  }

  dataFromGroup(
    pc: any,
    best: Vector3D,
    vv: Vector3D,
    dir: number,
    fp = findPiece,
    tmResult: ToMoveResult | ToMoveResult[] | null = null
  ): DragResult | null {
    const animationBuffer: Object3D[][] = [];
    const userData: UserData[][] = [];
    const angs: number[] = [];
    const animationTimes: number[] = [];
    const centers: Vector3D[] = [];

    const toMove = tmResult || (this.cube?.p.toMove ? this.cube.p.toMove(pc[0], pc[1], best) : []);
    const groupToMove = Array.isArray(toMove) ? toMove : [toMove];

    let u: any = best;

    groupToMove.forEach(g => {
      if (g.pieces.length === 0) return;
      if ("dir" in g) {
        const cr = vv.cross(vectorsFromCamera([g.dir], this.camera)[0]);
        dir = -Math.sign(cr.z);
        u = g.dir;
      }

      if (g.center) {
        centers.push(g.center);
      } else {
        centers.push(this.cube?.p.center.clone() || CENTER);
      }

      const pieces: Piece[] = g.pieces;
      const subBuffer: Object3D[] = [];
      const subUserData: UserData[] = [];

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
      animationTimes.push(g.animationTime || NaN);
    });

    if (userData.length === 0) {
      return null;
    }

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

    const pc = [piece.object.parent!.userData.data, piece.object.userData.data!];
    const po = pc[1].getOrientation();
    const vecs: Vector3D[] = pc[1].vecs.filter((v: Vector3D) => v.cross(po).abs() > EPS);
    const v = fin.clone().sub(ini);
    const vv = new Vector3D(v.x, v.y, 0);

    const faceVectors = vectorsFromCamera(vecs, camera);

    let dir: number = 0;
    let best: Vector3D = new Vector3D(0, 0, 0);

    faceVectors.reduce((ac, fv, p) => {
      const cr = vv.cross(fv);
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
    const isElectron = get(dataService).isElectron;
    this.W = Math.min(window.innerWidth, window.screen.availWidth * (isElectron ? 2 : 1));
    this.H = Math.min(window.innerHeight, window.screen.availHeight * (isElectron ? 2 : 1));

    if (contained && this.canvas?.parentElement) {
      const parent = this.canvas.parentElement;
      this.W = parent.clientWidth;
      this.H = parent.clientHeight;
    }

    this.renderer.setSize(this.W, this.H);
    this.camera.aspect = this.W / this.H;
    this.camera.updateProjectionMatrix();
    this.controls.handleResize();
  }

  renderScene() {
    if (this.destroyed) return;
    this.backFace.visible = this.showBackFace;
    this.controls.update();
    this.distance = this.camera.position.distanceTo({ x: 0, y: 0, z: 0 });
    this.renderer.render(this.scene, this.camera);
  }

  render() {
    if (this.destroyed) return;

    if (!this.animating) {
      if (this.moveQueue.length) {
        if (this.addMove(this.moveQueue[0])) {
          this.setAnimationData();
          this.animating = true;
          this.currentAnimation?.onstart && this.currentAnimation.onstart();
        }

        this.moveQueue.shift();
      } else if (this.animationQueue.length > 0) {
        this.setAnimationData();
        this.animating = true;
        const { userData, ignoreUserData, onstart } = this.currentAnimation!;
        onstart && onstart();

        !ignoreUserData &&
          userData.forEach(dataList =>
            dataList.forEach(({ data, anchor }) => {
              if (data instanceof Piece && anchor && data.anchor.abs()) {
                const a = data.anchor;
                anchor.setCoords(a.x, a.y, a.z);
              }
            })
          );
      }
    }

    if (this.animating && this.currentAnimation) {
      const currAnim = this.currentAnimation;
      const total = currAnim.animBuffer.length;
      let anim = 0;
      const animLen = this.moveQueue.length;

      if (currAnim.onprogress) {
        const totalTime = currAnim.animationTimes.reduce((acc, e) => Math.max(acc, e), 0);
        const globalAlpha = (performance.now() - currAnim.timeIni) / totalTime;
        currAnim.onprogress && currAnim.onprogress(globalAlpha);
      }

      for (let i = 0; i < total; i += 1) {
        const animationTime = currAnim.animationTimes[i];
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

      // Animation ended
      if (anim === 0) {
        currAnim.onprogress && currAnim.onprogress(1);
        currAnim.onend && currAnim.onend();
        this.animationQueue.shift();
        this.animating = false;
      }
    }

    this.renderScene();
    requestAnimationFrame(() => this.render());
  }

  interpolate(animation: PuzzleAnimation, pos: number, alpha: number) {
    const { angs, animBuffer, from, u, userData, centers } = animation;

    const nu = new Vector3(u.x, u.y, u.z).normalize();
    const center = centers[pos];
    const c = new Vector3(center.x, center.y, center.z);
    const ang = angs[pos] * alpha;

    userData[pos].forEach((p, idx) => {
      const { data } = p;
      const d = animBuffer[pos][idx];
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

  addMoveNew(mov: any[]) {
    if (!this.cube || !this.cube.p.toMoveSeq) return false;

    this.animationTime = Math.min(100, (mov[1] * 2) / 3);

    let res = this.cube.p.toMoveSeq(mov[0]);

    res = (Array.isArray(res) ? res : [res]).filter(sq => sq.pieces.length);

    if (res.length === 0) return false;

    const data = this.dataFromGroup([null, null], res[0].dir, new Vector3D(), -1, findPiece, res);
    data && this.prepareFromDrag(data);

    return !!data;
  }

  addMove(mov: any[]) {
    const m = mov[0];
    const mv = ["R", "L", "U", "D", "F", "B"];
    const mc = [
      new Vector3D(0.9, 0, 0),
      new Vector3D(-0.9, 0, 0),
      new Vector3D(0, 0.9, 0),
      new Vector3D(0, -0.9, 0),
      new Vector3D(0, 0, 0.9),
      new Vector3D(0, 0, -0.9),
    ];

    const pos = mv.indexOf(m[0]);

    if (pos < 0) {
      return false;
    }

    const dir = m[1] === "'" ? 1 : -1;
    const u: any = mc[pos];
    const piece = this.cube!.pieces.find(p => p.direction1(u, u) === 0 && p.stickers.length > 4);
    const sticker = piece?.stickers.find(s => s.vecs.length === 3);

    const data = this.dataFromGroup([piece, sticker], u, u, dir);
    // data && this.prepareFromDrag(data);
    if (data) {
      const anim = this.prepareFromDrag(data);
      anim.onstart = () => {
        this.emit("move:start");
      };
      anim.onend = () => {
        this.emit("move:end");

        if (this.cube?.isComplete()) {
          this.emit("solved");
        }
      };
    }
    return true;
  }

  moveFromKeyboard(vec: Vector2, contained: boolean) {
    if (this.animating || !this.enableKeyboard) return;

    const allStickers: Object3D[] = [];

    this.group.children.forEach((c: Object3D) => {
      allStickers.push(...c.children);
    });

    let offsetX = 0;
    let offsetY = 0;

    if (contained && this.canvas?.parentElement) {
      const rec = this.canvas.parentElement.getBoundingClientRect();

      offsetX = rec.x;
      offsetY = rec.y;
    }

    const mcm = new Vector3(
      ((this.mcx - offsetX) / this.W) * 2 - 1,
      -((this.mcy - offsetY) / this.H) * 2 + 1
    );

    const intersects = this.mouseIntersection(mcm.x, mcm.y, allStickers, this.camera);

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

    const data = this.drag(piece, new Vector2(this.mcx, this.mcy), vec, this.camera);

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

    const fin = new Vector2(event.clientX, event.clientY);
    const len = fin
      .clone()
      .sub(this.ini as Vector2)
      .length();

    const animation = this.animation;

    if (this.rotating && this.rotationData && animation) {
      this.emit("move");
      const { animBuffer, angs } = animation;
      const vec = vectorsFromCamera([this.rotationData.u], this.camera)[0];
      const vNormal = new Vector2D(vec.x, vec.y).unit().mul(0.2);
      const dirNormal = new Vector2D(fin.x, fin.y).sub(new Vector2D(this.ini!.x, this.ini!.y));
      const dir = Vector2D.cross(vNormal, dirNormal) * this.rotationData.dir;
      const maxAng = Math.PI / (2 * angs.reduce((a, b) => Math.max(Math.abs(a), Math.abs(b)), 0));
      const factor = (dir * maxAng) / lagrange(this.distance);
      this.angleFactor = factor * (this.cube?.type === "clock" ? 3 : 1);

      const total = animBuffer.length;

      for (let i = 0; i < total; i += 1) {
        this.interpolate({ ...animation, u: this.rotationData.u }, i, this.angleFactor);
      }
    } else if (!this.rotating && this.piece && len > MOVE_THRESHOLD) {
      this.emit("move:start");
      const data = this.drag(this.piece, this.ini as Vector2, fin, this.camera);

      if (data) {
        const anim = this.prepareFromDrag(data, false);
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

    const rect = this.canvas.getBoundingClientRect();

    this.ini = new Vector2(event.clientX, event.clientY);
    this.iniM = new Vector3(
      map(event.clientX, rect.x, rect.x + rect.width, -1, 1),
      map(event.clientY, rect.y, rect.y + rect.height, 1, -1)
    );

    const allStickers: Object3D[] = [];

    this.group.children.forEach((c: Object3D) => {
      allStickers.push(...c.children);
    });

    const intersects = this.mouseIntersection(this.iniM.x, this.iniM.y, allStickers, this.camera);

    this.piece = null;

    if (intersects.length > 0) {
      for (let i = 0, maxi = intersects.length; i < maxi; i += 1) {
        if ((<any>intersects[i].object).material.color.getHex()) {
          this.piece = intersects[i];
          this.controls.enabled = false;

          if (this.cube?.type === "clock") {
            if (this.piece.object.userData.data.name === "pin") {
              const data = this.drag(this.piece, new Vector2(0, 0), new Vector2(1, 0), this.camera);

              if (data) {
                const anim = this.prepareFromDrag(data, false);
                const factor = event.ctrlKey ? 1 : -1;
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

          break;
        }
      }
    }
  }

  upHandler() {
    if (this.rotating && this.rotationData && this.animation) {
      const N1 = Math.floor(this.angleFactor);
      const N2 = Math.ceil(this.angleFactor);
      const N = Math.abs(N1 - this.angleFactor) < Math.abs(N2 - this.angleFactor) ? N1 : N2;

      const { animBuffer, angs, userData, animationTimes, centers } = this.animation;

      const from1 = animBuffer.map((g: any[]) => g.map(e => e.matrixWorld.clone()));
      const u = this.rotationData.u.clone();

      this.animationQueue.push({
        animBuffer: animBuffer.map((objList, pos) =>
          objList.map(obj => {
            const data = obj.userData as UserData;

            if (data.anchor && data.data instanceof Piece) {
              const newAnchor = data.data.anchor.rotate(CENTER, u, angs[pos] * this.angleFactor);
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
      this.animation.onend = () => {
        this.emit("move:end");

        if (this.cube?.isComplete()) {
          this.emit("solved");
        }
      };
    }

    this.dragging = false;
    this.rotating = false;
    this.controls.enabled = true;
    this.rotationData = null;
    this.animation = null;
  }

  prepareFromDrag(data: DragResult, push = true) {
    const animation: PuzzleAnimation = {
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
    const mouse = new Vector2(mx, my);
    const raycaster = new Raycaster();
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
    const pos = new Vector3D(0.68068, 0.34081, 0.6485).setLength(this.zoom);

    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  applyMove(m: string, t: number) {
    if (this.cube?.type != "icarry" && this.cube?.type != "rubik") return;
    this.moveQueue.push([m, t]);
  }

  resetScene() {
    const children = this.scene.children;
    this.scene.remove(...children);

    // Scene preparation
    const ambientLight = new AmbientLight(0xffffff, 1);
    this.scene.add(ambientLight);

    const hemisphereLight = new HemisphereLight(0xffffff, 0xffffff, 1);
    hemisphereLight.position.set(2, 0, 0);
    this.scene.add(hemisphereLight);

    const excludePuzzlesBF: PuzzleType[] = ["clock", "timemachine", "ghost"];

    const ctt = cubeToThree(this.cube!);
    const bfc = piecesToTree(
      this.cube!,
      1,
      (st: Sticker[]) => {
        if (excludePuzzlesBF.some(p => p === this.cube?.type)) return [];
        return st
          .filter(
            s => this.cube!.p.faceColors.indexOf(s.color) > -1 && !(s instanceof ImageSticker)
          )
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

    [ctt.meshes, bfc.meshes].forEach(m => {
      m.forEach(m => {
        const mats = (
          m.material instanceof Array ? m.material : [m.material]
        ) as MeshStandardMaterial[];

        mats.forEach(mt => {
          mt.envMap = texture;
          mt.envMapIntensity = 1;
        });
      });
    });

    this.group = ctt.group;
    this.cube = ctt.nc;
    this.backFace = bfc.group;

    this.group.castShadow = true;

    this.scene.add(this.group);
    this.scene.add(this.backFace);

    this.group.rotation.x = 0;
    this.group.rotation.y = 0;
    this.group.rotation.z = 0;
  }

  async resetPuzzle(facelet?: string, scramble = false, useScr = "") {
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

    this.resetScene();
    this.resetCamera();
  }

  keyDownHandler(e: KeyboardEvent, contained: boolean) {
    if (!this.enableKeyboard) return;

    const mc = new Vector2(this.mcx, this.mcy);

    switch (e.code) {
      case "ArrowUp": {
        this.moveFromKeyboard(mc.add(new Vector2(0, -50)), contained);
        break;
      }
      case "ArrowDown": {
        this.moveFromKeyboard(mc.add(new Vector2(0, 50)), contained);
        break;
      }
      case "ArrowLeft": {
        this.moveFromKeyboard(mc.add(new Vector2(-50, 0)), contained);
        break;
      }
      case "ArrowRight": {
        this.moveFromKeyboard(mc.add(new Vector2(50, 0)), contained);
        break;
      }
      case "KeyS": {
        if (e.ctrlKey) {
          this.resetPuzzle(undefined, true);
        }
        break;
      }
      case "KeyD": {
        if (e.ctrlKey) {
          this.resetPuzzle();
        }
        break;
      }
      default: {
        return;
      }
    }

    e.preventDefault();
  }

  destroy() {
    this.destroyed = true;
    this.renderer.domElement.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.controls.dispose();
    this.off();
  }
}
