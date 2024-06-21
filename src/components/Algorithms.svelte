<script lang="ts">
  import { Link, navigate, useLocation } from "svelte-routing";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { CubeViewMap, type Algorithm, type ICard, type Solution } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import { copyToClipboard, getSearchParams, randomUUID } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import type { RouteLocation } from "svelte-routing/types/Route";
  import { screen } from "@stores/screen.store";
  import { Button, Input, Li, List, Range, Span, Spinner, Tooltip } from "flowbite-svelte";
  import { CubeDBICON, CubeMode, CubeModeMap } from "@constants";
  import { localLang } from "@stores/language.service";
  import { algorithmToPuzzle, clone } from "@helpers/object";

  import ViewListIcon from "@icons/ViewList.svelte";
  import ViewGridIcon from "@icons/Grid.svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import AddIcon from "@icons/Plus.svelte";
  import EditIcon from "@icons/Pencil.svelte";
  import { onMount } from "svelte";
  import PuzzleImage from "./PuzzleImage.svelte";
  import AlgorithmEditorModal from "@components/AlgorithmEditorModal.svelte";

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
  let currentList: Algorithm[] = [];
  let allowAlgAdmin = false;
  let currentAlg: Algorithm | null = null;

  // Modal
  let show = false;
  let isAdding = false;
  let sAlg: { alg: Algorithm; tutorial: false };
  let tipTemp: string[] = [];
  let solTemp: Solution[] = [];
  let img = "";

  function handleAlgorithms(list: Algorithm[]) {
    if (list.length === 0) return;

    type = 0;
    cards.length = 0;
    cases.length = 0;

    currentList = list;

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

    pGenerateCubeBundle(arr, 500, true, true, false, true)
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
    } else if (e.code === "KeyA" && e.ctrlKey) {
      // e.preventDefault();
      // allowAlgAdmin = !allowAlgAdmin;
      allowAlgAdmin = false;
    } else if (e.code === "KeyN" && e.ctrlKey && allowAlgAdmin) {
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

  async function renderSAlg() {
    sAlg.alg.tips = tipTemp.length ? tipTemp.join(", ").split(", ").map(Number) : [];

    if (solTemp.length) {
      sAlg.alg.solutions = clone(solTemp);
    }

    sAlg.alg._puzzle = algorithmToPuzzle(sAlg.alg, true);

    img = (await pGenerateCubeBundle([sAlg.alg._puzzle], 200, true))[0];
  }

  function saveAlgorithm() {
    // sAlg.alg.rotation = {
    //   x: rotation.x,
    //   y: rotation.y,
    //   z: rotation.z,
    // };

    (isAdding ? dataService.addAlgorithm(sAlg.alg) : dataService.updateAlgorithm(sAlg.alg)).then(
      alg => {
        let item = cases.find(a => a._id === alg._id);

        if (!item) {
          console.log("ITEM NOT FOUND: ", item);
        } else {
          let pos = cases.indexOf(item);
          alg._puzzle = algorithmToPuzzle(alg, true);

          pGenerateCubeBundle([alg._puzzle], 500, true, true)
            .then(_ => {
              cases[pos] = alg;
            })
            .catch(err => console.log("ERROR: ", err));
          // handleAlgorithms(currentList);
        }
        // updateCases($location, true)
      }
    );

    show = false;
  }

  function selectAlg(a: Algorithm) {
    sAlg = clone(a, ["_puzzle"]);

    sAlg.alg.tips = (sAlg.alg.tips || []).slice();
    show = true;

    tipTemp.length = 0;

    let { tips } = sAlg.alg;

    for (let i = 0, maxi = tips.length; i < maxi; i += 5) {
      tipTemp.push(tips.slice(i, i + 5).join(", "));
    }

    tipTemp = tipTemp;
    solTemp = sAlg.alg.solutions ? clone(sAlg.alg.solutions) : [];

    renderSAlg();
  }

  function addAlgorithm() {
    selectAlg({
      mode: CubeMode.L4E,
      name: "",
      order: currentAlg?.order || 3,
      ready: true,
      scramble: "",
      shortName: "",
      _id: "",
      group: "",
      // parentPath: "",
      view: "plan",
      // puzzle: "megaminx",

      parentPath: [currentAlg?.parentPath || "", currentAlg?.shortName || ""]
        .filter(e => e && e.trim())
        .join("/"),
      // view: currentAlg?.view || "plan",
      puzzle: currentAlg?.puzzle || "clock",
    });

    isAdding = true;
  }

  async function removeAlg(a: Algorithm) {
    await dataService.removeAlgorithm(a);
    updateCases($location, true);
  }

  function toArray(str: string, suff = "") {
    let arr = str.split("\n");
    let res = [];
    let toShortName = (s: string) =>
      s
        .toLowerCase()
        .replaceAll("+", "p")
        .replaceAll("-", "m")
        .replace(/[\s,]+/g, "_") + suff;

    const section = arr[0];

    // res.push({
    //   name: section,
    //   shortName: toShortName(section),
    //   parent: "skewb/l2l",
    //   scramble: "",
    // });

    for (let i = 1, maxi = arr.length; i < maxi; i += 1) {
      if (/^\d+$/i.test(arr[i])) {
        let name = arr[i];
        let sols = [];

        for (let j = i + 1; j < maxi; j += 1) {
          if (arr[j] === "") {
            i = j;
            break;
          }

          let s = arr[j];

          sols.push(s.replaceAll("S", "R' L R L'").replaceAll("H", "L R' L' R"));

          if (j + 1 === maxi) {
            i = j;
          }
        }

        res.push({
          name: section + " " + name,
          shortName: toShortName(section + " " + name),
          parent: "pyra/l4e",
          solutions: sols,
          scramble: sols[0],
        });
      }
    }

    return res.length === 1 ? [] : res;
  }

  onMount(() => {
    toArray(``, "").forEach((e, p) => {
      let alg: Algorithm = {
        mode: CubeMode.L4E,
        name: e.name,
        order: 3,
        ready: true,
        scramble: e.scramble,
        shortName: e.shortName,
        parentPath: e.parent,
        view: "plan",
        puzzle: "pyraminx",
        // rotation,
      };

      if (e.solutions) {
        alg.solutions = e.solutions.map(moves => ({ moves }));
      }

      console.log(alg);

      dataService.addAlgorithm(alg);
    });
  });

  $: updateCases($location);
</script>

<svelte:window on:keydown={handlekeyDown} />

<main class="container-mini">
  {#if allSolutions}
    <div>
      <h1 class="text-gray-300 text-3xl font-bold text-center">{selectedCase?.name}</h1>
      <button
        class={"flex mx-auto items-center justify-center transition-all duration-200 " +
          (imgExpanded ? "h-[min(20rem,100%)] w-[min(20rem,100%)]" : "h-40 w-40")}
        on:click={() => (imgExpanded = !imgExpanded)}
      >
        {#if selectedCase?._puzzle?.img}
          <PuzzleImage src={selectedCase._puzzle.img} />
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
      <ul class="cards w-full grid py-4">
        {#each cards as card, pos (card.route)}
          <Link to={card.route} class="flex w-full">
            <li
              class="w-full max-w-[12rem] h-48 shadow-md rounded-md select-none cursor-pointer card
            transition-all duration-200 grid place-items-center justify-center py-3 px-2
            bg-backgroundLv1 hover:shadow-2xl hover:shadow-primary-900 relative"
            >
              {#if card?.puzzle?.img}
                <PuzzleImage src={card.puzzle.img} />
              {:else}
                <Spinner size="10" color="yellow" class="m-auto" />
              {/if}

              <Span class="text-base">{card.title}</Span>

              {#if allowAlgAdmin}
                <ul class="absolute no-grid flex flex-col gap-2 justify-start top-0 left-0">
                  <Button
                    on:click={e => {
                      e.stopPropagation();
                      selectAlg(currentList[pos]);
                    }}
                    class="p-1"
                    ><EditIcon size="1.2rem" />
                  </Button>
                  <Button color="red" on:click={() => removeAlg(currentList[pos])} class="p-1"
                    ><DeleteIcon size="1.2rem" />
                  </Button>
                </ul>
              {/if}
            </li>
          </Link>
        {/each}
      </ul>
    {/if}

    <!-- Cases -->
    {#if type === 2 || type >= 4}
      <div class="cases grid" class:compact={!listView}>
        <div class="row">
          <span class="text-gray-300 font-bold">{$localLang.ALGORITHMS.case}</span>
          <span class="text-gray-300 font-bold"></span>
          <span class="text-gray-300 font-bold">{$localLang.ALGORITHMS.algorithms}</span>
        </div>

        {#each cases as c (c._id)}
          <div class="row min-h-[8rem] relative gap-2">
            <span class="font-bold text-center">{c.name}</span>
            <button
              class="img-btn flex items-center justify-center my-2"
              on:click={() => caseHandler(c)}
            >
              {#if c?._puzzle?.img}
                <PuzzleImage src={c._puzzle.img} glowOnHover />
              {:else}
                <Spinner size="10" color="white" />
              {/if}
            </button>

            <ul class="no-grid alg-list">
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

<AlgorithmEditorModal
  on:render={renderSAlg}
  on:save={saveAlgorithm}
  bind:alg={sAlg}
  bind:show
  bind:isAdding
  bind:tipTemp
  bind:img
  bind:solTemp
/>

<style lang="postcss">
  ul:not(.no-grid) {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-evenly;
    row-gap: 2rem;
    column-gap: 1rem;
  }

  :global(.cards > a) {
    flex: 0 0 calc(9rem);
  }

  .cases .row {
    @apply grid;
    grid-template-columns: 1fr 1fr 2fr;
    align-items: center;
  }

  .cases:not(.compact) .row:not(:nth-child(-n + 2)) {
    @apply border-0 border-t border-t-gray-400;
  }

  .cases.compact {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-evenly;
    row-gap: 2rem;
    column-gap: 1rem;
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
    flex: 0 0 calc(9rem);
  }

  .cases:not(.compact) .img-btn {
    @apply md:h-40 md:w-40 w-32 h-32;
  }

  .card {
    grid-template-rows: 10fr 1fr;
  }

  .alg-list {
    display: grid;
    gap: 0.5rem;
    justify-content: start;
  }

  .alg-list li:nth-child(n + 2) {
    @apply hidden sm:list-item;
  }

  .alg-list li:nth-child(n + 3) {
    @apply hidden md:list-item;
  }
</style>
