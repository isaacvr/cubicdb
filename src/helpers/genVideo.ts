import { nameToPuzzle, type ITutorialAlg } from "@interfaces";
import { algorithmToPuzzle } from "./object";
import { Object3D, Scene } from "three";
import { cubeToThree } from "./cubeToThree";
import { parseReconstruction } from "./strings";
import { Puzzle } from "@classes/puzzle/puzzle";
import { CubeMode } from "@constants";
import { FFmpegService } from "@stores/ffmpeg.service";
import { sha1 } from "object-hash";
import { DataService } from "@stores/data.service";
import { ThreeJSAdaptor } from "@pages/Simulator/adaptors/ThreeJSAdaptor";
import { ControlAdaptor } from "@pages/Simulator/adaptors/ControlAdaptor";

export async function genVideo(alg: ITutorialAlg, dims: number, FPS = 60): Promise<string | null> {
  const dataService = DataService.getInstance();
  const hash = sha1(alg);
  // let res = await dataService.cacheGetVideo(hash);

  // if (res) {
  //   console.log("FOUND in cache");
  //   let b = new Blob([res], { type: "video/mp4" });
  //   return URL.createObjectURL(b);
  // }

  let sequence = parseReconstruction(
    alg.scramble,
    nameToPuzzle(alg.puzzle || "333").type || "rubik",
    alg.order
  ).sequence;

  let cube = algorithmToPuzzle({ ...alg, scramble: "" }, false, false);

  try {
    let nc = Puzzle.fromSequence("", {
      type: nameToPuzzle(alg.puzzle || "333").type || "rubik",
      view: "trans",
      order: [alg.order],
      mode: CubeMode.NORMAL,
    });

    if (nc.p.applySequence) {
      let canvas = document.createElement("canvas");
      canvas.width = dims;
      canvas.height = dims;

      const threeAdaptor = new ThreeJSAdaptor({
        canvas,
        enableDrag: false,
        enableKeyboard: false,
        order: cube.order.a,
        animationTime: 200,
        selectedPuzzle: cube.type,
        showBackFace: false,
        zoom: 12,
      });

      const controlAdaptor = new ControlAdaptor(threeAdaptor);

      threeAdaptor.resetPuzzle("", false, "");
      controlAdaptor.reset();

      let seq = nc.p.applySequence(sequence);
      controlAdaptor.applySequence(nc, seq);

      let images: string[] = [];

      let maxAlpha = controlAdaptor.states.length - 1;
      const MD_DUR_MS = 600;
      const alphaConst = Math.ceil((FPS * MD_DUR_MS) / 1000);

      for (let i = 0, maxi = maxAlpha * alphaConst; i <= maxi; i += 1) {
        let a = i / alphaConst;
        controlAdaptor.handleAlpha(a, true);
        threeAdaptor.render();
        images.push(canvas.toDataURL("image/png"));
      }

      threeAdaptor.destroy();

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
