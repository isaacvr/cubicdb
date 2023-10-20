<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Link, navigate, useLocation } from "svelte-routing";
  import { derived, type Readable, type Unsubscriber } from "svelte/store";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { generateCubeBundle } from "@helpers/cube-draw";
  import { nameToPuzzle, type Algorithm, type Card, type Language } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import Tooltip from "./material/Tooltip.svelte";
  import { copyToClipboard, getSearchParams, randomUUID } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import type { RouteLocation } from "svelte-routing/types/Route";
  import ViewListIcon from '@icons/ViewList.svelte';
  import ViewGridIcon from '@icons/Grid.svelte';
  import Button from "./material/Button.svelte";
  import { sha1 } from "object-hash";

  const location = useLocation();
  
  let localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
    set( getLanguage( $lang ) );
  });

  const dataService = DataService.getInstance();
  const notification = NotificationService.getInstance();

  let lastUrl: string = '';
  let cards: Card[] = [];
  let cases: Algorithm[] = [];
  let type: number = 0;
  let selectedCase: Algorithm | null = null;
  let allSolutions = false;
  let imgExpanded = false;
  let listView = JSON.parse(localStorage.getItem('algs-list-view') || 'true');

  function handleAlgorithms(list: Algorithm[]) {
    if ( list.length === 0 ) return;

    type = 0;
    cards.length = 0;
    cases.length = 0;


    if ( list.length > 0 ) {
      let hasSolutions = list.find(l => l.hasOwnProperty('solutions') && Array.isArray(l.solutions));
      if ( hasSolutions ) {
        for (let i = 0, maxi = list.length; i < maxi; i += 1) {
          if ( !list[i].hasOwnProperty('solutions') ) {
            list[i].solutions = [{
              moves: list[i].scramble,
              votes: 0
            }];
          }
        }
        type = 2;
      }
    }

    list.sort(function(a, b): number {
      let A = a.name.split(' ').map(e => e.toLowerCase());
      let B = b.name.split(' ').map(e => e.toLowerCase());

      for (let i = 0, maxi = Math.min(A.length, B.length); i < maxi; i += 1) {
        if ( A[i] != B[i] ) {
          if ( !isNaN( parseInt(A[i]) ) && !isNaN( parseInt(B[i]) ) ) {
            return parseInt(A[i]) - parseInt(B[i]);
          } else {
            return A[i] < B[i] ? -1 : 1;
          }
        }
      }

      return a < b ? -1 : 1;
    });
    
    let cubes = list.map(e => {
      let args = nameToPuzzle(e.puzzle || "");
      let seq = e.scramble + " z2";
      return Puzzle.fromSequence(seq, {
        type: args[0],
        order: args.slice(1, args.length),
        mode: e.mode,
        view: e.view,
        tips: e.tips,
        headless: true,
      }, true, false);
    });
    
    for (let i = 0, maxi = list.length; i < maxi; i += 1) {
      let e = list[i];
      if ( type < 2 ) {
        cards.push({
          title: e.name,
          cube: '',
          ready: false,
          route: '/algorithms' + (e.parentPath ? '/' + e.parentPath : '') + '/' + e.shortName,
          puzzle: cubes[i]
        });
      } else {
        e.cube = '';
        e.ready = false;
        e.parentPath = '/algorithms/' + e.parentPath;
        e._puzzle = cubes[i];
        cases.push(e);
      }
    }

    let arr: Puzzle[] = type < 2 ? cards.map(e => e.puzzle as Puzzle ) : cases.map(e => e._puzzle as Puzzle);

    generateCubeBundle(arr, 500, true, true, false, true).then(gen => {
      let subsc = gen.subscribe((c) => {
        if ( c === null ) {
          cards = cards;
          cases = cases;

          cards.forEach(c => {
            if ( c.puzzle ) {
              dataService.cacheSaveImage(sha1(c.puzzle.options), c.puzzle.img);
            }
          });

          cases.forEach(c => {
            if ( c._puzzle ) {
              dataService.cacheSaveImage(sha1(c._puzzle.options), c._puzzle.img);
            }
          });

          subsc();
        }
      });
    });
  }

  function toggleListView() {
    listView = !listView;
    localStorage.setItem('algs-list-view', listView);
  }

  function handlekeyUp(e: KeyboardEvent) {
    if ( e.code === 'Escape' && allSolutions ) {
      navigate( $location.pathname.split('?')[0] );
    }

    // console.log("KeyUp: ", e);

    if ( e.code === 'KeyL' && e.ctrlKey && !allSolutions && (type === 2 || type >= 4) ) {
      toggleListView();
    }
  }

  async function updateCases(loc: RouteLocation) {
    if ( !loc.pathname.startsWith('/algorithms') ) return;

    let paramMap = getSearchParams(loc.search);

    let caseName = paramMap.get('case');
    let fCases = cases.filter(e => e.shortName === caseName);
    
    if ( caseName && fCases.length ) {
      selectedCase = fCases[0];
      allSolutions = true;
    } else {
      allSolutions = false;
    }

    imgExpanded = allSolutions;

    let p1 = loc.pathname.split('/').slice(2).join('/');

    if ( p1 != lastUrl || !p1 ) {
      cards.length = 0;
      cases.length = 0;
      lastUrl = p1;
      handleAlgorithms( await dataService.getAlgorithms(p1) );
    }
  }

  function caseHandler(c: Algorithm) {
    navigate(c.parentPath + '?case=' + c.shortName);
  }

  function toClipboard(s: string) {

    copyToClipboard(s).then(() => {
      notification.addNotification({
        key: randomUUID(),
        header: $localLang.global.done,
        text: $localLang.global.scrambleCopied,
        timeout: 1000
      });
    });

  }

 $: updateCases($location);
</script>

<svelte:window on:keyup={ handlekeyUp }></svelte:window>

<main class="container-mini overflow-hidden text-gray-400">
  {#if allSolutions}
    <div>
      <h1 class="text-gray-300 text-3xl font-bold text-center">{ selectedCase?.name }</h1>
      <button class="flex mx-auto items-center justify-center" on:click={ () => imgExpanded = !imgExpanded }>
        <img src={ selectedCase?._puzzle?.img } class="puzzle-img"
          class:expanded={ imgExpanded } alt="">
      </button>

      <div class="grid grid-cols-6">
        <h2 class="col-span-1 font-bold text-xl"> </h2>
        <h2 class="col-span-3 font-bold text-xl text-gray-300">{ $localLang.ALGORITHMS.solution }</h2>
        <h2 class="col-span-1 font-bold text-xl text-gray-300">{ $localLang.ALGORITHMS.moves }</h2>
        <h2 class="col-span-1 font-bold text-xl"> </h2>
  
        {#each (selectedCase?.solutions || []) as sol }
          <span class="col-span-1"></span>
          <Tooltip position="left" text="Click to copy" class="col-span-3">
            <span role="link" tabindex="0"
              on:click={ () => toClipboard(sol.moves) }
              class="mt-2 cursor-pointer hover:text-gray-300 transition-all duration-200">{ sol.moves }</span>
          </Tooltip>
          <span class="col-span-1 mt-2">{ sol.moves.split(" ").length }</span>
          <span class="col-span-1"></span>
        {/each}
      </div>
    </div>
  {:else}
    {#if type < 2}
      <ul class="w-full grid py-4">
        {#each cards as card }
          <Link to={ card.route }>
            <li class="w-40 h-48 text-center shadow-md rounded-md select-none cursor-pointer
            transition-all duration-200 flex flex-col items-center justify-between py-3
            bg-backgroundLv1 text-gray-400

            hover:rotate-3 hover:shadow-lg">
              <img class="w-32 h-32" src="{card?.puzzle?.img || ''}" alt={card.title}>
              <h2>{card.title}</h2>
            </li>
          </Link>
        {/each}
      </ul>
    {/if}

    {#if type === 2 || type >= 4}
      <div class="absolute right-12 top-16 grid place-items-center">
        <Tooltip position="left" text={ $localLang.ALGORITHMS.toggleView + '[Ctrl+L]' } hasKeybinding>
          <Button class="w-8 h-8 bg-backgroundLv1 hover:bg-purple-700 text-gray-400
            hover:text-gray-200 grid place-items-center cursor-pointer"
            on:click={ toggleListView }>
  
            {#if listView}
              <ViewListIcon size="1.2rem"/>
            {:else}
              <ViewGridIcon size="1.2rem"/>
            {/if}
          </Button>
        </Tooltip>
      </div>
      <div class="cases grid text-gray-400" class:compact={ !listView }>
        <div class="row">
          <span class="text-gray-300 font-bold">{ $localLang.ALGORITHMS.case }</span>
          <span class="text-gray-300 font-bold"></span>
          <span class="text-gray-300 font-bold">{ $localLang.ALGORITHMS.algorithms }</span>
        </div>

        {#each cases as c, i}
          <div class="row">
            <span class="font-bold">{ c.name }</span>
            <button class="flex items-center justify-center" on:click={ () => caseHandler(c) }>
              <img class="puzzle-img hover:shadow-lg transition-all duration-200 cursor-pointer"
                src={c?._puzzle?.img || ''} alt="">
            </button>
            <ul>
              {#each (c.solutions || []).slice(0, 4) as solution}
                <li class="algorithm">{solution.moves}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</main>

<style lang="postcss">
  ul:not(.no-grid) {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    row-gap: 2rem;
    grid-template-rows: max-content;
  }

  .container-mini {
    height: calc(100vh - 7rem);
  }

  .container-mini > :not(.absolute) {
    max-height: 100%;
    overflow: scroll;
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
    filter: drop-shadow(0 0 1rem #8a527c);
  }

  .cases.compact {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    padding-right: 1rem;
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

  .cases.compact .row > ul {
    display: none;
  }

  .cases.compact .row {
    place-items: center;
    grid-template-columns: 1fr;
    grid-template-areas:
      "img"
      "name";
    padding-inline: .5rem;
    background-color: #373737;
    border-radius: .3rem;
  }
  
  .puzzle-img {
    cursor: pointer;
  }

  .puzzle-img.expanded {
    width: min(20rem, 100%);
    height: min(20rem, 100%);
  }
</style>