<script lang="ts">
  import { Link, navigate, useLocation } from "svelte-routing";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import {
    CubeViewMap,
    nameToPuzzle,
    type Algorithm,
    type ICard,
    type Solution,
  } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import { copyToClipboard, getSearchParams, randomUUID } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import type { RouteLocation } from "svelte-routing/types/Route";
  import { screen } from "@stores/screen.store";
  import { Button, Input, Li, List, Span, Spinner, Tooltip } from "flowbite-svelte";
  import { CubeDBICON, CubeMode, CubeModeMap } from "@constants";
  import { localLang } from "@stores/language.service";
  import { algorithmToPuzzle, clone } from "@helpers/object";
  import Modal from "./Modal.svelte";
  import Select from "./material/Select.svelte";

  import ViewListIcon from "@icons/ViewList.svelte";
  import ViewGridIcon from "@icons/Grid.svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import AddIcon from "@icons/Plus.svelte";
  import EditIcon from "@icons/Pencil.svelte";
  import { onMount } from "svelte";

  const location = useLocation();

  const dataService = DataService.getInstance();
  const notification = NotificationService.getInstance();

  let lastUrl: string = "";
  let cards: ICard[] = [];
  let cases: Algorithm[] = [];
  let type: number = 0;
  let selectedCase: Algorithm | null = null;
  let allSolutions = false;
  let imgExpanded = false;
  let listView = JSON.parse(localStorage.getItem("algs-list-view") || "true");
  const NUMBER_REG = /^[+-]?[\d]+(\.[\d]+)?$/;

  // Modal
  let show = false;
  let isAdding = false;
  let sAlg: Algorithm;
  let tipTemp: string[] = [];
  let solTemp: Solution[] = [];
  let img = "";
  let allowAlgAdmin = true;
  let currentAlg: Algorithm | null = null;

  function handleAlgorithms(list: Algorithm[]) {
    if (list.length === 0) return;

    type = 0;
    cards.length = 0;
    cases.length = 0;

    if (list.length > 0) {
      let hasSolutions = list.find(
        l => l.hasOwnProperty("solutions") && Array.isArray(l.solutions)
      );
      if (hasSolutions) {
        for (let i = 0, maxi = list.length; i < maxi; i += 1) {
          if (!list[i].hasOwnProperty("solutions")) {
            list[i].solutions = [
              {
                moves: list[i].scramble,
                votes: 0,
              },
            ];
          }
        }
        type = 2;
      }
    }

    list.sort(function (a, b): number {
      let A = a.name.split(" ").map(e => e.toLowerCase());
      let B = b.name.split(" ").map(e => e.toLowerCase());

      for (let i = 0, maxi = Math.min(A.length, B.length); i < maxi; i += 1) {
        if (A[i] != B[i]) {
          if (NUMBER_REG.test(A[i]) && NUMBER_REG.test(B[i])) {
            return parseInt(A[i]) - parseInt(B[i]);
          } else {
            return A[i] < B[i] ? -1 : 1;
          }
        }
      }

      return A.length < B.length ? -1 : 1;
    });

    let cubes = list.map(alg => algorithmToPuzzle(alg, true));

    for (let i = 0, maxi = list.length; i < maxi; i += 1) {
      let e = list[i];
      if (type < 2) {
        cards.push({
          title: e.name,
          cube: "",
          ready: false,
          route: "/algorithms" + (e.parentPath ? "/" + e.parentPath : "") + "/" + e.shortName,
          puzzle: cubes[i],
        });
      } else {
        e.cube = "";
        e.ready = false;
        e.parentPath = "/algorithms/" + e.parentPath;
        e._puzzle = cubes[i];
        cases.push(e);
      }
    }

    let arr: Puzzle[] =
      type < 2 ? cards.map(e => e.puzzle as Puzzle) : cases.map(e => e._puzzle as Puzzle);

    pGenerateCubeBundle(arr, 500, true, true)
      .then(_ => {
        cards = cards;
        cases = cases;
      })
      .catch(err => console.log("ERROR: ", err));
  }

  function toggleListView() {
    listView = !listView;
    localStorage.setItem("algs-list-view", listView);
  }

  function handlekeyDown(e: KeyboardEvent) {
    if (e.code === "Escape" && allSolutions) {
      navigate($location.pathname.split("?")[0]);
    }

    if (e.code === "KeyL" && e.ctrlKey && !allSolutions && (type === 2 || type >= 4)) {
      toggleListView();
    } else if ( e.code === "KeyA" && e.ctrlKey ) {
      e.preventDefault();
      allowAlgAdmin = !allowAlgAdmin;
    } else if ( e.code === "KeyN" && e.ctrlKey ) {
      addAlgorithm();
    }
  }

  async function updateCases(loc: RouteLocation, force = false) {
    if (!loc.pathname.startsWith("/algorithms")) return;

    let paramMap = getSearchParams(loc.search);

    let caseName = paramMap.get("case");
    let fCases = cases.filter(e => e.shortName === caseName);

    if (caseName && fCases.length) {
      selectedCase = fCases[0];
      allSolutions = true;
      imgExpanded = false;
    } else {
      allSolutions = false;
    }

    let p1 = loc.pathname.split("/").slice(2).join("/");

    if (force || p1 != lastUrl || !p1) {
      cards.length = 0;
      cases.length = 0;
      lastUrl = p1;

      handleAlgorithms(await dataService.getAlgorithms(p1));

      let parts = p1.split("/");
      let shortName = parts.pop() || "";

      currentAlg = await dataService.getAlgorithm(parts.join("/"), shortName);
      console.log(currentAlg);
    }
  }

  function caseHandler(c: Algorithm) {
    navigate(c.parentPath + "?case=" + c.shortName);
  }

  function toClipboard(s: string) {
    copyToClipboard(s).then(() => {
      notification.addNotification({
        key: randomUUID(),
        header: $localLang.global.done,
        text: $localLang.global.scrambleCopied,
        timeout: 1000,
        icon: CubeDBICON,
      });
    });
  }

  // Alg admin
  function addTip() {
    tipTemp = [...tipTemp, [0, 0, 0, 0, 0].join(", ")];
  }

  function addSolution() {
    solTemp = [...solTemp, { moves: "", votes: 0 }];
  }

  async function renderSAlg() {
    let args = nameToPuzzle(sAlg.puzzle || "");

    sAlg.tips = tipTemp.length ? tipTemp.join(", ").split(", ").map(Number) : [];

    if (solTemp.length) {
      sAlg.solutions = clone(solTemp);
    }

    sAlg._puzzle = Puzzle.fromSequence(
      (sAlg.scramble || "") + " z2",
      {
        type: args[0],
        order: args.slice(1, args.length),
        mode: sAlg.mode,
        view: sAlg.view,
        tips: sAlg.tips,
        rounded: true,
      },
      true
    );

    img = (await pGenerateCubeBundle([sAlg._puzzle], 200, true))[0];
  }

  function saveAlgorithm() {
    (isAdding ? dataService.addAlgorithm(sAlg) : dataService.updateAlgorithm(sAlg)).then(() =>
      updateCases($location, true)
    );

    show = false;
  }

  function selectAlg(a: Algorithm) {
    sAlg = clone(a, ["_puzzle"]);

    sAlg.tips = (sAlg.tips || []).slice();
    show = true;

    tipTemp.length = 0;

    let { tips } = sAlg;

    for (let i = 0, maxi = tips.length; i < maxi; i += 5) {
      tipTemp.push(tips.slice(i, i + 5).join(", "));
    }

    tipTemp = tipTemp;
    solTemp = sAlg.solutions ? clone(sAlg.solutions) : [];

    renderSAlg();
  }

  function addAlgorithm() {
    selectAlg({
      mode: currentAlg?.mode || CubeMode.NORMAL,
      name: "",
      order: currentAlg?.order || 3,
      ready: true,
      scramble: "",
      shortName: "",
      _id: "",
      group: "",
      parentPath: [currentAlg?.parentPath || "", currentAlg?.shortName || ""]
        .filter(e => e && e.trim())
        .join("/"),
      view: currentAlg?.view || "2d",
      puzzle: currentAlg?.puzzle || "333",
    });

    isAdding = true;
  }

  async function removeAlg(a: Algorithm) {
    await dataService.removeAlgorithm(a);
    updateCases($location, true);
  }

  onMount(() => {

  });

  $: updateCases($location);
</script>

<svelte:window on:keydown={handlekeyDown} />

<main class="container-mini">
  {#if allSolutions}
    <div>
      <h1 class="text-gray-300 text-3xl font-bold text-center">{selectedCase?.name}</h1>
      <button
        class="flex mx-auto items-center justify-center"
        on:click={() => (imgExpanded = !imgExpanded)}
      >
        {#if selectedCase?._puzzle?.img}
          <img
            src={selectedCase?._puzzle?.img}
            class="puzzle-img object-contain"
            class:expanded={imgExpanded}
            alt=""
          />
        {:else}
          <Spinner size="6" color="white" />
        {/if}
      </button>

      <div class="grid grid-cols-6">
        <h2 class="max-sm:hidden col-span-1 font-bold text-xl">&nbsp;</h2>
        <h2 class="max-sm:col-span-5 col-span-3 font-bold text-xl text-gray-300">
          {$localLang.ALGORITHMS.solution}
        </h2>
        <h2 class="max-sm:col-span-1 col-span-1 font-bold text-xl text-right text-gray-300">
          {$localLang.ALGORITHMS.moves}
        </h2>
        <h2 class="max-sm:hidden col-span-1 font-bold text-xl">&nbsp</h2>

        {#each selectedCase?.solutions || [] as sol, i}
          <span class="max-sm:hidden col-span-1"></span>

          <div class="flex mt-2 max-sm:col-span-5 col-span-3">
            <span class="w-6 pl-1 mr-2 text-right border-l-4 border-l-blue-500">{i + 1}:</span>
            <button
              role="link"
              tabindex="0"
              on:click={() => toClipboard(sol.moves)}
              class="cursor-pointer hover:text-gray-300 transition-all
              text-left duration-200 pl-2 underline underline-offset-4">{sol.moves}</button
            >
          </div>

          <Tooltip placement={$screen.isMobile ? "top" : "left"}>
            {$localLang.global.clickToCopy}
          </Tooltip>
          <span class="max-sm:col-span-1 col-span-1 mt-2 text-right"
            >{sol.moves.split(" ").length}</span
          >
          <span class="max-sm:hidden col-span-1"></span>
        {/each}
      </div>
    </div>
  {:else}
    <div
      class={"fixed right-2 grid gap-2 place-items-center z-10 " +
        ($screen.isMobile ? "bottom-16" : "top-16")}
    >
      {#if type === 2 || type >= 4}
        <Button
          id="list-view"
          color="purple"
          class={`grid place-items-center !p-0 cursor-pointer ` +
            ($screen.isMobile
              ? "w-12 h-12 !rounded-full shadow-xl border border-black"
              : "w-8 h-8")}
          on:click={toggleListView}
        >
          {#if listView}
            <ViewListIcon size="1.2rem" class="pointer-events-none" />
          {:else}
            <ViewGridIcon size="1.2rem" class="pointer-events-none" />
          {/if}
        </Button>
        <Tooltip reference="#list-view" placement="left" class="w-max">
          <div class="flex items-center gap-2">
            {$localLang.ALGORITHMS.toggleView}
            <div class="text-yellow-400">[Ctrl + L]</div>
          </div>
        </Tooltip>
      {/if}

      {#if allowAlgAdmin}
        <Button
          color="purple"
          class="grid place-items-center !p-0 cursor-pointer w-8 h-8"
          on:click={addAlgorithm}
        >
          <AddIcon size="1.2rem" />
        </Button>
      {/if}
    </div>

    <!-- Cards -->
    {#if type < 2}
      <List class="w-full grid py-4">
        {#each cards as card}
          <Link to={card.route} class="w-full">
            <Li
              class="max-w-[12rem] h-48 text-center shadow-md rounded-md select-none cursor-pointer
            transition-all duration-200 flex flex-col items-center justify-between py-3
            bg-backgroundLv1 hover:shadow-2xl hover:shadow-primary-900"
            >
              {#if card?.puzzle?.img}
                <img class="w-32 h-32 object-contain" src={card.puzzle.img} alt={card.title} />
              {:else}
                <Spinner size="10" color="yellow" class="m-auto" />
              {/if}

              <Span class="text-base">{card.title}</Span>
            </Li>
          </Link>
        {/each}
      </List>
    {/if}

    <!-- Cases -->
    {#if type === 2 || type >= 4}
      <div class="cases grid" class:compact={!listView}>
        <div class="row">
          <span class="text-gray-300 font-bold">{$localLang.ALGORITHMS.case}</span>
          <span class="text-gray-300 font-bold"></span>
          <span class="text-gray-300 font-bold">{$localLang.ALGORITHMS.algorithms}</span>
        </div>

        {#each cases as c}
          <div class="row min-h-[8rem] relative">
            <span class="font-bold">{c.name}</span>
            <button class="flex items-center justify-center" on:click={() => caseHandler(c)}>
              {#if c?._puzzle?.img}
                <img
                  class="puzzle-img transition-all duration-200 cursor-pointer object-contain"
                  src={c._puzzle.img}
                  alt=""
                />
              {:else}
                <Spinner size="10" color="white" />
              {/if}
            </button>

            <ul class="alg-list">
              {#each (c.solutions || []).slice(0, 4) as solution}
                <li class="algorithm">{solution.moves}</li>
              {/each}
            </ul>

            {#if allowAlgAdmin}
              <ul class="absolute no-grid flex flex-col gap-2 justify-start top-0 left-0">
                <Button on:click={() => selectAlg(c)} class="p-1"
                  ><EditIcon size="1.2rem" />
                </Button>
                <Button color="red" on:click={() => removeAlg(c)} class="p-1"
                  ><DeleteIcon size="1.2rem" />
                </Button>
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</main>

<Modal
  class="!overflow-auto"
  bind:show
  onClose={() => {
    show = false;
    isAdding = false;
  }}
>
  <div
    class="grid grid-cols-3 max-md:grid-cols-2 gap-4 place-items-center max-w-[50rem] max-h-[92vh] overflow-auto"
  >
    <section>
      Nombre: <Input bind:value={sAlg.name} />
    </section>
    <section>
      Nombre corto: <Input bind:value={sAlg.shortName} disabled={!isAdding} />
    </section>
    <section>
      Padre: <Input bind:value={sAlg.parentPath} />
    </section>
    <section>
      Orden: <Input bind:value={sAlg.order} type="number" />
    </section>
    <section>
      Scramble: <Input bind:value={sAlg.scramble} />
    </section>
    <section>
      Puzzle: <Input bind:value={sAlg.puzzle} />
    </section>
    <section>
      Modo <Select
        class="w-full"
        items={CubeModeMap}
        label={e => e[0]}
        transform={e => e[1]}
        bind:value={sAlg.mode}
      />
    </section>
    <section>
      Vista <Select
        class="w-full"
        items={CubeViewMap}
        label={e => e[1]}
        transform={e => e[0]}
        bind:value={sAlg.view}
      />
    </section>

    <section class="row-span-2">
      Tips:

      {#if tipTemp.length}
        <ul class="grid no-grid gap-2">
          {#each tipTemp as tip, pos}
            <li class="flex gap-2 items-center">
              <Input bind:value={tip} />
              <button
                tabindex="0"
                class="text-gray-400 w-8 h-8 cursor-pointer hover:text-red-500"
                on:click|stopPropagation={() => {
                  tipTemp = tipTemp.filter((_, p) => p != pos);
                }}
              >
                <DeleteIcon size="1.2rem" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <Button class="!bg-blue-700 text-gray-300 mt-4" on:click={addTip}>Añadir flecha</Button>
    </section>

    <section class="place-items-center">
      <img src={img} alt="" class="max-h-52" />
    </section>
    <section>
      Soluciones:

      {#if solTemp.length}
        <ul class="grid gap-2">
          {#each solTemp as solution, pos}
            <li class="flex gap-2 items-center">
              <Input bind:value={solution.moves} />
              <button
                tabindex="0"
                class="text-gray-400 w-8 h-8 cursor-pointer hover:text-red-500"
                on:click|stopPropagation={() => {
                  solTemp = solTemp.filter((_, p) => p != pos);
                }}
              >
                <DeleteIcon size="1.2rem" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <Button class="!bg-blue-700 text-gray-300 mt-4" on:click={addSolution}>Añadir solución</Button
      >
    </section>
    <section class="actions col-span-full">
      <Button class="text-gray-300 !bg-purple-700" on:click={renderSAlg}>Actualizar Imagen</Button>
      <Button class="text-gray-300 !bg-green-700" on:click={saveAlgorithm}>Guardar</Button>
    </section>
  </div>
</Modal>

<style lang="postcss">
  :global(ul:not(.no-grid)) {
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    row-gap: 2rem;
    column-gap: 1rem;
    grid-template-rows: max-content;
  }

  .cases .row {
    @apply grid;
    grid-template-columns: 1fr 1fr 2fr;
    align-items: center;
  }

  .cases:not(.compact) .row:not(:nth-child(-n + 2)) {
    @apply border-0 border-t border-t-gray-400;
  }

  .cases .row .puzzle-img:hover {
    filter: drop-shadow(0 0 1rem #1d4ed8);
  }

  .cases.compact {
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 1rem;
  }

  .cases.compact .row:first-child {
    display: none;
  }

  .cases.compact .row > span {
    @apply text-gray-300;
    grid-area: name;
  }

  .cases.compact .row > button {
    grid-area: img;
  }

  .cases.compact .row > ul.alg-list {
    display: none;
  }

  .cases.compact .row {
    @apply place-items-center px-2 rounded-md bg-backgroundLv1;
    grid-template-columns: 1fr;
    grid-template-areas:
      "img"
      "name";
  }

  .puzzle-img {
    cursor: pointer;
  }

  .puzzle-img.expanded {
    width: min(20rem, 100%);
    height: min(20rem, 100%);
  }
</style>
