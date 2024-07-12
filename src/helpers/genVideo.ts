import { nameToPuzzle, type ITutorialAlg } from "@interfaces";
import { algorithmToPuzzle } from "./object";
import { Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Matrix4 } from "three";
import { CENTER, Vector3D } from "@classes/vector3d";
import { cubeToThree } from "./cubeToThree";
import type { Piece } from "@classes/puzzle/Piece";
import { parseReconstruction } from "./strings";
import { easeIn } from "./math";
import { Puzzle } from "@classes/puzzle/puzzle";
import { CubeMode } from "@constants";
import { FFmpegService } from "@stores/ffmpeg.service";
import { sha1 } from "object-hash";
import { DataService } from "@stores/data.service";

export async function genVideo(alg: ITutorialAlg, dims: number, FPS = 60): Promise<string | null> {
  const dataService = DataService.getInstance();
  const hash = sha1(alg);
  let res = await dataService.cacheGetVideo(hash);

  if (res) {
    console.log("FOUND in cache");
    let b = new Blob([res], { type: "video/mp4" });
    return URL.createObjectURL(b);
  }

  let scene = new Scene();
  let sequence = parseReconstruction(
    alg.scramble,
    nameToPuzzle(alg.puzzle || "333").type || "rubik",
    alg.order
  ).sequence;

  let cube = algorithmToPuzzle({ ...alg, scramble: "" }, false, false);

  let states: Matrix4[][] = [];
  let stateAngle: number[] = [];
  let stateCenter: Vector3D[] = [];
  let stateDir: Vector3D[] = [];
  let stateFilter: boolean[][] = [];

  let ctt = cubeToThree(cube);
  let group: Object3D = ctt.group;

  cube = ctt.nc;

  scene.add(group);

  group.rotation.x = 0;
  group.rotation.y = 0;
  group.rotation.z = 0;

  try {
    let nc = Puzzle.fromSequence("", {
      type: nameToPuzzle(alg.puzzle || "333").type || "rubik",
      view: "trans",
      order: [alg.order],
      mode: CubeMode.NORMAL,
    });

    let cubeIDs = cube.p.pieces.map(p => p.id);
    let ncIDs = nc.p.pieces.map(p => p.id);
    let idMap: Map<string, string> = new Map(ncIDs.map((id, pos) => [id, cubeIDs[pos]]));

    states.length = 0;
    stateAngle.length = 0;
    stateCenter.length = 0;
    stateDir.length = 0;
    stateFilter.length = 0;

    if (nc.p.applySequence) {
      let seq = nc.p.applySequence(sequence);

      let getMatrices = (data: Object3D[]) => {
        return data.map(d => d.matrixWorld.clone());
      };

      let allObjects = [...group.children];

      states.push(getMatrices(allObjects));

      for (let i = 0, maxi = seq.length; i < maxi; i += 1) {
        let s = seq[i];
        let nu = new Vector3(s.u.x, s.u.y, s.u.z).normalize();
        let ang = s.ang;
        let ids = s.pieces;
        let center = cube.p.center;
        let c = new Vector3(center.x, center.y, center.z);

        stateFilter.push(
          allObjects.map(d => {
            if (!ids.some(id => idMap.get(id) === (d.userData as Piece).id)) {
              return false;
            }
            // if (p.hasCallback) {
            //   p.callback(d, new Vector3(0, 0, 0), u, ang, true, Vector3);
            // } else {

            d.parent?.localToWorld(d.position);
            d.position.sub(c);
            d.position.applyAxisAngle(nu, ang);
            d.position.add(c);
            d.parent?.worldToLocal(d.position);
            d.rotateOnWorldAxis(nu, ang);
            d.updateMatrixWorld();

            // }

            return true;
          })
        );

        states.push(getMatrices(allObjects));
        stateAngle.push(ang);
        stateCenter.push(center.clone());
        stateDir.push(s.u.clone());
      }

      allObjects.forEach((d, idx) => {
        d.rotation.setFromRotationMatrix(states[0][idx]);
        d.position.setFromMatrixPosition(states[0][idx]);
      });

      stateAngle.push(0);
      stateCenter.push(CENTER);
      stateDir.push(CENTER);
      stateFilter.push([]);

      function handleAlpha(a: number) {
        if (a < 0 || a >= states.length) return;

        let id = ~~a;
        let alpha = easeIn(a - id);

        let state = states[id];
        let ang = stateAngle[id];
        let center = stateCenter[id];
        let u = stateDir[id];
        let filter = stateFilter[id];
        let c = new Vector3(center.x, center.y, center.z);
        let nu = new Vector3(u.x, u.y, u.z);

        allObjects.forEach((d, idx) => {
          d.rotation.setFromRotationMatrix(state[idx]);
          d.position.setFromMatrixPosition(state[idx]);

          if (!filter[idx]) return;

          d.parent?.localToWorld(d.position);
          d.position.sub(c);
          d.position.applyAxisAngle(nu, ang * alpha);
          d.position.add(c);
          d.parent?.worldToLocal(d.position);
          d.rotateOnWorldAxis(nu, ang * alpha);
        });
      }

      let canvas = document.createElement("canvas");
      canvas.width = dims;
      canvas.height = dims;

      let renderer = new WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        canvas,
      });

      renderer.setPixelRatio(window.devicePixelRatio);

      let camera = new PerspectiveCamera(40, 1, 0.1, 50);

      let pos = new Vector3D(0.68068, 0.34081, 0.6485).setLength(6);

      camera.position.set(pos.x, pos.y, pos.z);
      camera.rotation.set(0, 0, 0);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      let images: string[] = [];

      let maxAlpha = states.length - 1;
      const MD_DUR_MS = 600;
      const alphaConst = Math.ceil((FPS * MD_DUR_MS) / 1000);

      for (let i = 0, maxi = maxAlpha * alphaConst; i <= maxi; i += 1) {
        let a = i / alphaConst;
        handleAlpha(a);
        renderer.render(scene, camera);
        images.push(canvas.toDataURL("image/png"));
      }

      renderer.dispose();
      renderer.forceContextLoss();

      // CONVERT
      const ffmpeg = FFmpegService.getInstance();
      const result = await ffmpeg.generateVideo(images, FPS);
      result && (await dataService.cacheSaveVideo(hash, result.data));

      return result ? result.result : null;
    }

    return null;
  } catch (err) {
    console.log("ERROR: ", err);
  }

  return null;
}
