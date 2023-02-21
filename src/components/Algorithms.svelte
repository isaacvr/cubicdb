<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Link, navigate } from "svelte-routing";
  import type { Unsubscriber } from "svelte/store";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { generateCubeBundle } from "@helpers/cube-draw";
  import type { Algorithm, Card } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import Tooltip from "./material/Tooltip.svelte";
  import { getSearchParams } from "@helpers/strings";

  export let location: Location;
  
  const dataService = DataService.getInstance();

  let lastUrl: string = '';
  let cards: Card[] = [];
  let cases: Algorithm[] = [];
  let type: number = 0;
  let selectedCase: Algorithm | null = null;
  let allSolutions = false;

  let algSub: Unsubscriber;

  function nameToPuzzle(name: string): any[] {
    const reg1 = /^(\d*)[xX](\d*)$/, reg2 = /^(\d*)[xX](\d*)[xX](\d*)$/, reg3 = /^(\d){3}$/;

    let dims;

    if ( reg1.test(name) ) {
      return [ 'rubik', +name.replace(reg1, "$1") ];
    } else if ( reg2.test(name) ) {
      dims = name.replace(reg2, "$1 $2 $3").split(" ").map(Number);
      return [ 'rubik', ...dims ];
    } else if ( reg3.test(name) ) {
      dims = name.split('').map(Number);
      return ['rubik', ...dims];
    }

    switch(name) {
      case 'sq1':
      case 'Square-1': return [ 'square1' ];
      case 'Skewb': return [ 'skewb' ];
      case 'Pyraminx': return [ 'pyraminx' ];
      case 'Axis': return [ 'axis' ];
      case 'Fisher': return [ 'fisher' ];
      case 'Ivy': return [ 'ivy' ];
      default: return [ 'rubik', 3 ];
    }
  }

  function handleAlgorithms(list: Algorithm[]) {
    type = 0;
    cards.length = 0;
    cases.length = 0;

    if ( list.length > 0 ) {
      let hasSolutions = list.find(l => l.hasOwnProperty('solutions'));
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
      }, true);
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

    generateCubeBundle(arr, 250, false, true).then(gen => {
      let subsc = gen.subscribe((c) => {
        if ( c === null ) {
          cards = cards;
          cases = cases;
          subsc();
        }
      });
    });
  }

  function handlekeyUp(e: KeyboardEvent) {
    if ( e.code === 'Escape' && allSolutions ) {
      navigate(location.pathname.split('?')[0]);
    }
  }

  function updateCases(loc: Location) {
    let paramMap = getSearchParams(loc.search);

    let caseName = paramMap.get('case');
    let fCases = cases.filter(e => e.shortName === caseName);
    
    if ( caseName && fCases.length ) {
      selectedCase = fCases[0];
      allSolutions = true;
    } else {
      allSolutions = false;
    }

    let p1 = loc.pathname.split('/').slice(2).join('/');

    if ( p1 != lastUrl || !p1 ) {
      cards.length = 0;
      cases.length = 0;
      lastUrl = p1;
      dataService.getAlgorithms(p1);
    }
  }

  function caseHandler(c: Algorithm) {
    navigate(c.parentPath + '?case=' + c.shortName);
  }

  function copyToClipboard(s: string) {
    navigator.clipboard.writeText(s).then(() => {
      console.log("Copied to clipboard");
    });
  }

  $: updateCases(location);
  
  onMount(() => {

    algSub = dataService.algSub.subscribe((algs: Algorithm[]) => {
      handleAlgorithms(algs);
    });

  });

  onDestroy(() => {
    algSub();
  });
</script>

<svelte:window on:keyup={ handlekeyUp }></svelte:window>

<main class="container-mini overflow-hidden text-gray-400">
  {#if allSolutions}
    <div>
      <h1 class="text-gray-300 text-3xl font-bold text-center">{ selectedCase?.name }</h1>
      <img src={ selectedCase?._puzzle?.img } class="puzzle-img flex mx-auto" alt="">
      <div class="grid grid-cols-6">
        <h2 class="col-span-1 font-bold text-xl"> </h2>
        <h2 class="col-span-3 font-bold text-xl">Solution</h2>
        <h2 class="col-span-1 font-bold text-xl">Moves</h2>
        <h2 class="col-span-1 font-bold text-xl"> </h2>
  
        {#each (selectedCase?.solutions || []) as sol }
          <span class="col-span-1"></span>
          <Tooltip position="left" text="Click to copy" class="col-span-3">
            <span
              on:click={ () => copyToClipboard(sol.moves) }
              class="mt-2 cursor-pointer hover:text-gray-300 transition-all duration-200">{ sol.moves }</span>
          </Tooltip>
          <span class="col-span-1 mt-2">{ sol.moves.split(" ").length }</span>
          <span class="col-span-1"></span>
        {/each}
      </div>
    </div>
  {:else}
    {#if type < 2}
      <ul class="w-full grid">
        {#each cards as card }
          <Link to={ card.route }>
            <li class="w-40 h-48 text-center shadow-md rounded-md select-none cursor-pointer
            transition-all duration-200 flex flex-col items-center justify-between py-3
            bg-white bg-opacity-10 text-gray-400

            hover:rotate-3 hover:shadow-lg">
              <img class="w-32 h-32" src="{card?.puzzle?.img || ''}" alt={card.title}>
              <h2>{card.title}</h2>
            </li>
          </Link>
        {/each}
      </ul>
    {/if}

    {#if (type === 2 || type >= 4)}
      <div class="grid text-gray-400">
        <div class="row">
          <span class="text-gray-300 font-bold">Case</span>
          <span class="text-gray-300 font-bold"></span>
          <span class="text-gray-300 font-bold">Algorithms</span>
        </div>

        {#each cases as c, i}
          <div class="row">
            <span class="font-bold">{ c.name }</span>
            <img on:click={ () => caseHandler(c) }
              class="puzzle-img hover:shadow-lg transition-all duration-200 cursor-pointer"
              src={c?._puzzle?.img || ''} alt="">
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

  .container-mini > * {
    width: 100%;
    max-height: 100%;
    overflow: scroll;
  }

  .row {
    @apply grid;
    grid-template-columns: 1fr 1fr 2fr;
    align-items: center;
  }

  .row:not(:nth-child(-n + 2)) {
    @apply border-0 border-t border-t-gray-400;
  }

  .row .puzzle-img:hover {
    filter: drop-shadow(0 0 1rem #8a527c);
  }
</style>