<script lang="ts">
  import moment from "moment";
  import { Penalty, type Solve, type TimerContext } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import timer from "@helpers/timer";
  import Modal from "@components/Modal.svelte";
  import Button from "@components/material/Button.svelte";
  import Tooltip from "@components/material/Tooltip.svelte";
  import TextArea from "@components/material/TextArea.svelte";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { generateCubeBundle } from "@helpers/cube-draw";
  import { options } from "@cstimer/scramble/scramble";

  /// ICONS
  import CommentPlusIcon from '@icons/CommentPlusOutline.svelte';
  import CommentIcon from '@icons/Comment.svelte';
  import CalendarIcon from '@icons/Calendar.svelte';
  import Dice5Icon from '@icons/Dice5.svelte';
  import DeleteIcon from '@icons/Delete.svelte';
  import CloseIcon from '@icons/Close.svelte';
  import SendIcon from '@icons/Send.svelte';
  import DeleteAllIcon from '@icons/DeleteSweepOutline.svelte';
  import SelectAllIcon from '@icons/SelectAll.svelte';
  import ArrowExpandIcon from '@icons/ArrowExpandHorizontal.svelte';
  import SelectInverseIcon from '@icons/SelectInverse.svelte';
  import SelectOffIcon from '@icons/SelectOff.svelte';
  import { PX_IMAGE } from "@constants";

  const dataService = DataService.getInstance();

  export let context: TimerContext;

  let { solves, tab } = context;

  let selected = 0;
  let LAST_CLICK = 0;

  let modal;
  let deleteAllModal;
  let show = false;
  let showDeleteAll = false;
  let sSolve: Solve;
  let gSolve: Solve;
  let preview = PX_IMAGE;
  let cube;
  
  function closeHandler(s?: Solve) {
    if ( s ) {
      gSolve.comments = (s.comments || '').trim();
      gSolve.penalty = s.penalty;
      dataService.updateSolve(s);
    }
    show = false;
  }

  function editSolve(s: Solve) {
    gSolve = s;
    sSolve = { ...s };
    
    let md = options.has(sSolve.mode) ? sSolve.mode : '333';
    
    cube = Puzzle.fromSequence(sSolve.scramble, { ...options.get(md), headless: true });

    generateCubeBundle([cube], 200).then(g => {
      let subscr = g.subscribe((img: string) => {
        if ( img === '__initial__' ) return;

        if ( img != null ) {
          preview = img;
        } else {
          subscr();
        }
      });
    })
    
    show = true;
  }

  function handleClick(s: Solve) {
    if ( (performance.now() - LAST_CLICK < 200) || selected ) {
      s.selected = !s.selected;
      selected += (s.selected) ? 1 : -1;
      $solves = $solves;
    } else {
      setTimeout(() => performance.now() - LAST_CLICK >= 200 && editSolve(s), 200);
    }
    
    LAST_CLICK = performance.now();
  }

  function setPenalty(p: Penalty) {
    if ( p === Penalty.P2 ) {
      sSolve.penalty != Penalty.P2 && (sSolve.time += 2000);
    } else if ( sSolve.penalty === Penalty.P2 ) {
      sSolve.time -= 2000;
    }
    sSolve.penalty = p;
  }

  function deleteAll() {
    showDeleteAll = true;
  }

  function selectAll() {
    selected = $solves.length;
    for (let i = 0, maxi = selected; i < maxi; i += 1) {
      $solves[i].selected = true;
    }
  }

  function selectInvert() {
    selected = $solves.length - selected;
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
        selected += 1;
      }
    }
  }

  function selectNone() {
    selected = 0;
    for(let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      $solves[i].selected = false;
    }
  }

  function _delete(s: Solve[]) {
    dataService.removeSolves(s);
  }

  function deleteSelected() {
    _delete( $solves.filter(s => s.selected) );
    selected = 0;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if ( $tab != 1 ) return;
    switch(e.code) {
      case 'KeyC':
      case 'Escape': selectNone(); break;
      case 'KeyA': selectAll(); break;
      case 'KeyT': selectInterval(); break;
      case 'KeyV': selectInvert(); break;
      case 'KeyD': selected ? deleteSelected() : deleteAll(); break;
      case 'Enter': showDeleteAll && deleteAllModal.close(true);
    }
  }

</script>

<svelte:window on:keyup={ handleKeyUp }></svelte:window>

<main class="w-full h-full">
  <div id="grid" class="text-gray-400 mx-8 grid h-max-[100%] overflow-scroll">
    {#each $solves as solve}
    <div
      class="shadow-md w-24 h-12 rounded-md m-3 p-1 bg-white bg-opacity-10 relative
        flex items-center justify-center transition-all duration-200 select-none cursor-pointer

        hover:shadow-lg hover:bg-opacity-20
      "
      on:click={ () => handleClick(solve) }
      class:selected={ solve.selected }>
        <div class="font-small absolute top-0 left-2">{ moment(solve.date).format('DD/MM') }</div>
        <span class="time font-bold">{ solve.penalty === Penalty.DNF ? 'DNF' : timer(solve.time, true) }</span>

        <div class="absolute right-1 top-0 h-full flex flex-col items-center justify-evenly">
          {#if solve.penalty === 1} <span class="font-small">+2</span> {/if}
          {#if solve.comments} <CommentPlusIcon width=".8rem"/> {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="absolute top-3 right-2 text-gray-400 my-3 mx-1">
    {#if $solves.length > 0}
      <Tooltip position="left" text="Delete all [D]">
        <span on:click={ deleteAll } class="cursor-pointer grid place-items-center">
          <DeleteAllIcon width="1.2rem" height="1.2rem"/>
        </span>
      </Tooltip>
    {/if}
  </div>

  <div class:isVisible={ selected } class="fixed rounded-md p-2 top-0 opacity-0 pointer-events-none
    transition-all duration-300 bg-gray-700 shadow-md flex w-max max-w-full actions z-20">
    <Button flat on:click={() => selectAll()}> <SelectAllIcon width="1.2rem" height="1.2rem" /> Select All [A] </Button>
    <Button flat on:click={() => selectInterval()}> <ArrowExpandIcon width="1.2rem" height="1.2rem" /> Select Interval [T] </Button>
    <Button flat on:click={() => selectInvert()}> <SelectInverseIcon width="1.2rem" height="1.2rem" /> Invert Selection [V] </Button>
    <Button flat on:click={() => selectNone()}> <SelectOffIcon width="1.2rem" height="1.2rem" /> Cancel [C / Esc] </Button>
    <Button flat on:click={() => deleteSelected()}> <DeleteIcon width="1.2rem" height="1.2rem" /> Delete [D] </Button>

    <!-- <button mat-button (click)="selectAll()"> <mat-icon svgIcon="select-all"></mat-icon> Select All</button>
    <button mat-button (click)="selectInterval()"> <mat-icon svgIcon="arrow-expand-horizontal"></mat-icon> Select Interval</button>
    <button mat-button (click)="selectInvert()"> <mat-icon svgIcon="select-inverse"></mat-icon> Invert Selection</button>
    <button mat-button (click)="selectNone()"> <mat-icon svgIcon="select-off"></mat-icon> Cancel </button>
    <button mat-button (click)="deleteSelected()"> <mat-icon svgIcon="delete"></mat-icon> Delete</button> -->
  </div>

  <Modal bind:this={ modal } bind:show={ show } onClose={ closeHandler }>
    <div class="flex justify-between items-center text-gray-400 m-2">
      <h2 class="m-1 w-max">{ timer(sSolve.time, false, true) }
        {#if sSolve.penalty === Penalty.P2}<span class="font-small text-red-500">+2</span>{/if}
        {#if sSolve.penalty === Penalty.DNF}<span class="font-small text-red-500">DNF</span>{/if}
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
      <Dice5Icon /> <span>{ sSolve.scramble }</span>
      <img src={ preview } class="preview col-start-1 col-end-3 mb-2" alt="">
      
      <CommentIcon /> <TextArea bind:value={ sSolve.comments } placeholder="Comment..."/>
    </div>
    <div class="mt-2 flex">
      <Button flat><DeleteIcon /> Delete</Button>
      <Button flat on:click={ () => modal.close() }><CloseIcon /> Cancel</Button>
      <Button flat on:click={ () => modal.close(sSolve) } class="mr-2"><SendIcon /> Save</Button>
      <Button flat
        class={ sSolve.penalty === Penalty.P2 ? 'text-red-500' : '' }
        on:click={ () => setPenalty(Penalty.P2) }>+2</Button>

      <Button flat
        class={ sSolve.penalty === Penalty.DNF ? 'text-red-500' : '' }
        on:click={ () => setPenalty(Penalty.DNF) }>DNF</Button>
      
        <Button flat
        class={ sSolve.penalty === Penalty.NONE ? 'text-green-500' : '' }
        on:click={ () => setPenalty(Penalty.NONE) }>No Penalty</Button>
    </div>
  </Modal>

  <Modal bind:this={ deleteAllModal } bind:show={ showDeleteAll } onClose={ (res) => res && _delete($solves) }>
    <h1 class="text-gray-400 mb-4 text-lg">Do you want to remove all solves?</h1>
    <div class="flex justify-evenly">
      <Button on:click={ () => deleteAllModal.close() }>Cancel</Button>
      <Button class="bg-red-800 hover:bg-red-700 text-gray-400" on:click={ () => deleteAllModal.close(true) }>Delete</Button>
    </div>
  </Modal>
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
</style>