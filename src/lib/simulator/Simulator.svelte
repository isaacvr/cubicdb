<script lang="ts">
  import { onMount } from "svelte";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import type { PuzzleType } from "@interfaces";
  import { screen } from "@stores/screen.store";
  import { ThreeJSAdaptor } from "$lib/simulator/adaptors/ThreeJSAdaptor";
  import { ControlAdaptor } from "$lib/simulator/adaptors/ControlAdaptor";
  import { CubeMode } from "@constants";
  import { browser } from "$app/environment";

  interface SimulatorProps {
    enableKeyboard?: boolean;
    enableDrag?: boolean;
    enableRotation?: boolean;
    contained?: boolean;
    selectedPuzzle?: PuzzleType;
    order?: number;
    animationTime?: number;
    showBackFace?: boolean;
    sequence?: string[];
    sequenceAlpha?: number;
    useScramble?: string;
    zoom?: number;
    controlled?: boolean;
    class?: string;
    movestart?: (...args: any[]) => void;
    moveend?: (...args: any[]) => void;
    solved?: (...args: any[]) => void;
  }

  function noop() {}

  let {
    enableKeyboard = $bindable(true),
    enableDrag = $bindable(true),
    enableRotation = $bindable(true),
    contained = $bindable(false),
    selectedPuzzle = $bindable("rubik"),
    order = $bindable(3),
    animationTime = $bindable($screen.isMobile ? 150 : 200),
    showBackFace = $bindable(false),
    sequence = $bindable([]),
    sequenceAlpha = $bindable(0),
    useScramble = $bindable(""),
    zoom = $bindable(12),
    controlled = $bindable(false),
    class: _cl = $bindable(""),
    movestart = $bindable(noop),
    moveend = $bindable(noop),
    solved = $bindable(noop),
  }: SimulatorProps = $props();

  let canvas: HTMLCanvasElement;
  let threeAdaptor: ThreeJSAdaptor;
  let controlAdaptor: ControlAdaptor;

  /// GUI
  let mounted = false;
  let lastS: string[] = [];
  let lastScr: string = "";

  export async function handleSequence(s: string[], scr: string) {
    lastS = s;
    lastScr = scr;

    if (!mounted) return;

    let nc: Puzzle;

    try {
      nc = Puzzle.fromSequence(lastScr, {
        type: selectedPuzzle,
        view: "trans",
        order: Array.isArray(order) ? order : [order, order, order],
        mode: CubeMode.NORMAL,
      });

      threeAdaptor.resetPuzzle("", false, lastScr);
      controlAdaptor.reset();

      if (nc.p.applySequence) {
        let seq = nc.p.applySequence(lastS);
        controlAdaptor.applySequence(nc, seq);
        sequenceAlpha = 0;
      }
    } catch (err) {
      console.log("ERROR: ", err);
    }
  }

  export function resetCamera() {
    threeAdaptor.resetCamera();
  }

  export function applyMove(m: string, t: number) {
    threeAdaptor.applyMove(m, t);
  }

  export function fromFacelet(f: string) {
    threeAdaptor.resetPuzzle(f);
  }

  export function resetPuzzle(p: PuzzleType, o: number, s: string) {
    threeAdaptor.selectedPuzzle = selectedPuzzle = p;
    threeAdaptor.order = order = o;
    threeAdaptor.resetPuzzle("", false, s);
  }

  export function scramble() {
    threeAdaptor.resetPuzzle(undefined, true);
  }

  export function handleResize() {
    if (contained) {
      threeAdaptor.resizeHandler(true);
    }
  }

  function keyDownHandler(e: KeyboardEvent) {
    if (!enableKeyboard) return;
    threeAdaptor.keyDownHandler(e, contained);
    switch (e.code) {
      case "KeyB": {
        if (e.ctrlKey) {
          showBackFace = !showBackFace;
        }
        break;
      }
    }
  }

  onMount(() => {
    mounted = true;

    threeAdaptor = new ThreeJSAdaptor({
      enableKeyboard,
      enableDrag,
      selectedPuzzle,
      order,
      animationTime,
      showBackFace,
      zoom,
      canvas,
    });

    threeAdaptor.on("move:start", movestart);
    threeAdaptor.on("move:end", () => moveend);
    threeAdaptor.on("solved", () => solved);

    controlAdaptor = new ControlAdaptor(threeAdaptor);

    handleSequence(sequence, useScramble);
    controlAdaptor.handleAlpha(sequenceAlpha, mounted);

    threeAdaptor.resizeHandler(contained);
    threeAdaptor.render();

    setTimeout(() => threeAdaptor.resizeHandler(contained), 1000);

    return () => {
      threeAdaptor?.destroy();
    };
  });

  $effect(() => (threeAdaptor.controls.noRotate = !enableRotation) as any);
  $effect(() => controlled && (handleSequence(sequence, useScramble) as any));
  $effect(() => controlled && (controlAdaptor.handleAlpha(sequenceAlpha, mounted) as any));
  $effect(() => (threeAdaptor.enableKeyboard = enableKeyboard) as any);
  $effect(() => (threeAdaptor.enableDrag = enableDrag) as any);
  $effect(() => (threeAdaptor.selectedPuzzle = selectedPuzzle) as any);
  $effect(() => (threeAdaptor.order = order) as any);
  $effect(() => (threeAdaptor.animationTime = animationTime) as any);
  $effect(() => (threeAdaptor.showBackFace = showBackFace) as any);
  $effect(() => threeAdaptor.setZoom(zoom));
</script>

<svelte:window
  on:resize={() => !contained && threeAdaptor.resizeHandler(false)}
  onkeydown={keyDownHandler}
/>

<canvas bind:this={canvas} class={_cl}></canvas>
