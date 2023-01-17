<script lang="ts">
  import type { Piece } from "@classes/puzzle/Piece";
  import { Vector3D } from "@classes/vector3d";
  import { CubeMode } from "@constants";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import type { PuzzleType } from "@interfaces";
  import * as THREE from "three";
  import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
  import { puzzleReg } from "@classes/puzzle/puzzleRegister";
  import { cubeToThree } from "@helpers/cube-draw";
  import { onDestroy } from "svelte";
  import SettingsIcon from '@icons/Settings.svelte';
  import Tooltip from "@components/material/Tooltip.svelte";
  import Modal from "@components/Modal.svelte";
  import Select from "@components/material/Select.svelte";
  import Input from "@components/material/Input.svelte";
  import Button from "@components/material/Button.svelte";

  function mouseIntersection(
    mx: number,
    my: number,
    arr: any[],
    camera: THREE.PerspectiveCamera
  ): THREE.Intersection[] {
    let mouse = new THREE.Vector2(mx, my);
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(arr);
  }

  function drag(
    piece: THREE.Intersection,
    ini: THREE.Vector2,
    fin: THREE.Vector2,
    cube: Puzzle,
    group: THREE.Object3D,
    camera: THREE.PerspectiveCamera
  ) {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    let pc = [piece.object.parent.userData, piece.object.userData];
    let u = pc[1].getOrientation();
    let vecs = pc[1].vecs.filter((v) => v.cross(u).abs() > 1e-6);
    let v = fin.clone().sub(ini);
    let vv = new Vector3D(v.x, v.y, 0);

    let faceVectors = cube.p.vectorsFromCamera(vecs, camera, u);

    let dir: number;
    let best: Vector3D;

    faceVectors.reduce((ac, fv, p) => {
      let cr = vv.cross(fv);
      if (cr.abs() > ac) {
        best = vecs[p];
        dir = -Math.sign(cr.z);
        return cr.abs();
      }
      return ac;
    }, -Infinity);

    if (!best) {
      return null;
    }

    let animationBuffer: THREE.Object3D[][] = [];
    let userData: any[][] = [];
    let angs: number[] = [];
    let animationTimes: number[] = [];

    let toMove = cube.p.toMove(pc[0], pc[1], best);
    let groupToMove = Array.isArray(toMove) ? toMove : [toMove];

    let findPiece = (p: Piece, arr: Piece[]): boolean => {
      for (let i = 0, maxi = arr.length; i < maxi; i += 1) {
        if (arr[i].equal(p)) {
          return true;
        }
      }

      return false;
    };

    groupToMove.forEach((g) => {
      let pieces: Piece[] = g.pieces;
      let subBuffer: THREE.Object3D[] = [];
      let subUserData = [];

      group.children.forEach((p) => {
        if (findPiece(<Piece>p.userData, pieces)) {
          subUserData.push(p.userData);
          subBuffer.push(p);
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
      u: best,
      dir,
      ang: angs,
      animationTime: animationTimes,
    };
  }

  const ANIMATION_TIME = 200; /// Default animation time: 200ms

  let cube: Puzzle;
  let scramble = [
    "(-5,0)", "/", "(0,3)", "/", "(-3,0)", "/", "(5,-4)", "/", "(-3,0)",
    "/", "(3,0)", "/", "(-2,0)", "/", "(-3,-3)", "/", "(1,0)", "/", "(-2,0)",
    "/", "(-4,-2)", "/", "(0,-2)", "/", "(0,-3)", "/", "(3,0)"].join(" ");
  // let scramble = "";
  let dragging = false;
  let group: THREE.Object3D;

  /// GUI
  let puzzles: any[] = [];
  let selectedPuzzle: PuzzleType = "square1";
  let order = 3;
  let hasOrder = false;
  let GUIExpanded = false;

  /// Animation
  let animating = false;
  let timeIni: number;
  let animationTimes: number[] = [];
  let from: THREE.Matrix4[][] = [];
  let animBuffer: THREE.Object3D[][] = [];
  let userData: any[][];
  let u: Vector3D;
  let angs: number[];

  let renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  let scene = new THREE.Scene();
  let geo = new THREE.PlaneBufferGeometry(4, 4, 3, 3);
  let mat = new THREE.MeshBasicMaterial({ color: '0xffffff', side: THREE.DoubleSide });
  let plane = new THREE.Mesh(geo, mat);
  
  scene.add(plane);

  let canvas = renderer.domElement;

  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";

  let camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 14);
  let controls = new TrackballControls(camera, canvas);
  controls.rotateSpeed = 3;
  controls.noPan = true;
  controls.minDistance = 2;
  controls.maxDistance = 9;

  function resetCamera() {
    camera.position.set(5.296722614625655, 2.6519943868108236, 5.045980364854634);
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function resetPuzzle(sc?: boolean) {
    let children = scene.children;
    scene.remove(...children);

    cube = Puzzle.fromSequence(scramble, {
      type: selectedPuzzle,
      view: "trans",
      order: [order, order, order],
      mode: CubeMode.NORMAL,
    });

    if (sc && cube.p.scramble) {
      cube.p.scramble();
    }

    let ctt = cubeToThree(cube);
    group = ctt.group;
    cube = ctt.nc;

    scene.add(group);

    // let light = new THREE.HemisphereLight('#ffffff', '#000000', 0.5);
    let light = new THREE.PointLight("#ffffff", 1, 2, 3);
    light.position.set(2, 2, 2);

    scene.add(light);

    group.rotation.x = 0;
    group.rotation.y = 0;
    group.rotation.z = 0;

    resetCamera();
  }

  for (let [key, value] of puzzleReg) {
    if (key != "clock") {
      puzzles.push({
        name: value.name,
        value: key,
        order: value.order,
      });
    }
  }
  
  resetPuzzle();

  let piece: THREE.Intersection = null;
  let ini = null;
  let iniM = null;
  let mcx, mcy; // Mouse coordinates

  let downHandler = (event) => {
    event.preventDefault && event.preventDefault();

    if (animating) {
      controls.enabled = false;
      return;
    }

    dragging = true;

    ini = new THREE.Vector2(event.clientX, event.clientY);
    iniM = new THREE.Vector3(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    let allStickers = [];

    group.children.forEach((c) => {
      allStickers.push(...c.children);
    });

    let intersects = mouseIntersection(iniM.x, iniM.y, allStickers, camera);

    piece = null;

    if (intersects.length > 0) {
      if ((<any>intersects[0].object).material.color.getHex()) {
        piece = intersects[0];
      }
      controls.enabled = false;
    }
  };

  let upHandler = () => {
    dragging = false;
    controls.enabled = true;
  };

  let moveHandler = (event) => {
    event.preventDefault && event.preventDefault();

    mcx = event.clientX;
    mcy = event.clientY;

    if (!dragging) {
      return;
    }

    let fin = new THREE.Vector2(event.clientX, event.clientY);

    if (piece && fin.clone().sub(ini).length() > 40) {
      let data = drag(piece, ini, fin, cube, group, camera);

      if (data) {
        animBuffer = data.buffer;
        userData = data.userData;
        u = data.u;
        angs = data.ang.map((a) => a * data.dir);
        from = animBuffer.map((g) => g.map((e) => e.matrixWorld.clone()));
        animationTimes = data.animationTime.map((e) => e || ANIMATION_TIME);
        animating = true;
        timeIni = performance.now();
      }

      dragging = false;
    }
  };

  canvas.addEventListener("pointerdown", downHandler);
  canvas.addEventListener("pointerup", upHandler);
  canvas.addEventListener("pointermove", moveHandler);

  canvas.addEventListener("touchstart", (e) => downHandler(e.touches[0]), { passive: true });
  canvas.addEventListener("touchend", upHandler);
  canvas.addEventListener("touchmove", (e) => moveHandler(e.touches[0]), { passive: true });
  document.body.appendChild(canvas);

  let interpolate = (data: THREE.Object3D[], from: THREE.Matrix4[], ang: number, userData: Piece[]) => {
    let nu = new THREE.Vector3(u.x, u.y, u.z).normalize();
    let center = cube.p.center;
    let c = new THREE.Vector3(center.x, center.y, center.z);

    userData.forEach((p, idx) => {
      let d = data[idx];
      d.rotation.setFromRotationMatrix(from[idx]);
      d.position.setFromMatrixPosition(from[idx]);
      if (p.hasCallback) {
        p.callback(d, new THREE.Vector3(0, 0, 0), u, ang, true);
      } else {
        d.parent.localToWorld(d.position);
        d.position.sub(c);
        d.position.applyAxisAngle(nu, ang);
        d.position.add(c);
        d.parent.worldToLocal(d.position);
        d.rotateOnWorldAxis(nu, ang);
      }
    });
  };

  let render = () => {
    if (animating) {
      let total = animBuffer.length;
      let done = animBuffer.map((e) => false);
      let anim = 0;

      for (let i = 0; i < total; i += 1) {
        if (done[i]) {
          continue;
        }
        let animationTime = animationTimes[i];
        let alpha = (performance.now() - timeIni) / animationTime;
        if (alpha > 1) {
          interpolate(animBuffer[i], from[i], angs[i], userData[i]);
          userData[i].forEach((p: Piece) => {
            if (p.hasCallback) {
              p.callback(p, cube.p.center, u, angs[i]);
            } else {
              p.rotate(cube.p.center, u, angs[i], true);
            }
          });
          userData[i].length = 0;
          animBuffer[i].length = 0;
          from[i].length = 0;
          done[i] = true;
        } else {
          anim += 1;
          interpolate(animBuffer[i], from[i], angs[i] * alpha, userData[i]);
        }
      }

      if (anim === 0) {
        animating = false;
      }
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  render();
  
  let resizeHandler = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    controls.handleResize();
  };

  resizeHandler();

  function moveFromKeyboard(vec: THREE.Vector2) {
    if ( animating ) return;

    let allStickers = [];

    group.children.forEach((c) => {
      allStickers.push(...c.children);
    });

    let mcm = new THREE.Vector3(
      (mcx / window.innerWidth) * 2 - 1,
      -(mcy / window.innerHeight) * 2 + 1
    );

    let intersects = mouseIntersection(mcm.x, mcm.y, allStickers, camera);

    piece = null;

    if (intersects.length > 0) {
      if ((<any>intersects[0].object).material.color.getHex()) {
        piece = intersects[0];
      }
      controls.enabled = false;
    }

    if ( !piece ) return;

    let data = drag(piece, new THREE.Vector2(mcx, mcy), vec, cube, group, camera);

    if (data) {
      animBuffer = data.buffer;
      userData = data.userData;
      u = data.u;
      angs = data.ang.map((a) => a * data.dir);
      from = animBuffer.map((g) => g.map((e) => e.matrixWorld.clone()));
      animationTimes = data.animationTime.map((e) => e || ANIMATION_TIME);
      animating = true;
      timeIni = performance.now();
    }

  }

  function keyDownHandler(e: KeyboardEvent) {
    let mc = new THREE.Vector2(mcx, mcy);
    switch(e.code) {
      case 'ArrowUp': {
        moveFromKeyboard(mc.add( new THREE.Vector2(0, -50) ));
        break;
      }
      case 'ArrowDown': {
        moveFromKeyboard(mc.add( new THREE.Vector2(0, 50) ));
        break;
      }
      case 'ArrowLeft': {
        moveFromKeyboard(mc.add( new THREE.Vector2(-50, 0) ));
        break;
      }
      case 'ArrowRight': {
        moveFromKeyboard(mc.add( new THREE.Vector2(50, 0) ));
        break;
      }
    }
  }

  let img = '';

  onDestroy(() => {
    renderer.domElement.remove();
    renderer.dispose();
  });

  /// GUI
  function setOrder() {
    hasOrder = puzzles.find((p) => p.value === selectedPuzzle).order;
  }

  function hideGUI() {
    GUIExpanded = false;
  }

  function showGUI() {
    GUIExpanded = true;
  }
</script>

<svelte:window on:resize={resizeHandler} on:keydown={ keyDownHandler }/>

<img src={img} alt="">

<Tooltip text="Settings [S]" position="left"
  on:click={ showGUI }
  class="absolute right-4 text-gray-400 z-20 hover:text-gray-300 transition-all duration-100 cursor-pointer">
  <SettingsIcon width="1.2rem" height="1.2rem"/>
</Tooltip>

<Modal bind:show={ GUIExpanded }>
  <h1 class="text-3xl text-gray-300 text-center m-4">Puzzle settings</h1>
  <div class="grid grid-cols-2 gap-4 place-items-center text-gray-400">
    <span>Puzzle</span>
    <Select
      items={puzzles} label={e => e.name} bind:value={ selectedPuzzle }
      onChange={ setOrder } class="text-gray-400 w-full max-w-[unset]"/>
      
    {#if hasOrder}
      <span>Order</span>
      <Input type="number" min={1} bind:value={order} class="bg-white bg-opacity-10 text-gray-400"/>
    {/if}

    <Button on:click={ hideGUI }>Cancel</Button>
    <Button
      class="bg-green-700 hover:bg-green-600 text-gray-300"
      on:click={ () => {resetPuzzle(); hideGUI(); }}>Set puzzle</Button>
  </div>
</Modal>

<!-- <table class="cnt" [class.expanded]="GUIExpanded">
  <tr>
    <td>Puzzle</td>
    <td>
      <mat-select [(value)]="selectedPuzzle" (selectionChange)="setOrder()">
        <mat-option *ngFor="let p of puzzles" [value]="p.value">{{p.name}}</mat-option>
      </mat-select>
    </td>
  </tr>
  <tr>
    <td>Order</td>
    <td>
      <mat-form-field>
        <input [disabled]="!hasOrder" matInput [(ngModel)]="order" type="number" min="1" value="3">
      </mat-form-field>
    </td>
  </tr>
  <tr>
    <td><button mat-stroked-button (click)="resetPuzzle()">Set</button></td>
    <td><button mat-stroked-button (click)="resetPuzzle(true)">Scramble</button></td>
    <td><button mat-stroked-button (click)="hideGUI()">Done</button></td>
  </tr>
  <tr class="tune"><td colspan="2"> <mat-icon (click)="showGUI()" svgIcon="tune"></mat-icon> </td></tr>
</table> -->