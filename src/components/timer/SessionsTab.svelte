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
  import { generateCubeBundle } from "@helpers/cube-draw";
  import { options } from "@cstimer/scramble/scramble";
  import { PX_IMAGE } from "@constants";
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
    import { copyToClipboard } from "@helpers/strings";

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  const dataService = DataService.getInstance();
  const notification = NotificationService.getInstance();

  export let context: TimerContext;

  let { solves, tab, selected } = context;

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
  
  function closeHandler(s?: Solve) {
    if ( s ) {
      gSolve.comments = (s.comments || '').trim();
      gSolve.penalty = s.penalty;
      dataService.updateSolve(s);
    }
    show = false;
  }

  export function editSolve(s: Solve) {
    gSolve = s;
    sSolve = { ...s };
    
    let sMode = sSolve.mode as string;
    let md = options.has(sMode) ? sMode : '333';
    
    cube = Puzzle.fromSequence(sSolve.scramble, {
      ...(options.get(md) as PuzzleOptions),
      rounded: true,
      headless: true,
    });

    generateCubeBundle([cube], 200).then(g => {
      let subscr = g.subscribe((img) => {
        if ( img === '__initial__' ) return;

        if ( img != null ) {
          preview = img as string;
        } else {
          subscr();
        }
      });
    })
    
    show = true;
  }

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += (s.selected) ? 1 : -1;
    solves.update(() => $solves);
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
      dataService.updateSolve(sSolve);
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
    for(let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      $solves[i].selected = false;
    }
  }

  function _delete(s: Solve[]) {
    dataService.removeSolves(s);
  }

  function deleteSelected() {
    _delete( $solves.filter(s => s.selected) );
    $selected = 0;
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

  function updatePaginator(s: any) {
    pg.setData($solves);
    pg = pg;
  }

  function setPage(p: number) {
    p === -1 && pg.nextPage();
    p === -2 && pg.prevPage();
    p != -1 && p != -2 && pg.setPage(p);
    pg = pg;
  }

  function toClipboard(text: string) {
    copyToClipboard(text.replaceAll('<br>', '\n')).then(() => {
      notification.addNotification({
        key: crypto.randomUUID(),
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
    showContextMenu = true;
  }

  function updatePageFromSelected() {
    if ( $selected === 1 ) {
      for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
        if ( $solves[i].selected ) {
          let page = Math.ceil((i + 1) / pg.limit);
          pg.setPage(page);
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

</script>

<svelte:window
  on:keyup={ handleKeyUp }
  on:click={ () => showContextMenu = false }></svelte:window>

<main class="w-full h-full">
  {#if pg.pages > 1}
    <ul class="w-max flex justify-center mx-auto gap-2 text-gray-400">
      <li class="paginator-item"
        on:click={ () => setPage(1) }> <ChevronDoubleLeftIcon /> </li>
      <li class="paginator-item"
        on:click={ () => setPage(-2) }> <ChevronLeftIcon /> </li>
      {#each pg.labels as lb}
        <li class="paginator-item" class:selected={ pg.page === lb }
          on:click={ () => setPage(lb) }>{ lb }</li>
      {/each}
      <li class="paginator-item"
        on:click={ () => setPage(-1) }><ChevronRightIcon /></li>
      <li class="paginator-item"
        on:click={ () => setPage(Infinity) }><ChevronDoubleRightIcon /></li>
    </ul>
  {/if}

  <div id="grid" class="text-gray-400 ml-8 mr-12 grid h-max-[100%] overflow-scroll" bind:this={ solvesElement }>
    {#each $solves.slice(pg.start, pg.end) as solve}
    <div
      class="shadow-md w-24 h-12 rounded-md m-3 p-1 bg-white bg-opacity-10 relative
        flex items-center justify-center transition-all duration-200 select-none cursor-pointer

        hover:shadow-lg hover:bg-opacity-20
      "
      on:click={ () => handleClick(solve) }
      on:contextmenu={ (e) => handleContextMenu(e, solve) }
      class:selected={ solve.selected }>
        <div class="font-small absolute top-0 left-2">{ moment(solve.date).format('DD/MM') }</div>
        <span class="text-center font-bold">{ sTimer(solve, true) }</span>

        <div class="absolute right-1 top-0 h-full flex flex-col items-center justify-evenly">
          {#if solve.penalty === 1} <span class="font-small">+2</span> {/if}
          {#if solve.comments} <CommentPlusIcon width=".8rem"/> {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="absolute top-3 right-2 text-gray-400 my-3 mx-1 flex flex-col gap-2">
    {#if $solves.length > 0}
      <Tooltip position="left" text={ $localLang.TIMER.deleteAll + " [D]"} hasKeybinding>
        <span on:click={ deleteAll } class="cursor-pointer grid place-items-center">
          <DeleteAllIcon width="1.2rem" height="1.2rem"/>
        </span>
      </Tooltip>
      {/if}
      <Tooltip position="left" text={ $localLang.TIMER.shareAo5 }>
        <span on:click={ () => shareAoX(5) } class="cursor-pointer grid place-items-center">
          <ShareIcon width="1.2rem" height="1.2rem"/>
        </span>
      </Tooltip>
      <Tooltip position="left" text={ $localLang.TIMER.shareAo12 }>
        <span on:click={ () => shareAoX(12) } class="cursor-pointer grid place-items-center">
          <ShareIcon width="1.2rem" height="1.2rem"/>
        </span>
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
    
    <Button ariaLabel={ $localLang.TIMER.cancel }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => selectNone()}>
      { $localLang.TIMER.cancel } &nbsp; <span class="flex ml-auto text-yellow-400">[Esc]</span>
    </Button>

    <Button ariaLabel={ $localLang.TIMER.delete }
      tabindex={ $selected ? 0 : -1 } flat on:click={() => deleteSelected()}>
      { $localLang.TIMER.delete } &nbsp; <span class="flex ml-auto text-yellow-400">[D]</span>
    </Button>
  </div>

  <Modal bind:this={ modal } bind:show={ show } onClose={ closeHandler } class="max-w-xl">
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
    <div class="algorithm-container text-gray-400 m-2">
      <Dice5Icon /> <span bind:innerHTML={ sSolve.scramble } contenteditable="false" class="text-center"></span>
      <img src={ preview } class="preview col-start-1 col-end-3 mb-2 mx-auto" alt="">
      
      <CommentIcon /> <TextArea bind:value={ sSolve.comments } placeholder={ $localLang.TIMER.comment }/>
    </div>
    <div class="mt-2 flex">
      <Button ariaLabel={ $localLang.TIMER.delete } flat class="text-red-500"
        on:click={ () => { _delete([ sSolve ]); modal.close()} }>
        <DeleteIcon /> { $localLang.TIMER.delete }
      </Button>
      
      <Button ariaLabel={ $localLang.TIMER.cancel } flat
        on:click={ () => modal.close() } class="">
        <CloseIcon /> { $localLang.TIMER.cancel }
      </Button>
      
      <Button ariaLabel={ $localLang.TIMER.save } flat
        on:click={ () => modal.close(sSolve) } class="mr-2">
        <SendIcon /> { $localLang.TIMER.save }
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
      <Button ariaLabel={ $localLang.TIMER.cancel }
        on:click={ () => deleteAllModal.close() }>
        { $localLang.TIMER.cancel }
      </Button>
      
      <Button ariaLabel={ $localLang.TIMER.delete }
        class="bg-red-800 hover:bg-red-700 text-gray-400"
        on:click={ () => deleteAllModal.close(true) }>
        { $localLang.TIMER.delete }
      </Button>
    </div>
  </Modal>

  <!-- Context Menu -->
  <ul
    class="context-menu"
    class:active={ showContextMenu }
    bind:this={ contextMenuElement }
    on:click={() => showContextMenu = false}>
    <li on:click={ () => editSolve(sSolve) }>{ $localLang.TIMER.edit }</li>
    <li on:click={ () => selectSolve(sSolve) }>{ $localLang.TIMER.select }</li>
    <li on:click={ () => toClipboard(sSolve.scramble) }>{ $localLang.TIMER.copyScramble }</li>
    <li on:click={ () => _delete([sSolve]) }>{ $localLang.TIMER.delete }</li>
  </ul>
</main>

<style lang="postcss">
#grid {
  grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
  max-height: calc(100vh - 8rem);
}

.font-small {
  font-size: .7rem;
}

.algorithm-container {
  display: grid;
  grid-template-columns: 1.3rem 1fr;
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

.paginator-item {
  @apply w-8 h-8 bg-violet-400 bg-opacity-30 grid place-items-center rounded-md cursor-pointer shadow-md
    transition-all duration-300 select-none
    
    hover:bg-opacity-40 hover:text-gray-300;
}

.paginator-item.selected {
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

</style>