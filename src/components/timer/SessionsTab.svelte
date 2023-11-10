<script lang="ts">
  import moment from "moment";
  import { AverageSetting, Penalty, type Language, type PuzzleOptions, type Solve, type TimerContext } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import { infinitePenalty, sTimer, timer } from "@helpers/timer";
  import Modal from "@components/Modal.svelte";
  import Button from "@components/material/Button.svelte";
  import Tooltip from "@components/material/Tooltip.svelte";
  import TextArea from "@components/material/TextArea.svelte";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { options } from "@cstimer/scramble/scramble";
  import { PX_IMAGE, STEP_COLORS } from "@constants";
  import { Paginator } from "@classes/Paginator";

  /// ICONS
  import CommentPlusIcon from '@icons/CommentPlusOutline.svelte';
  import CommentIcon from '@icons/Comment.svelte';
  import CalendarIcon from '@icons/Calendar.svelte';
  import Dice5Icon from '@icons/Dice5.svelte';
  import DeleteIcon from '@icons/Delete.svelte';
  import CloseIcon from '@icons/Close.svelte';
  import SendIcon from '@icons/Send.svelte';
  import DeleteAllIcon from '@icons/DeleteSweepOutline.svelte';
  import ChevronLeftIcon from '@icons/ChevronLeft.svelte';
  import ChevronRightIcon from '@icons/ChevronRight.svelte';
  import ChevronDoubleLeftIcon from '@icons/ChevronDoubleLeft.svelte';
  import ChevronDoubleRightIcon from '@icons/ChevronDoubleRight.svelte';
  import ShareIcon from '@icons/Share.svelte';
  import { getAverageS } from "@helpers/statistics";
  import { NotificationService } from "@stores/notification.service";
  import { derived, type Readable } from "svelte/store";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { tick } from "svelte";
  import Select from "@components/material/Select.svelte";
  import { copyToClipboard, randomUUID } from "@helpers/strings";
  import { calcPercents } from "@helpers/math";

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  const dataService = DataService.getInstance();
  const notification = NotificationService.getInstance();

  export let context: TimerContext;

  let { solves, tab, selected, session, handleUpdateSolve, handleRemoveSolves } = context;

  let pg = new Paginator([], 100);
  let LAST_CLICK = 0;

  let modal: any;
  let deleteAllModal: any;
  let show = false;
  let showDeleteAll = false;
  let sSolve: Solve;
  let gSolve: Solve;
  let preview = PX_IMAGE;
  let cube;
  let showContextMenu = false;
  let contextMenuElement: HTMLUListElement;
  let solvesElement: HTMLDivElement;
  let pSolves: Solve[] = [];
  let solveSteps: number[] = [];
  let fComment = false;
  let collapsed = false;
  
  function closeHandler(s?: Solve) {
    if ( s ) {
      gSolve.comments = (s.comments || '').trim();
      gSolve.penalty = s.penalty;
      dataService.updateSolve(s).then( res => {
        handleUpdateSolve(res);
        pSolves = pSolves;
      });
    }
    show = false;
  }

  export function editSolve(s: Solve) {
    gSolve = s;
    sSolve = { ...s };
 
    if ( sSolve.steps ) {
      solveSteps = calcPercents(sSolve.steps, sSolve.time);
    }

    let sMode = sSolve.mode as string;
    let md = options.has(sMode) ? sMode : '333';
    
    cube = Puzzle.fromSequence(sSolve.scramble, {
      ...(options.get(md) as PuzzleOptions),
      rounded: true,
      headless: true,
    });

    pGenerateCubeBundle([cube], 400, true)
      .then(res => preview = res[0]);
    
    show = true;
  }

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += (s.selected) ? 1 : -1;
    pSolves = pSolves;
  }

  function handleClick(s: Solve) {
    if ( (performance.now() - LAST_CLICK < 200) || $selected ) {
      selectSolve(s);
    } else {
      setTimeout(() => performance.now() - LAST_CLICK >= 200 && editSolve(s), 200);
    }
    
    LAST_CLICK = performance.now();
  }

  function setPenalty(p: Penalty, update?: boolean) {
    if ( p === Penalty.P2 ) {
      sSolve.penalty != Penalty.P2 && (sSolve.time += 2000);
    } else if ( sSolve.penalty === Penalty.P2 ) {
      sSolve.time -= 2000;
    }
    sSolve.penalty = p;

    if ( update ) {
      dataService.updateSolve(sSolve).then( handleUpdateSolve );
    }
  }

  function deleteAll() {
    showDeleteAll = true;
  }

  function selectAll() {
    $selected = $solves.length;
    for (let i = 0, maxi = $selected; i < maxi; i += 1) {
      $solves[i].selected = true;
    }
  }

  function selectInvert() {
    $selected = $solves.length - $selected;
    for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      $solves[i].selected = !$solves[i].selected;
    }
  }

  function selectInterval() {
    let i1, i2;
    let len = $solves.length;

    for (i1 = 0; i1 < len && !$solves[i1].selected; i1 += 1);
    for (i2 = len - 1; i2 >= 0 && !$solves[i2].selected; i2 -= 1);

    for (let i = i1; i <= i2; i += 1) {
      if ( !$solves[i].selected ) {
        $solves[i].selected = true;
        $selected += 1;
      }
    }
  }

  function selectNone() {
    $selected = 0;
    pSolves.forEach(s => s.selected = false);
    pSolves = pSolves;

    let sv = $solves;
    for(let i = 0, maxi = sv.length; i < maxi; i += 1) {
      sv[i].selected = false;
    }
  }

  function _delete(s: Solve[]) {
    dataService.removeSolves(s).then( handleRemoveSolves );
  }

  function deleteSelected() {
    _delete( $solves.filter(s => s.selected) );
    $selected = 0;
    pSolves = pSolves;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if ( $tab != 1 ) return;
    
    switch(e.code) {
      case 'Escape': selectNone(); showContextMenu = false; break;
      case 'KeyA': !show && selectAll(); break;
      case 'KeyT': !show && selectInterval(); break;
      case 'KeyV': !show && selectInvert(); break;
      case 'KeyD': !show && ($selected ? deleteSelected() : deleteAll()); break;
      case 'Enter': showDeleteAll && deleteAllModal.close(true);
    }
  }

  function updateSolves() {
    pSolves = $solves.slice(pg.start, pg.end);
    pg = pg;
  }

  function updatePaginator(s: any) {
    pg.setData($solves);

    updateSolves();
  }

  function setPage(p: number) {
    p === -1 && pg.nextPage();
    p === -2 && pg.prevPage();
    p != -1 && p != -2 && pg.setPage(p);
    updateSolves();
  }

  function toClipboard(text: string) {
    copyToClipboard(text.replaceAll('<br>', '\n')).then(() => {
      notification.addNotification({
        key: randomUUID(),
        header: $localLang.global.done,
        text: $localLang.global.copiedToClipboard,
        timeout: 1000
      });
    });
  }

  function shareAoX(n: number) {
    let sv = $solves.slice(0, n).reverse();
    let Ao5 = getAverageS(n, sv, AverageSetting.SEQUENTIAL);
    let minTime = (a: Solve, b: Solve) => {
      if ( infinitePenalty(a) ) return b;
      if ( infinitePenalty(b) ) return a;
      return a.time < b.time ? a : b;
    };

    let minMax = sv.reduce((acc, s) => [
      minTime(acc[0], s) === s ? s : acc[0],
      minTime(acc[1], s) === s ? acc[1] : s,
    ], [sv[0], sv[0]]);

    if ( Ao5.length === n ) {
      toClipboard(`Ao${n}: ${ timer(Ao5[n - 1] as any, true) } = ${ sv.map(s =>
        s === minMax[0] || s === minMax[1] ? '(' + sTimer(s, true) + ')' : sTimer(s, true)
      ).join(', ') }`);
    }
  }

  function deleteAllHandler(all: boolean) {
    all && _delete($solves)
  }

  function handleContextMenu(e: MouseEvent, s: Solve) {
    e.stopPropagation();
    contextMenuElement.style.left = e.clientX + 'px';
    contextMenuElement.style.top = e.clientY + 'px';
    sSolve = s;
    
    if ( sSolve.steps ) {
      solveSteps = calcPercents(sSolve.steps, sSolve.time);
    }
    
    showContextMenu = true;
  }

  function updatePageFromSelected() {
    if ( $selected ) {
      let sv = $solves;

      for (let i = 0, maxi = sv.length; i < maxi; i += 1) {
        if ( sv[i].selected ) {
          let page = Math.ceil((i + 1) / pg.limit);
          pg.setPage(page);
          updateSolves();
          tick().then(() => {
            solvesElement.children[i - pg.start].scrollIntoView({ block: 'center' });
          });
          break
        }
      }
    }
  }

  $: updatePaginator($solves);
  $: $selected, updatePageFromSelected();
  $: $tab != 1 && $selected && selectNone();
</script>

<svelte:window
  on:keyup={ handleKeyUp }
  on:click={ () => showContextMenu = false }></svelte:window>

<main class="w-full h-full">
  <ul class={"w-max flex justify-center mx-auto gap-2 text-gray-400 " + (pg.pages > 1 ? '' : 'hidden')}>
    <li class="paginator-item"> <button on:click={ () => setPage(1) }> <ChevronDoubleLeftIcon /> </button> </li>
    <li class="paginator-item"> <button on:click={ () => setPage(-2) }> <ChevronLeftIcon /> </button> </li>
    {#each pg.labels as lb}
      <li class="paginator-item" class:selected={ pg.page === lb }>
        <button on:click={ () => setPage(lb) }>{ lb }</button>
      </li>
    {/each}
    <li class="paginator-item"> <button on:click={ () => setPage(-1) }> <ChevronRightIcon /> </button> </li>
    <li class="paginator-item"> <button on:click={ () => setPage(Infinity) }> <ChevronDoubleRightIcon /> </button> </li>
  </ul>

  <div id="grid" class="text-gray-400 ml-8 mr-12 grid h-max-[100%] overflow-scroll" bind:this={ solvesElement }>
    {#each pSolves as solve (solve._id)}
      <button
        class="shadow-md w-24 h-12 rounded-md m-3 p-1 bg-backgroundLv1 relative
          flex items-center justify-center transition-all duration-200 select-none cursor-pointer

          hover:shadow-lg hover:bg-opacity-20
        "
        on:click={ () => handleClick(solve) }
        on:contextmenu={ (e) => handleContextMenu(e, solve) }
        class:selected={ solve.selected }>
          <div class="font-small absolute top-0 left-2">{ moment(solve.date).format('DD/MM') }</div>
          <span class="text-center font-bold">{ sTimer(solve, true) }</span>

          <div class="absolute right-1 top-0 h-full flex flex-col items-center justify-evenly">
            {#if solve.penalty === Penalty.P2} <span class="font-small">+2</span> {/if}
            {#if solve.comments} <CommentPlusIcon width=".8rem"/> {/if}
          </div>
      </button>
    {/each}
  </div>

  <div class="absolute top-3 right-2 text-gray-400 my-3 mx-1 flex flex-col gap-2">
    {#if $solves.length > 0}
      <Tooltip position="left" text={ $localLang.TIMER.deleteAll + " [D]"} hasKeybinding>
        <button on:click={ deleteAll } class="cursor-pointer grid place-items-center">
          <DeleteAllIcon width="1.2rem" height="1.2rem"/>
        </button>
      </Tooltip>
      {/if}
      <Tooltip position="left" text={ $localLang.TIMER.shareAo5 }>
        <button on:click={ () => shareAoX(5) } class="cursor-pointer grid place-items-center">
          <ShareIcon width="1.2rem" height="1.2rem"/>
        </button>
      </Tooltip>
      <Tooltip position="left" text={ $localLang.TIMER.shareAo12 }>
        <button on:click={ () => shareAoX(12) } class="cursor-pointer grid place-items-center">
          <ShareIcon width="1.2rem" height="1.2rem"/>
        </button>
      </Tooltip>
  </div>

  <div class:isVisible={ $selected }
    class="fixed rounded-md p-2 top-0 opacity-0 pointer-events-none
    transition-all duration-300 bg-gray-700 shadow-md flex w-max max-w-full actions z-20">
    <Button ariaLabel={ $localLang.TIMER.selectAll }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => selectAll()}>
      { $localLang.TIMER.selectAll } &nbsp; <span class="flex ml-auto text-yellow-400">[A]</span>
    </Button>
    
    <Button ariaLabel={ $localLang.TIMER.selectInterval }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => selectInterval()}>
      { $localLang.TIMER.selectInterval } &nbsp; <span class="flex ml-auto text-yellow-400">[T]</span>
    </Button>
    
    <Button ariaLabel={ $localLang.TIMER.invertSelection }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => selectInvert()}>
      { $localLang.TIMER.invertSelection } &nbsp; <span class="flex ml-auto text-yellow-400">[V]</span>
    </Button>
    
    <Button ariaLabel={ $localLang.global.cancel }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => selectNone()}>
      { $localLang.global.cancel } &nbsp; <span class="flex ml-auto text-yellow-400">[Esc]</span>
    </Button>

    <Button ariaLabel={ $localLang.global.delete }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => deleteSelected()}>
      { $localLang.global.delete } &nbsp; <span class="flex ml-auto text-yellow-400">[D]</span>
    </Button>
  </div>

  <Modal bind:this={ modal } bind:show={ show } onClose={ closeHandler } class="w-[min(100%,36rem)]">
    <div class="flex justify-between items-center text-gray-400 m-2">
      <h2 class="m-1 w-max">
        {#if sSolve.penalty === Penalty.NONE || sSolve.penalty === Penalty.P2}
          { sTimer(sSolve, true, true) }
        {/if}
        {#if sSolve.penalty === Penalty.P2}
          <span class="font-small text-red-500">+2</span>
        {/if}
        {#if sSolve.penalty === Penalty.DNF}
          <span class="font-small text-red-500">DNF</span>
        {/if}
        {#if sSolve.penalty === Penalty.DNS}
          <span class="font-small text-red-500">DNS</span>
        {/if}
      </h2>
      <span class="flex items-center font-small">
        <CalendarIcon width="1.2rem" height="1.2rem"/>
        <span class="ml-2">
          { moment(sSolve.date).format('D MMM YYYY') } <br>
          { moment(sSolve.date).format('HH:MM') }
        </span>
      </span>
    </div>
    <div class={"algorithm-container text-gray-400 m-2 transition-all duration-300 delay-100 " + ((fComment || collapsed) ? 'collapsed' : '')}>
      <Dice5Icon /> <span bind:innerHTML={ sSolve.scramble } contenteditable="false" class="text-center"></span>
      
      <button class="preview col-span-2 mb-2 mt-2 mx-auto overflow-hidden" on:click={ () => collapsed = !collapsed }>
        <img class="w-full h-full" src={ preview } alt="">
      </button>

      {#if sSolve.steps }
        <hr class="w-full border border-t-gray-400 col-span-2">
        <h3 class="text-gray-300 text-center col-span-2 mt-2 mb-8 text-lg">{ $localLang.global.steps }</h3>

        <div class="col-span-2 flex mb-4">
          {#each solveSteps as s, p (p)}
            <span class="step-part text-gray-300"
              data-percent={ `${ s }%` }
              data-time={ timer((sSolve.steps || [])[p], true, true) }
              style={`
                width: ${ s }%;
                background-color: ${ STEP_COLORS[p] };
                --p: ${p};
              `}
            ></span>
          {/each}
        </div>

        <div class="col-span-2 flex mb-4 text-center -mt-4">
          {#each solveSteps as s, p (p)}
            <span style={`width: ${ s }%; `}>{ ($session.settings.stepNames || [])[p] || '' }</span>
          {/each}
        </div>
      {/if}

      <CommentIcon />
      
      <TextArea blurOnEscape
        on:focus={ () => fComment = true }
        on:blur={ () => fComment = false }
        cClass={fComment ? "max-h-[30ch]" : 'max-h-[20ch]'} bind:value={ sSolve.comments } placeholder={ $localLang.TIMER.comment }/>
    </div>
    <div class="mt-2 flex justify-between gap-1">
      <Button ariaLabel={ $localLang.global.delete } flat
        class="text-red-500 border border-red-500 hover:text-gray-200 hover:bg-red-700"
        on:click={ () => { _delete([ sSolve ]); modal.close()} }>
        <DeleteIcon /> { $localLang.global.delete }
      </Button>
      
      <Button ariaLabel={ $localLang.global.cancel } flat
        on:click={ () => modal.close() }
        class="border border-gray-400 text-gray-400 hover:bg-gray-900 hover:text-gray-200">
        <CloseIcon /> { $localLang.global.cancel }
      </Button>
      
      <Button ariaLabel={ $localLang.global.save } flat
        on:click={ () => modal.close(sSolve) }
        class="border border-purple-400 text-purple-400 hover:bg-purple-900 hover:text-gray-200 mr-2">
        <SendIcon /> { $localLang.global.save }
      </Button>

      <Select items={[
          { label: $localLang.TIMER.noPenalty, penalty: Penalty.NONE },
          { label: '+2', penalty: Penalty.P2 },
          { label: 'DNF', penalty: Penalty.DNF },
          { label: 'DNS', penalty: Penalty.DNS },
        ]} onChange={ (p) => setPenalty(p.penalty) }
        label={ (v) => v.label } transform={ (v) => v.penalty } value={ sSolve.penalty }/>
    </div>
  </Modal>

  <Modal bind:this={ deleteAllModal } bind:show={ showDeleteAll } onClose={ deleteAllHandler }>
    <h1 class="text-gray-400 mb-4 text-lg">{ $localLang.TIMER.removeAllSolves }</h1>
    <div class="flex justify-evenly">
      <Button ariaLabel={ $localLang.global.cancel }
        on:click={ () => deleteAllModal.close() }>
        { $localLang.global.cancel }
      </Button>
      
      <Button ariaLabel={ $localLang.global.delete }
        class="bg-red-800 hover:bg-red-700 text-gray-400"
        on:click={ () => deleteAllModal.close(true) }>
        { $localLang.global.delete }
      </Button>
    </div>
  </Modal>

  <!-- Context Menu -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <ul
    class="context-menu"
    class:active={ showContextMenu }
    bind:this={ contextMenuElement }>
    <li> <button on:click={ () => editSolve(sSolve) }>{ $localLang.TIMER.edit }</button> </li>
    <li> <button on:click={ () => selectSolve(sSolve) }>{ $localLang.TIMER.select }</button> </li>
    <li> <button on:click={ () => toClipboard(sSolve.scramble) }>{ $localLang.TIMER.copyScramble }</button> </li>
    <li> <button on:click={ () => _delete([sSolve]) }>{ $localLang.global.delete }</button> </li>
  </ul>
</main>

<style lang="postcss">
#grid {
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  max-height: calc(100vh - 10rem);
}

.font-small {
  font-size: .7rem;
}

.algorithm-container {
  display: grid;
  grid-template-columns: 1.3rem 1fr;
  grid-template-rows: auto 18rem auto auto auto;
}

.algorithm-container.collapsed {
  grid-template-rows: auto 6rem auto auto auto;
}

.actions {
  margin-left: 50%;
  transform: translateX(-50%);
}

.selected {
  @apply bg-purple-900;
}

.isVisible {
  @apply top-12 opacity-100 pointer-events-auto;
}

.paginator-item button {
  @apply w-8 h-8 bg-violet-400 bg-opacity-30 grid place-items-center rounded-md cursor-pointer shadow-md
    transition-all duration-300 select-none
    
    hover:bg-opacity-40 hover:text-gray-300;
}

.paginator-item.selected button {
  @apply bg-violet-500 text-gray-200 bg-opacity-60 hover:bg-opacity-50;
}

.context-menu {
  @apply w-max p-2 rounded-md shadow-md fixed top-8 left-28 bg-gray-600
    border border-blue-800 text-gray-300 grid gap-1;
}

.context-menu:not(.active) {
  @apply pointer-events-none opacity-0 invisible;
}

.context-menu li {
  @apply p-1 rounded-md transition-all duration-200 cursor-pointer
    pr-2 hover:pl-2 hover:hover:pr-1 hover:bg-gray-800;
}

.step-part {
  height: 1.8rem;
  display: flex;
  position: relative;
}

.step-part:first-child {
  @apply rounded-l-full;
}

.step-part:last-child {
  @apply rounded-r-full;
}

.step-part::before {
  content: attr(data-percent);
  position: absolute;
  left: 50%;
  transform: translate(-50%, -1.5rem);
}

.step-part::after {
  content: attr(data-time);
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: black;
  font-size: .8rem;
}
</style>