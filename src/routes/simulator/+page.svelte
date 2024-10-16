<script lang="ts">
  import { getTitleMeta } from "$lib/meta/title";
  import Simulator from "$lib/simulator/Simulator.svelte";
  import { puzzleReg } from "@classes/puzzle/puzzleRegister";
  import { PuzzleTypeName, type PuzzleType } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let selectedPuzzle: PuzzleType = "rubik";
  let order = 3;
  let simulator: Simulator;

  function getTitle(n: string, p: PuzzleType, o: number) {
    let info = puzzleReg.get(p);

    if (info) {
      return [
        getTitleMeta($page.url.pathname, $localLang).title,
        ...(info.order ? [info.name + ` ${o}x${o}`] : [info.name]),
      ].join(" - ");
    }

    return n;
  }

  function updatePuzzle(loc: URL) {
    let paramMap = loc.searchParams;
    let p = paramMap.get("puzzle") || "";
    let o = parseInt(paramMap.get("order") || "3");

    if (PuzzleTypeName.indexOf(p as any) > -1 && p != selectedPuzzle) {
      selectedPuzzle = p as any;
    }

    if (order != Math.max(1, o)) {
      order = Math.max(1, o);
    }

    updateURL({
      detail: {
        puzzle: selectedPuzzle,
        order,
      },
    } as any);
  }

  function updateURL(ev: CustomEvent) {
    if (!browser) return;

    let p = ev.detail.puzzle;
    let o = ev.detail.order;
    let pInfo = puzzleReg.get(p);

    if (!pInfo) return;

    selectedPuzzle = p;
    order = o;

    if (pInfo.order) {
      goto($page.url.pathname + `/?puzzle=${p}&order=${o}`);
    } else {
      goto($page.url.pathname + `/?puzzle=${p}`);
    }
  }

  updatePuzzle($page.url);
</script>

<svelte:head>
  <title>{getTitle($localLang.HOME.simulator, selectedPuzzle, order)}</title>
</svelte:head>

<Simulator bind:this={simulator} {selectedPuzzle} {order} on:config={updateURL} />
