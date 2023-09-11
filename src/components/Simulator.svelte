<script lang="ts">
  import { Piece } from "@classes/puzzle/Piece";
  import { CENTER, Vector3D } from "@classes/vector3d";
  import { CubeMode } from "@constants";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import type { Language, PuzzleType } from "@interfaces";
  import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
  import { puzzleReg } from "@classes/puzzle/puzzleRegister";
  import { onDestroy, onMount } from "svelte";
  // @ts-ignore
  import SettingsIcon from '@icons/Settings.svelte';
  import Tooltip from "@components/material/Tooltip.svelte";
  import Modal from "@components/Modal.svelte";
  import Select from "@components/material/Select.svelte";
  import Button from "@components/material/Button.svelte";
  import Input from "@components/material/Input.svelte";
  import {
    Matrix4, Object3D, PerspectiveCamera, PointLight, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
    type Intersection,

    FrontSide

  } from "three";
  import { cubeToThree, piecesToTree } from "@helpers/cubeToThree";
  import { derived, type Readable } from "svelte/store";
  import { getLanguage } from "@lang/index";
  import { globalLang } from "@stores/language.service";
  import type { Sticker } from "@classes/puzzle/Sticker";
  import Checkbox from "./material/Checkbox.svelte";

  export let enableKeyboard = true;
  export let enableDrag = true;
  export let enableRotation = true;
  export let gui = true;
  export let contained = false;
  export let selectedPuzzle: PuzzleType = "rubik";
  export let order = 3;
  export let animationTime = 200; /// Default animation time: 200ms
  export let showBackFace = false;

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  let cube: Puzzle;
  // let scramble = "";
  let dragging = false;
  let group: Object3D = new Object3D();
  let backFace: Object3D = new Object3D();
  let W = 0;
  let H = 0;

  /// GUI
  let puzzles: any[] = [];
  let hasOrder = true;
  let GUIExpanded = false;

  /// Animation
  let animating = false;
  let timeIni: number;
  let animationTimes: number[] = [];
  let from: Matrix4[][] = [];
  let animBuffer: Object3D[][] = [];
  let userData: any[][];
  let u: Vector3D;
  let angs: number[];
  let animationQueue: any[] = [];
  let moveQueue: any[] = [];

  function vectorsFromCamera(vecs: any[], cam: PerspectiveCamera) {
    return vecs.map(e => {
      let vp = new Vector3(e.x, e.y, e.z).project(cam);
      return new Vector3D(vp.x, -vp.y, 0);
    });
  }

  function mouseIntersection(
    mx: number,
    my: number,
    arr: any[],
    camera: PerspectiveCamera
  ): Intersection[] {
    let mouse = new Vector2(mx, my);
    let raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(arr);
  }

  function dataFromGroup(pc: any, best: Vector3D, vv: Vector3D, dir: number) {
    let animationBuffer: Object3D[][] = [];
    let userData: any[][] = [];
    let angs: number[] = [];
    let animationTimes: number[] = [];

    let toMove = cube.p.toMove ? cube.p.toMove(pc[0], pc[1], best) : [];
    let groupToMove = Array.isArray(toMove) ? toMove : [toMove];

    let findPiece = (p: Piece, arr: Piece[]): boolean => {
      for (let i = 0, maxi = arr.length; i < maxi; i += 1) {
        if (arr[i].equal(p)) {
          return true;
        }
      }

      return false;
    };

    let u: any = best;

    groupToMove.forEach((g) => {
      if ( g.dir ) {
        let cr = vv.cross( vectorsFromCamera([g.dir], camera)[0] );
        dir = -Math.sign(cr.z);
        u = g.dir;
      }

      let pieces: Piece[] = g.pieces;
      let subBuffer: Object3D[] = [];
      let subUserData: any[] = [];
      let backV = showBackFace;

      group.children.forEach((p, pos) => {
        if (findPiece(<Piece>p.userData, pieces)) {
          subUserData.push(p.userData);
          subBuffer.push(p);

          if ( backV ) {
            subUserData.push(new Piece([]));
            subBuffer.push( backFace.children[pos] );
          }
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

  function drag(
    piece: Intersection,
    ini: Vector2,
    fin: Vector2,
    camera: PerspectiveCamera,
    vec3?: Vector3D
  ) {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    let pc = [piece.object.parent?.userData, piece.object.userData];
    let po = pc[1]?.getOrientation();
    let vecs: Vector3D[] = pc[1]?.vecs.filter((v: Vector3D) => v.cross(po).abs() > 1e-6);
    let v = fin.clone().sub(ini);
    let vv = vec3 || new Vector3D(v.x, v.y, 0);

    let faceVectors = vec3 ? vecs : vectorsFromCamera(vecs, camera);

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
    
    if ( best.x === 0 && best.y === 0 && best.z === 0 ) {
      return null;
    }

    return dataFromGroup(pc, best, vv, dir);
  }

  let renderer: WebGLRenderer;

  let scene = new Scene();
  let canvas: HTMLCanvasElement;

  let camera = new PerspectiveCamera( 40, 1, 0.1, 50);
  let controls: TrackballControls;

  function resetCamera() {
    camera.position.set(5.296722614625655, 2.6519943868108236, 5.045980364854634);
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function resetPuzzle(facelet?: string) {
    let children = scene.children;
    scene.remove(...children);

    if ( facelet ) {
      cube = Puzzle.fromFacelet(facelet);
    } else {
      cube = new Puzzle({
        type: selectedPuzzle,
        view: "trans",
        order: Array.isArray(order) ? order : [order, order, order],
        mode: CubeMode.NORMAL,
      });
    }

    let ctt = cubeToThree(cube);
    let bfc = piecesToTree(cube, 1, (st: Sticker[]) => {
      return st
        .filter( s => cube.p.faceColors.indexOf(s.color) > -1)
        .map(s => s
          .reflect1(s.getMassCenter().add( s.getOrientation().mul(0.6) ), s.getOrientation(), true)
          .mul(1.3)
        )
    }, FrontSide);

    group = ctt.group;
    cube = ctt.nc;
    backFace = bfc.group;

    scene.add(group);
    scene.add(backFace);

    group.rotation.x = 0;
    group.rotation.y = 0;
    group.rotation.z = 0;

    // let light = new HemisphereLight('#ffffff', '#000000', 0.5);
    let light = new PointLight("#ffffff", 1, 2, 3);
    light.position.set(2, 2, 2);

    scene.add(light);

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

  let piece: Intersection | null = null;
  let ini: Vector2 | null = null;
  let iniM = null;
  let mcx: number = 0, mcy: number = 0; // Mouse coordinates

  let downHandler = (event: MouseEvent) => {
    event.preventDefault && event.preventDefault();

    if (animating) {
      controls.enabled = false;
      return;
    }

    if ( !enableDrag ) {
      dragging = false;
      return;
    }

    dragging = true;

    ini = new Vector2(event.clientX, event.clientY);
    iniM = new Vector3(
      (event.clientX / W) * 2 - 1,
      -(event.clientY / H) * 2 + 1
    );

    let allStickers: Object3D[] = [];

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

  let prepareFromDrag = (data: any) => {
    animationQueue.push({
      animBuffer: data.buffer,
      userData: data.userData,
      u: data.u,
      angs: data.ang.map((a: number) => a * data.dir),
      from: data.buffer.map((g: any[]) => g.map((e) => e.matrixWorld.clone())),
      animationTimes: data.animationTime.map((e: any) => e || animationTime),
      timeIni: performance.now(),
    });
  };

  let moveHandler = (event: MouseEvent) => {
    event.preventDefault && event.preventDefault();

    mcx = event.clientX;
    mcy = event.clientY;

    if ( !dragging ) {
      return;
    }

    let fin = new Vector2(event.clientX, event.clientY);

    if (piece && fin.clone().sub(ini as Vector2).length() > 40) {
      let data: any = drag(piece, ini as Vector2, fin, camera);
      data && prepareFromDrag(data);
      dragging = false;
    }
  };

  let interpolate = (data: Object3D[], from: Matrix4[], ang: number, userData: Piece[]) => {
    let nu = new Vector3(u.x, u.y, u.z).normalize();
    let center = cube.p.center;
    let c = new Vector3(center.x, center.y, center.z);

    userData.forEach((p, idx) => {
      let d = data[idx];
      d.rotation.setFromRotationMatrix(from[idx]);
      d.position.setFromMatrixPosition(from[idx]);
      if (p.hasCallback) {
        p.callback(d, new Vector3(0, 0, 0), u, ang, true, Vector3);
      } else {
        d.parent?.localToWorld(d.position);
        d.position.sub(c);
        d.position.applyAxisAngle(nu, ang);
        d.position.add(c);
        d.parent?.worldToLocal(d.position);
        d.rotateOnWorldAxis(nu, ang);
      }
    });
  };

  let setAnimationData = () => {
    let anim = animationQueue[0];

    animBuffer = anim.animBuffer;
    userData = anim.userData;
    u = anim.u;
    angs = anim.angs;
    from = anim.from;
    animationTimes = anim.animationTimes;
    timeIni = anim.timeIni;
  };

  let addMove = (mov: any[]) => {
    let m = mov[0];
    animationTime = Math.min(100, mov[1] * 2 / 3);

    let mv = [ 'R', 'L', 'U', 'D', 'F', 'B' ];
    let mc = [
      new Vector3D(0.9, 0, 0),
      new Vector3D(-0.9, 0, 0),
      new Vector3D(0, 0.9, 0),
      new Vector3D(0, -0.9, 0),
      new Vector3D(0, 0, 0.9),
      new Vector3D(0, 0, -0.9),
    ];

    let pos = mv.indexOf( m[0] );

    if ( pos < 0 ) {
      console.log('Invalid move: ', m);
      return false;
    }

    let dir = m[1] === "'" ? 1 : -1;
    let u: any = mc[pos];
    let piece = cube.pieces.find(p => p.direction1(u, u, true) === 0 && p.stickers.length > 4);
    let sticker = piece?.stickers.find(s => s.vecs.length === 3);
    
    let data: any = dataFromGroup([ piece, sticker ], u, u, dir);
    data && prepareFromDrag(data);
    return true;
  };

  let render = () => {
    if ( !animating ) {
      if ( moveQueue.length ) {
        if ( addMove( moveQueue[0] ) ) {
          setAnimationData();
          animating = true;
        }
        
        moveQueue.shift();
      } else if ( animationQueue.length ) {
        setAnimationData();
        animating = true;
      }
    }

    if (animating) {
      let total = animBuffer.length;
      let anim = 0;
      let animLen = moveQueue.length;

      for (let i = 0; i < total; i += 1) {
        let animationTime = animationTimes[i];
        let alpha = (performance.now() - timeIni) / animationTime;
        
        if ( animLen ) {
          alpha = 2;
        }

        if (alpha > 1) {
          interpolate(animBuffer[i], from[i], angs[i], userData[i]);
          userData[i].forEach((p: Piece) => {
            if (p.hasCallback) {
              p.callback(p, cube.p.center, u, angs[i]);
            } else {
              p.rotate(cube.p.center, u, angs[i], true);
            }
          });
        } else {
          anim += 1;
          interpolate(animBuffer[i], from[i], angs[i] * alpha, userData[i]);
        }
      }

      if (anim === 0) {
        animationQueue.shift();
        animating = false;
      }
    }

    backFace.visible = showBackFace;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  
  let resizeHandler = () => {
    W = window.innerWidth;
    H = window.innerHeight;

    if ( contained && canvas?.parentElement ) {
      W = (canvas.parentElement as any).clientWidth;
      H = (canvas.parentElement as any).clientHeight;
    }

    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    controls.handleResize();
  };

  export function applyMove(m: string, t: number) {
    if ( cube.type != 'rubik' ) return;
    moveQueue.push( [m, t] );
  }

  export function fromFacelet(f: string) {
    resetPuzzle(f);
  }

  function moveFromKeyboard(vec: Vector2) {
    if ( animating || !enableKeyboard ) return;

    let allStickers: Object3D[] = [];

    group.children.forEach((c) => {
      allStickers.push(...c.children);
    });

    let mcm = new Vector3(
      (mcx / W) * 2 - 1,
      -(mcy / H) * 2 + 1
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

    let data: any = drag(piece, new Vector2(mcx, mcy), vec, camera);

    data && prepareFromDrag(data);

  }

  function keyDownHandler(e: KeyboardEvent) {
    let mc = new Vector2(mcx, mcy);
    switch(e.code) {
      case 'ArrowUp': {
        moveFromKeyboard(mc.add( new Vector2(0, -50) ));
        break;
      }
      case 'ArrowDown': {
        moveFromKeyboard(mc.add( new Vector2(0, 50) ));
        break;
      }
      case 'ArrowLeft': {
        moveFromKeyboard(mc.add( new Vector2(-50, 0) ));
        break;
      }
      case 'ArrowRight': {
        moveFromKeyboard(mc.add( new Vector2(50, 0) ));
        break;
      }
      case 'KeyS': {
        if ( e.ctrlKey ) {
          showGUI();
        }
        break;
      }
    }
  }

  onMount(() => {
    document.body.style.overflow = 'hidden';

    renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      canvas
    });

    renderer.setPixelRatio(window.devicePixelRatio);

    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    
    canvas.addEventListener("pointerdown", downHandler);
    canvas.addEventListener("pointerup", upHandler);
    canvas.addEventListener("pointermove", moveHandler);

    canvas.addEventListener("touchstart", (e) => downHandler(e.touches[0] as any), { passive: true });
    canvas.addEventListener("touchend", upHandler);
    canvas.addEventListener("touchmove", (e) => moveHandler(e.touches[0] as any), { passive: true });

    controls = new TrackballControls(camera, canvas);
    controls.rotateSpeed = 3;
    controls.noPan = true;
    controls.minDistance = 3;
    controls.maxDistance = 9;

    resetPuzzle();
    resizeHandler();
    render();

    setTimeout(resizeHandler, 1000);
  });

  onDestroy(() => {
    renderer.domElement.remove();
    renderer.dispose();
    controls.dispose();
    document.body.style.overflow = 'auto';
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

  $: controls && (controls.noRotate = !enableRotation);
</script>

<svelte:window on:resize={resizeHandler} on:keydown={ keyDownHandler }/>

<canvas bind:this={ canvas }/>

{#if gui}
  <Tooltip hasKeybinding text={ $localLang.SIMULATOR.settings + '[Ctrl + S]' } position="left"
    on:click={ showGUI }
    class="absolute right-4 text-gray-400 z-20 hover:text-gray-300 transition-all duration-100 cursor-pointer">
    <SettingsIcon width="1.2rem" height="1.2rem"/>
  </Tooltip>

  <Modal bind:show={ GUIExpanded }>
    <h1 class="text-3xl text-gray-300 text-center m-4">{ $localLang.SIMULATOR.puzzleSettings }</h1>
    <div class="grid grid-cols-2 gap-4 place-items-center text-gray-400">
      <span>{ $localLang.SIMULATOR.puzzle }</span>
      <Select
        items={puzzles} label={e => e.name} bind:value={ selectedPuzzle }
        onChange={ setOrder } class="text-gray-400 w-full max-w-[unset]"/>
        
      {#if hasOrder}
        <span>{ $localLang.SIMULATOR.order }</span>
        <Input type="number" min={1} bind:value={order} class="bg-white bg-opacity-10 text-gray-400"/>
      {/if}

      <span class="col-span-2">
        <Checkbox bind:checked={ showBackFace } label={ 'Show back face' }/> 
      </span>

      <Button on:click={ hideGUI }>{ $localLang.global.cancel }</Button>
      <Button
        class="bg-green-700 hover:bg-green-600 text-gray-300"
        on:click={ () => {resetPuzzle(); hideGUI(); }}>{ $localLang.SIMULATOR.setPuzzle }</Button>
    </div>
  </Modal>
{/if}