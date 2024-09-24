import { ImageSticker } from "@classes/puzzle/ImageSticker";
import { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import { Puzzle } from "@classes/puzzle/puzzle";
import { UP, Vector3D } from "@classes/vector3d";
import { CubeMode, EPS } from "@constants";
import { cubeToThree, piecesToTree } from "@helpers/cubeToThree";
import type { PuzzleType } from "@interfaces";
import {
  FrontSide,
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
  timeIni: number = 0;
  animationTimes: number[] = [];
  from: Matrix4[][] = [];
  animBuffer: Object3D[][] = [];
  userData: any[][] = [];
  u: Vector3D = UP.clone();
  angs: number[] = [];
  animationQueue: any[] = [];
  moveQueue: any[] = [];
  dragging = false;
  animating = false;
  enableKeyboard = false;
  enableDrag = false;
  showBackFace = false;

  constructor(config: ThreeJSAdaptorConfig) {
    this.enableKeyboard = config.enableKeyboard;
    this.enableDrag = config.enableDrag;
    this.selectedPuzzle = config.selectedPuzzle;
    this.order = config.order;
    this.animationTime = config.animationTime;
    this.showBackFace = config.showBackFace;
    this.zoom = config.zoom;

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
    this.canvas.addEventListener("pointermove", ev => this.moveHandler(ev));

    this.canvas.addEventListener("touchstart", e => this.downHandler(e.touches[0] as any), {
      passive: true,
    });
    this.canvas.addEventListener("touchend", () => this.upHandler());
    this.canvas.addEventListener("touchmove", e => this.moveHandler(e.touches[0] as any), {
      passive: true,
    });

    this.controls = new TrackballControls(this.camera, this.canvas);
    this.controls.rotateSpeed = 3;
    this.controls.noPan = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 12;
  }

  dataFromGroup(pc: any, best: Vector3D, vv: Vector3D, dir: number, fp = findPiece) {
    let animationBuffer: Object3D[][] = [];
    let userData: any[][] = [];
    let angs: number[] = [];
    let animationTimes: number[] = [];

    let toMove = this.cube.p.toMove ? this.cube.p.toMove(pc[0], pc[1], best) : [];
    let groupToMove = Array.isArray(toMove) ? toMove : [toMove];

    let u: any = best;

    groupToMove.forEach(g => {
      if ("dir" in g) {
        let cr = vv.cross(vectorsFromCamera([g.dir], this.camera)[0]);
        dir = -Math.sign(cr.z);
        u = g.dir;
      }

      let pieces: Piece[] = g.pieces;
      let subBuffer: Object3D[] = [];
      let subUserData: any[] = [];

      this.group.children.forEach((p: Object3D, pos: number) => {
        if (fp(<Piece>p.userData, pieces)) {
          subUserData.push(p.userData);
          subBuffer.push(p);

          subUserData.push(new Piece([]));
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
    };
  }

  drag(piece: Intersection, ini: Vector2, fin: Vector2, camera: PerspectiveCamera) {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    let pc = [piece.object.parent!.userData, piece.object.userData!];
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
    this.W = window.innerWidth;
    this.H = window.innerHeight;

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
      }
    }

    if (this.animating) {
      let total = this.animBuffer.length;
      let anim = 0;
      let animLen = this.moveQueue.length;

      for (let i = 0; i < total; i += 1) {
        let animationTime = this.animationTimes[i];
        let alpha = (performance.now() - this.timeIni) / animationTime;

        if (animLen) {
          alpha = 2;
        }

        if (alpha > 1) {
          this.interpolate(this.animBuffer[i], this.from[i], this.angs[i], this.userData[i]);
          this.userData[i].forEach((p: Piece) => {
            if (p.hasCallback) {
              p.callback(p, this.cube.p.center, this.u, this.angs[i]);
            } else {
              p.rotate(this.cube.p.center, this.u, this.angs[i], true);
            }
          });
        } else {
          anim += 1;
          this.interpolate(
            this.animBuffer[i],
            this.from[i],
            this.angs[i] * alpha,
            this.userData[i]
          );
        }
      }

      if (anim === 0) {
        this.animationQueue.shift();
        this.animating = false;
      }
    }

    this.backFace.visible = this.showBackFace;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
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
        if ((intersects[i].object.userData as Sticker).nonInteractive) {
          continue;
        }

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

    let data: any = this.drag(piece, new Vector2(this.mcx, this.mcy), vec, this.camera);

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

    if (!this.dragging) {
      return;
    }

    let fin = new Vector2(event.clientX, event.clientY);

    if (
      this.piece &&
      fin
        .clone()
        .sub(this.ini as Vector2)
        .length() > 40
    ) {
      let data: any = this.drag(this.piece, this.ini as Vector2, fin, this.camera);
      data && this.prepareFromDrag(data);
      this.dragging = false;
    }
  }

  interpolate(data: Object3D[], from: Matrix4[], ang: number, userData: Piece[]) {
    let nu = new Vector3(this.u.x, this.u.y, this.u.z).normalize();
    let center = this.cube.p.center;
    let c = new Vector3(center.x, center.y, center.z);

    userData.forEach((p, idx) => {
      let d = data[idx];
      d.rotation.setFromRotationMatrix(from[idx]);
      d.position.setFromMatrixPosition(from[idx]);
      if (p.hasCallback) {
        p.callback(d, new Vector3(0, 0, 0), this.u, ang, true, Vector3);
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
    let anim = this.animationQueue[0];

    this.animBuffer = anim.animBuffer;
    this.userData = anim.userData;
    this.u = anim.u;
    this.angs = anim.angs;
    this.from = anim.from;
    this.animationTimes = anim.animationTimes;
    this.timeIni = anim.timeIni;
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

    let data: any = this.dataFromGroup([piece, sticker], u, u, dir);
    data && this.prepareFromDrag(data);
    return true;
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
        if ((intersects[i].object.userData as Sticker).nonInteractive) {
          continue;
        }

        if ((<any>intersects[i].object).material.color.getHex()) {
          this.piece = intersects[i];
        } else {
          break;
        }
      }

      this.controls.enabled = false;
    }
  }

  upHandler() {
    this.dragging = false;
    this.controls.enabled = true;
  }

  prepareFromDrag(data: any, push = true) {
    let animation = {
      animBuffer: data.buffer,
      userData: data.userData,
      u: data.u,
      angs: data.ang.map((a: number) => a * data.dir),
      from: data.buffer.map((g: any[]) => g.map(e => e.matrixWorld.clone())),
      animationTimes: data.animationTime.map((e: any) => e || this.animationTime),
      timeIni: performance.now(),
    };

    push && this.animationQueue.push(animation);

    return animation;
  }

  mouseIntersection(mx: number, my: number, arr: any[], camera: PerspectiveCamera): Intersection[] {
    let mouse = new Vector2(mx, my);
    let raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(arr);
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
