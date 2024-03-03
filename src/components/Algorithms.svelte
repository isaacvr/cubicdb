<script lang="ts">
  import { Link, navigate, useLocation } from "svelte-routing";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { nameToPuzzle, type Algorithm, type ICard } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import { copyToClipboard, getSearchParams, randomUUID } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import type { RouteLocation } from "svelte-routing/types/Route";
  import ViewListIcon from '@icons/ViewList.svelte';
  import ViewGridIcon from '@icons/Grid.svelte';
  import { screen } from "@stores/screen.store";
  import { Button, Li, List, Span, Spinner, Tooltip } from "flowbite-svelte";
  import { CubeDBICON } from "@constants";
  import { localLang } from "@stores/language.service";

  const location = useLocation();

  const dataService = DataService.getInstance();
  const notification = NotificationService.getInstance();

  let lastUrl: string = '';
  let cards: ICard[] = [];
  let cases: Algorithm[] = [];
  let type: number = 0;
  let selectedCase: Algorithm | null = null;
  let allSolutions = false;
  let imgExpanded = false;
  let listView = JSON.parse(localStorage.getItem('algs-list-view') || 'true');
  const NUMBER_REG = /^[+-]?[\d]+(\.[\d]+)?$/;

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
          if ( NUMBER_REG.test(A[i]) && NUMBER_REG.test(B[i]) ) {
            return parseInt(A[i]) - parseInt(B[i]);
          } else {
            return A[i] < B[i] ? -1 : 1;
          }
        }
      }

      return A.length < B.length ? -1 : 1;
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
        rounded: true
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

    pGenerateCubeBundle(arr, 500, true, true, false, true).then(_ => {
      cards = cards;
      cases = cases;
    })
    .catch(err => console.log("ERROR: ", err));
  }

  function toggleListView() {
    listView = !listView;
    localStorage.setItem('algs-list-view', listView);
  }

  function handlekeyUp(e: KeyboardEvent) {
    if ( e.code === 'Escape' && allSolutions ) {
      navigate( $location.pathname.split('?')[0] );
    }

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
      imgExpanded = false;
    } else {
      allSolutions = false;
    }

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
        timeout: 1000,
        icon: CubeDBICON,
      });
    });

  }

 $: updateCases($location);
</script>

<svelte:window on:keyup={ handlekeyUp }></svelte:window>

<main class="container-mini overflow-hidden">
  {#if allSolutions}
    <div>
      <h1 class="text-gray-300 text-3xl font-bold text-center">{ selectedCase?.name }</h1>
      <button class="flex mx-auto items-center justify-center" on:click={ () => imgExpanded = !imgExpanded }>
        {#if selectedCase?._puzzle?.img}
          <img src={ selectedCase?._puzzle?.img } class="puzzle-img object-contain"
            class:expanded={ imgExpanded } alt="">
        {:else}
          <Spinner size="6" color="white"/>
        {/if}
      </button>

      <div class="grid grid-cols-6">
        <h2 class="max-sm:hidden col-span-1 font-bold text-xl"> </h2>
        <h2 class="max-sm:col-span-5 col-span-3 font-bold text-xl text-gray-300">{ $localLang.ALGORITHMS.solution }</h2>
        <h2 class="max-sm:col-span-1 col-span-1 font-bold text-xl text-right text-gray-300">{ $localLang.ALGORITHMS.moves }</h2>
        <h2 class="max-sm:hidden col-span-1 font-bold text-xl"> </h2>
  
        {#each (selectedCase?.solutions || []) as sol, i }
          <span class="max-sm:hidden col-span-1"></span>
          
          <div class="flex mt-2 max-sm:col-span-5 col-span-3">
            <span class="w-6 pl-1 mr-2 text-right border-l-4 border-l-blue-500">{i + 1}:</span>
            <button role="link" tabindex="0"
              on:click={ () => toClipboard(sol.moves) }
              class="cursor-pointer hover:text-gray-300 transition-all 
              text-left duration-200 pl-2 underline underline-offset-4">{ sol.moves }</button>
          </div>

          <Tooltip placement={ $screen.isMobile ? "top" : "left" }>
            { $localLang.global.clickToCopy }
          </Tooltip>
          <span class="max-sm:col-span-1 col-span-1 mt-2 text-right">{ sol.moves.split(" ").length }</span>
          <span class="max-sm:hidden col-span-1"></span>
        {/each}
      </div>
    </div>
  {:else}
    {#if type < 2}
      <List class="w-full grid py-4">
        {#each cards as card }
          <Link to={ card.route } class="w-full">
            <Li class="max-w-[12rem] h-48 text-center shadow-md rounded-md select-none cursor-pointer
            transition-all duration-200 flex flex-col items-center justify-between py-3
            bg-backgroundLv1

            hover:rotate-3 hover:shadow-lg">
              {#if card?.puzzle?.img}
                <img class="w-32 h-32 object-contain" src={card.puzzle.img} alt={card.title}>
              {:else}
                <Spinner size="10" color="yellow" class="m-auto"/>
              {/if}

              <Span class="text-base">{ card.title }</Span>
            </Li>
          </Link>
        {/each}
      </List>
    {/if}

    {#if type === 2 || type >= 4 }
      <div class={"fixed right-2 grid place-items-center " + ( $screen.isMobile ? "bottom-16" : "top-16" )}>
        <Button id="list-view" color="purple" class={`grid place-items-center !p-0 cursor-pointer `
            + ($screen.isMobile ? 'w-12 h-12 !rounded-full shadow-xl border border-black' : 'w-8 h-8')}
          on:click={ toggleListView }>

          {#if listView}
            <ViewListIcon size="1.2rem" class="pointer-events-none"/>
          {:else}
            <ViewGridIcon size="1.2rem" class="pointer-events-none"/>
          {/if}
        </Button>
        <Tooltip reference="#list-view" placement="left" class="w-max">
          <div class="flex items-center gap-2">
            { $localLang.ALGORITHMS.toggleView } <div class="text-yellow-400">[Ctrl + L]</div>
          </div>
        </Tooltip>
      </div>
      <div class="cases grid" class:compact={ !listView }>
        <div class="row">
          <span class="text-gray-300 font-bold">{ $localLang.ALGORITHMS.case }</span>
          <span class="text-gray-300 font-bold"></span>
          <span class="text-gray-300 font-bold">{ $localLang.ALGORITHMS.algorithms }</span>
        </div>

        {#each cases as c}
          <div class="row min-h-[8rem]">
            <span class="font-bold">{ c.name }</span>
            <button class="flex items-center justify-center" on:click={ () => caseHandler(c) }>
              {#if c?._puzzle?.img}
                <img class="puzzle-img hover:shadow-lg transition-all duration-200 cursor-pointer object-contain"
                  src={c._puzzle.img } alt="">
              {:else}
                <Spinner size="10" color="white"/>
              {/if}
              
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
    filter: drop-shadow(0 0 1rem #8a527c);
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