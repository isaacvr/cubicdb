<script lang="ts">
  import { Puzzle } from "@classes/puzzle/puzzle";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { algorithmToPuzzle, clone } from "@helpers/object";
  import type { ITutorialAlg, ITutorialCubes } from "@interfaces";
  import { Button, Dropdown, DropdownItem, Input, Tooltip } from "flowbite-svelte";
  import AlgorithmEditorModal from "@components/AlgorithmEditorModal.svelte";
  import { CubeMode } from "@constants";

  import ArrowRight from "@icons/ArrowRight.svelte";
  import AddIcon from "@icons/Plus.svelte";
  import EditIcon from "@icons/Pencil.svelte";
  import DotsIcon from "@icons/DotsVertical.svelte";
  import RemoveIcon from "@icons/Delete.svelte";
  import PreviousIcon from "@icons/ChevronLeft.svelte";
  import NextIcon from "@icons/ChevronRight.svelte";
  import { createEventDispatcher } from "svelte";
  import Toggle from "@material/Toggle.svelte";
  import CubeVideo from "@components/CubeVideo.svelte";

  const dispatch = createEventDispatcher();

  export let block: ITutorialCubes;
  export let editMode = false;

  let images: string[] = [];
  let scrambles: string[] = [];
  let editing = false;
  let showDropdown = false;

  let tempAlgMode = false;
  let tempAnimated = false;
  let tempCubes: ITutorialAlg[] = [];
  let tempPreffix = "";
  let tempSuffix = "";
  let tempProgressive = false;

  const dropdownDefaultClass =
    "font-medium py-2 px-4 text-sm hover:bg-gray-600 flex items-center gap-2 justify-start";

  // Modal
  let show = false;
  let isAdding = false;
  let sAlg: { alg: ITutorialAlg; tutorial: true };
  let tipTemp: string[] = [];
  let img = "";
  let sPos = -1;
  let CubeActions = [
    [edit, EditIcon],
    [remove, RemoveIcon],
    [movePrev, PreviousIcon],
    [moveNext, NextIcon],
  ] as any;

  function updateTemp() {
    tempAlgMode = !!block.algMode;
    tempAnimated = !!block.animated;
    tempCubes = block.cubes.map(alg => <ITutorialAlg>clone(alg));
    tempPreffix = block.preffix || "";
    tempSuffix = block.suffix || "";
    tempProgressive = !!block.progressive;
  }

  updateTemp();

  function startEditing() {
    editing = true;
    showDropdown = false;
    updateTemp();
  }

  function save() {
    editing = false;
    block.algMode = tempAlgMode;
    block.cubes = tempCubes.map(alg => <ITutorialAlg>clone(alg));
    block.suffix = tempSuffix;
    block.preffix = tempPreffix;
    block.progressive = tempProgressive;
    block.animated = tempAnimated;
  }

  function newScramble(scramble: string) {
    let pref = editing ? tempPreffix : block.preffix || "";
    let suff = editing ? tempSuffix : block.suffix || "";
    let scr = [pref, scramble, suff].join(" ").trim();
    return scr;
  }

  function newAlg(alg: ITutorialAlg) {
    return { ...alg, scramble: newScramble(alg.scramble) };
  }

  function handleCubes(cb: ITutorialAlg[], progressive: boolean) {
    if (cb.length === 0) return;

    let cubes: Puzzle[] = [];

    scrambles.length = 0;

    if (progressive) {
      let alg = newAlg(cb[0]);
      let pz = algorithmToPuzzle(alg, false);
      let parts = (pz.options.sequence || "").split(" ");

      for (let i = 1, maxi = parts.length; i <= maxi; i += 1) {
        let a = { ...alg };
        a.scramble = parts.slice(0, i).join(" ");
        cubes.unshift(algorithmToPuzzle(a, false, false));
        scrambles.unshift(a.scramble);
      }
    } else {
      cubes = cb.map(alg => algorithmToPuzzle(newAlg(alg), false));
      scrambles = cubes.map(c => c.options.sequence || "");
    }

    scrambles = scrambles;

    setTimeout(() => {
      pGenerateCubeBundle(cubes, 500, true, false, false, true).then(res => {
        images = res;
      });
    }, 100);
  }

  function edit(pos: number) {
    sAlg = {
      alg: {
        mode: tempCubes[pos].mode,
        baseColor: tempCubes[pos].baseColor,
        order: tempCubes[pos].order,
        puzzle: tempCubes[pos].puzzle,
        rotation: tempCubes[pos].rotation,
        scramble: tempCubes[pos].scramble,
        tips: tempCubes[pos].tips,
        view: tempCubes[pos].view || "trans",
        solution: tempCubes[pos].solution || "",
      },
      tutorial: true,
    };

    sPos = pos;

    show = true;

    renderSAlg();
  }

  function remove(pos: number) {
    block.cubes = block.cubes.filter((_, p) => p != pos);
    images = images.filter((_, p) => p != pos);
  }

  function swap(a: number, b: number) {
    block.cubes = block.cubes.map((e, p) =>
      p === a ? block.cubes[b] : p === b ? block.cubes[a] : e
    );
  }

  function movePrev(pos: number) {
    if (pos > 0) {
      swap(pos, pos - 1);
    }
  }

  function moveNext(pos: number) {
    if (pos < block.cubes.length - 1) {
      swap(pos, pos + 1);
    }
  }

  async function renderSAlg() {
    sAlg.alg.tips = tipTemp.length ? tipTemp.join(", ").split(", ").map(Number) : [];

    img = (await pGenerateCubeBundle([algorithmToPuzzle(newAlg(sAlg.alg), false)], 300, true))[0];
  }

  function saveAlg() {
    let { alg } = sAlg;

    if (sPos === tempCubes.length) {
      tempCubes[sPos] = {
        mode: alg.mode,
        order: alg.order,
        puzzle: alg.puzzle,
        rotation: alg.rotation,
        scramble: alg.scramble,
        tips: alg.tips,
        view: alg.view,
        solution: alg.solution,
      };
    } else {
      tempCubes[sPos].mode = alg.mode;
      tempCubes[sPos].baseColor = alg.baseColor;
      tempCubes[sPos].order = alg.order;
      tempCubes[sPos].puzzle = alg.puzzle;
      tempCubes[sPos].rotation = alg.rotation;
      tempCubes[sPos].scramble = alg.scramble;
      tempCubes[sPos].tips = alg.tips;
      tempCubes[sPos].view = alg.view;
      tempCubes[sPos].solution = alg.solution;
    }

    tempCubes = tempCubes;

    show = false;
    sPos = -1;
    handleCubes(tempCubes, tempProgressive);
  }

  function addAlg() {
    sAlg = {
      alg: {
        mode: CubeMode.NORMAL,
        order: 3,
        puzzle: "333",
        scramble: "",
        tips: [],
        view: "trans",
        solution: "",
      },
      tutorial: true,
    };

    sPos = tempCubes.length;

    show = true;

    renderSAlg();
  }

  function removeCubes() {
    showDropdown = false;
    dispatch("delete");
  }

  $: editing
    ? handleCubes(tempCubes, tempProgressive)
    : handleCubes(block.cubes, !!block.progressive);
</script>

<div class="cubes-view relative" class:editMode>
  <ul class="cube-list" class:algMode={block.algMode || (editing && tempAlgMode)}>
    {#each images as img, pos (pos)}
      {#if block.progressive && pos}
        <ArrowRight />
      {/if}

      <li class="cube-item flex items-center gap-4">
        <div class="w-[8rem] h-[8rem] relative shrink-0">
          {#if editing}
            {#if tempAnimated}
              <CubeVideo cube={tempCubes[pos]} />
            {:else}
              <PuzzleImage src={img} />
            {/if}
          {:else if block.animated}
            <CubeVideo cube={block.cubes[pos]} />
          {:else}
            <PuzzleImage src={img} />
          {/if}

          {#if editMode && editing}
            <div class="actions absolute flex flex-col top-1 -left-3 z-10">
              {#each CubeActions as action}
                <Button
                  pill
                  color="alternative"
                  class="w-6 h-6 !p-1 border-none"
                  on:click={() => action[0](pos)}
                >
                  <svelte:component this={action[1]} size="1.2rem" />
                </Button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="description grid min-w-[5rem] tx-text">
          {#if editing}
            {tempCubes[pos]?.solution || tempCubes[pos]?.scramble || "-"}
          {:else}
            {block.cubes[pos]?.solution || block.cubes[pos]?.scramble || "-"}
          {/if}
        </div>
      </li>
    {/each}
  </ul>

  {#if editing}
    <div class="flex gap-2 justify-center items-center">
      <Toggle bind:checked={tempAlgMode} />
      <Tooltip>AlgMode</Tooltip>

      <Toggle bind:checked={tempAnimated} />
      <Tooltip>Animated</Tooltip>

      <Input bind:value={tempPreffix} placeholder="Preffix" class="max-w-[10rem]" />
      <Tooltip>Preffix</Tooltip>

      <Input bind:value={tempSuffix} placeholder="Suffix" class="max-w-[10rem]" />
      <Tooltip>Suffix</Tooltip>

      <Toggle bind:checked={tempProgressive} />
      <Tooltip>Progressive</Tooltip>
    </div>

    <div
      class="flex justify-center items-center gap-4 border border-gray-600 transition-all duration-200
        rounded-md p-2 w-min shadow-sm hover:shadow-lg hover:shadow-primary-800 shadow-primary-800 mx-auto"
    >
      <Button class="mx-auto" on:click={addAlg}><AddIcon size="1.2rem" /></Button>
      <Button color="alternative" on:click={() => (editing = false)}>Cancel</Button>
      <Button color="purple" on:click={save}>Save</Button>
    </div>
  {/if}

  {#if editMode}
    <div class="actions absolute top-3 left-1 -translate-x-full z-10">
      <Button
        pill
        color="alternative"
        class="w-8 h-8 !p-2 border-none absolute right-0 top-1/2 translate-y-[-50%]"
      >
        <DotsIcon size="1.2rem" class="text-green-400" />
      </Button>

      <Dropdown placement="right" class="z-50 relative" bind:open={showDropdown}>
        <DropdownItem defaultClass={dropdownDefaultClass} on:click={startEditing}>
          <EditIcon size="1.2rem" /> Edit
        </DropdownItem>

        <DropdownItem defaultClass={dropdownDefaultClass} on:click={removeCubes}>
          <RemoveIcon size="1.2rem" /> Delete
        </DropdownItem>
      </Dropdown>
    </div>
  {/if}
</div>

<AlgorithmEditorModal
  on:render={renderSAlg}
  on:save={saveAlg}
  bind:alg={sAlg}
  bind:show
  bind:isAdding
  bind:tipTemp
  bind:img
  solTemp={[]}
/>

<style lang="postcss">
  .cubes-view {
    @apply grid gap-2 my-8;
  }

  .cube-list {
    @apply flex flex-wrap gap-4 items-center justify-evenly;
  }

  .cube-list:not(.algMode) .cube-item .description {
    display: none;
  }

  .cube-list.algMode {
    @apply grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  }

  .cube-list.algMode .cube-item {
    @apply w-full p-2 border-2 rounded-md bg-opacity-10;
    color: var(--th-text);
    border-color: var(--th-backgroundLevel3);
    background-color: var(--th-backgroundLevel1);
  }
</style>
