<script lang="ts">
  /// Types
  import { Penalty, TimerState, type Solve, type TimerContext } from '@interfaces';

  /// Icons
  import Close from '@icons/Close.svelte';
  import ThumbDown from '@icons/ThumbDown.svelte';
  import Flag from '@icons/FlagOutline.svelte';
  import Refresh from '@icons/Refresh.svelte';
  import Pencil from '@icons/PencilOutline.svelte';
  import Calendar from '@icons/CalendarTextOutline.svelte';
  import Copy from '@icons/ContentCopy.svelte';
  import Settings from '@icons/Settings.svelte';
  import LightBulb from '@icons/LightbulbOn.svelte';

  /// Components
  import Tooltip from '@material/Tooltip.svelte';
  import Modal from '@components/Modal.svelte';
  import Button from '@components/material/Button.svelte';
  import TextArea from '@components/material/TextArea.svelte';
  import Checkbox from '@components/material/Checkbox.svelte';
  import Input from '@components/material/Input.svelte';
  import Toggle from '@components/material/Toggle.svelte';

  /// Helpers
  import timer from '@helpers/timer';
  import { onMount } from 'svelte';
  import { DataService } from '@stores/data.service';
  
  export let context: TimerContext;

  const {
    state, ready, tab, solves, allSolves, session, Ao5, stats, scramble,
    group, mode, hintDialog, hint, cross, xcross, preview,isRunning,
    sortSolves, initScrambler, updateStatistics, selectedGroup, setConfigFromSolve
  } = context;
  
  /// LAYOUT
  const textColor = 'text-gray-400';
  let isValid: boolean = true;
  let ref: number = 0;
  let refPrevention: number = 0;
  let itv: any;
  let selected: number = 0;
  let lastSolve: Solve;
  let prob: number = null;
  let prevExpanded: boolean = false;

  /// MODAL
  let modal;
  let show = false;
  let type = '';
  let modalData;
  let closeHandler: Function = () => {};

  /// SCRAMBLE
  let stateMessage: string = 'Scrambling...';
  let openDialog = (ev: string, dt: any, fn: Function) => {
    type = ev; modalData = dt; closeHandler = fn; show = true;
  };
  
  let options = [
    { text: "Reload scramble [S]", icon: Refresh, handler: () => initScrambler() },
    { text: "Edit [E]", icon: Pencil, handler: () => {
      openDialog('edit-scramble', $scramble, (scr) => scr && initScrambler(scr));
    } },
    { text: "Use old scramble [O]", icon: Calendar, handler: () => {
      openDialog('old-scrambles', null, () => {});
    } },
    { text: "Copy scramble", icon: Copy, handler: () => copyToClipboard() },
    { text: "Settings", icon: Settings, handler: () => {
      let initialCalc = $session.settings.calcAoX;

      openDialog('settings', $session, (data) => {
        if ( data ) {
          dataService.updateSession($session);
          initialCalc != $session.settings.calcAoX && updateStatistics(false);
        }
      });
    } },
  ];

  /// CLOCK
  let time: number = 0;
  // let showTime: boolean = true;
  let decimals: boolean = true;
  let solveControl = [
    { text: "Delete", icon: Close, highlight: _ => false, handler: () => {
      dataService.removeSolves([ $solves[0] ]);
      reset();
    }},
    { text: "DNF", icon: ThumbDown, highlight: (s) => s.penalty === Penalty.DNF, handler: () => {
      $solves[0].penalty = $solves[0].penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF;
      dataService.updateSolve($solves[0]);
    } },
    { text: "+2", icon: Flag, highlight: (s) => s.penalty === Penalty.P2, handler: () => {
      $solves[0].penalty = $solves[0].penalty === Penalty.P2 ? Penalty.NONE : Penalty.P2;
      dataService.updateSolve($solves[0]);
    } },
  ];

  const dataService = DataService.getInstance();

  function debug(...args) {}

  function selectNone() {
    selected = 0;
    $solves.forEach(s => s.selected = false);
  }

  function addSolve() {
    lastSolve.date = Date.now();
    lastSolve.time = time;
    lastSolve.group = $group;
    lastSolve.mode = $mode[1];
    lastSolve.len = $mode[2];
    lastSolve.prob = prob;
    lastSolve.session = $session._id;
    $allSolves.push( lastSolve );
    $solves.push( lastSolve );
    dataService.addSolve(lastSolve);
    sortSolves();
    updateStatistics(true);
  }

  function reset() {
    debug("RESET");
    stopTimer();
    time = 0;
    $state = TimerState.CLEAN;
    $ready = false;
    decimals = true;
    lastSolve = null;
  }

  function keyDown(event: KeyboardEvent) {
    const { code } = event;
    
    switch( $tab ) {
      case 0: {
        debug("KEYDOWN EVENT: ", event);
        if ( code === 'Space' ) {
          if ( !isValid && $state === TimerState.RUNNING ) {
            return;
          }
          isValid = false;

          if ( $state === TimerState.STOPPED || $state === TimerState.CLEAN ) {
            debug('PREVENTION');
            $state = TimerState.PREVENTION;
            time = 0;
            refPrevention = performance.now();
          }
          else if ( $state === TimerState.PREVENTION ) {
            if ( performance.now() - refPrevention > 500 ) {
              debug('READY');
              $ready = true;
            }
          } else if ( $state === TimerState.RUNNING ) {
            debug('STOP');
            stopTimer();
            time = ~~(performance.now() - ref);
            addSolve();
            $state = TimerState.STOPPED;
            $ready = false;
            lastSolve.time = time;
            initScrambler();
          }
        } else if ( ['KeyR', 'Escape', 'KeyS'].indexOf(code) > -1 ) {
          if ( (code === 'KeyS' && !$isRunning) ||
            (code === 'Escape' && $isRunning && $session.settings.scrambleAfterCancel ) ) {
            reset();
            initScrambler();
          } else {
            reset();
          }
          prevExpanded = false;
        } else if ( $state === TimerState.RUNNING ) {
          debug('STOP');
          stopTimer();
          time = ~~(performance.now() - ref);
          addSolve();
          $state = TimerState.STOPPED;
          $ready = false;
          lastSolve.time = time;
          initScrambler();
        }
        break;
      }
      case 1: {
        if ( code === 'Escape' && selected ) {
          selectNone();
        }
        break;
      }
    }
  }

  function stopTimer() {
    if ( time != 0 ) {
      time = performance.now() - ref;
    }
    clearInterval(itv);
  }

  function runTimer(direction: number, roundUp ?: boolean) {
    itv = setInterval(() => {
      let t = (direction < 0) ? ref - performance.now() : performance.now() - ref;

      if ( roundUp ) {
        t = Math.ceil(t / 1000) * 1000;
      }

      if ( t <= 0 ) {
        time = 0;
        stopTimer();
        debug('+2');
        lastSolve.penalty = Penalty.P2;
        return;
      }

      time = ~~t;
    }, 47);
  }

  function createNewSolve() {
    lastSolve = {
      date: null,
      penalty: Penalty.NONE,
      scramble: $scramble,
      time: time,
      comments: '',
      selected: false,
      session: ""
    };
  }

  function keyUp(event: KeyboardEvent) {
    if ( $tab ) {
      return;
    }

    isValid = true;
    if ( event.code === 'Space' ) {
      if ( $state === TimerState.PREVENTION ) {
        if ( $ready ) {
          createNewSolve();
          
          if ( $session.settings.hasInspection ) {
            debug('INSPECTION');
            $state = TimerState.INSPECTION;
            decimals = false;
            time = 0;
            $ready = false;
            ref = performance.now() + $session.settings.inspection * 1000;
            runTimer(-1, true);
          } else {
            debug('RUNNING');
            $state = TimerState.RUNNING;
            $ready = false;
            ref = performance.now();
            decimals = true;
            stopTimer();

            if ( lastSolve.penalty === Penalty.P2 ) {
              ref -= 2000;
            }

            runTimer(1);
          }
        } else {
          debug("CLEAN");
          $state = TimerState.CLEAN;
        }
      } else if ( $state === TimerState.INSPECTION ) {
        debug('RUNNING');
        $state = TimerState.RUNNING;
        ref = performance.now();
        decimals = true;
        stopTimer();

        if ( lastSolve.penalty === Penalty.P2 ) {
          ref -= 2000;
        }

        runTimer(1);
      }
    } else if ( !$isRunning ) {
      if ( event.code === 'KeyE' ) {
        if ( !show || (show && type != 'edit-scramble') ) {
          openDialog('edit-scramble', $scramble, (scr) => scr && initScrambler(scr));
        }
      } else if ( event.code === 'KeyO' ) {
        openDialog('old-scrambles', null, () => {});
      }
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText($scramble).then(() => {
      console.log("Copied to clipboard");
    });
  }

  function modalKeyupHandler(e) {
    let kevent: KeyboardEvent = e.detail;
    kevent.stopPropagation();
    show = (kevent.code === 'Escape' ? modal.close() : show);

    if ( kevent.code === 'Enter' && kevent.ctrlKey ) {
      modal.close( modalData.trim() );
    }
  }

  function select(s: Solve) {
    setConfigFromSolve(s);
    initScrambler(s.scramble);
    modal.close();
  }

  onMount(() => {
    $group = 0;
    selectedGroup();
    updateStatistics(false);
  });

  $: $solves.length === 0 && reset();
</script>

<svelte:window on:keyup={ keyUp } on:keydown={ keyDown }></svelte:window>

<div class="w-full h-full { textColor }">
  <div id="scramble" class="transition-all duration-300">
    {#if !$scramble}
      <span> {stateMessage}
      </span>
    {/if}
    <span class:isRunning={ $isRunning } contenteditable="false" bind:innerHTML={$scramble}></span>
    <div class="absolute top-1 right-12" class:isRunning={ $isRunning }>
      {#each options as option}
        <Tooltip class="cursor-pointer" position="left" text={ option.text }>
          <div class="my-3 mx-1 w-5 h-5 { textColor }" on:click={ option.handler }>
            <svelte:component this={option.icon} width="100%" height="100%"/>
          </div>
        </Tooltip>
      {/each}
    </div>
  </div>

  <div class="absolute w-full top-1/3 text-center" style="font-size: 130px;">
    <span
      class="timer { textColor }"
      class:prevention={ $state === TimerState.PREVENTION }
      class:ready={$ready}
      hidden={$state === TimerState.RUNNING && !$session.settings.showElapsedTime}
      >{timer(time, decimals, false)}</span>
    <span
      class="timer"
      hidden={!($state === TimerState.RUNNING && !$session.settings.showElapsedTime)}>----</span>
    {#if $state === TimerState.STOPPED}
      <div class="flex justify-center w-full" class:show={$state === TimerState.STOPPED}>
        {#each solveControl as control}
          <Tooltip class="cursor-pointer" position="top" text={ control.text }>
            <div class="my-3 mx-1 w-5 h-5 { control.highlight($solves[0] || {}) ? 'text-red-500' : '' }" on:click={ control.handler }>
              <svelte:component this={control.icon} width="100%" height="100%"/>
            </div>
          </Tooltip>
        {/each}
        <!-- <mat-icon (click)="delete([lastSolve])" matTooltip="Delete" matTooltipHideDelay="100" svgIcon="close"></mat-icon>
        <mat-icon [class.highlight]="lastSolve.penalty === 2" (click)="dnf()"  matTooltip="DNF" matTooltipHideDelay="100" svgIcon="thumb-down"></mat-icon>
        <mat-icon [class.highlight]="lastSolve.penalty === 1" (click)="plus2()" matTooltip="+2" matTooltipHideDelay="100" svgIcon="flag-outline"></mat-icon>
        <mat-icon (click)="editSolve(lastSolve)" matTooltip="Comment" matTooltipHideDelay="100" svgIcon="comment-plus-outline"></mat-icon> -->
      </div>
    {/if}
  </div>

  <div id="hints"
    class="bg-white bg-opacity-10 w-max p-2 { textColor } rounded-md
      shadow-md absolute select-none left-0 top-1/4 transition-all duration-1000"
    class:isVisible={$hintDialog && !$isRunning}>

    <table class="inline-block align-middle transition-all duration-300" class:nshow={!$hint}>
      <tr><td>Cross</td> <td>{$cross}</td></tr>
      <tr><td>XCross</td> <td>{$xcross}</td></tr>
      {#if $Ao5}
        <tr>
          <td>Next Ao5</td>
          <td>Between { timer($Ao5[0], false, true) } and { timer($Ao5[1], false, true) }</td>
        </tr>
      {/if}
    </table>

    <div id="bulb"
      class="w-8 h-8 inline-block align-middle mx-0 my-2 cursor-pointer"
      class:nshow={!$hint} on:click={() => $hint = !$hint}>
      <LightBulb width="100%" height="100%"/>
    </div>
  </div>

  <div id="statistics"
    class="{ textColor } pointer-events-none transition-all duration-300"
    class:isRunning={ $isRunning }>

    <div class="left absolute select-none bottom-0 left-0 ">
      <table class="ml-3">
        <tr class:better={$stats.best.better && $stats.__counter > 0 && $stats.best.value > -1}>
          <td>Best:</td>
          {#if !$stats.best.value} <td>N/A</td> {/if}
          {#if $stats.best.value} <td>{ timer($stats.best.value, false, true) }</td> {/if}
        </tr>
        <tr>
          <td>Worst:</td>
          {#if !$stats.worst.value} <td>N/A</td> {/if}
          {#if $stats.worst.value} <td>{ timer($stats.worst.value, false, true) }</td> {/if}
        </tr>
        <tr class:better={$stats.avg.better && $stats.__counter > 0}>
          <td>Average:</td>
          {#if !$stats.avg.value} <td>N/A</td> {/if}
          {#if $stats.avg.value} <td>{ timer($stats.avg.value, false, true) }</td> {/if}
        </tr>
        <tr>
          <td>Deviation:</td>
          {#if !$stats.dev.value} <td>N/A</td> {/if}
          {#if $stats.dev.value} <td>{ timer($stats.dev.value, false, true) }</td> {/if}
        </tr>
        <tr>
          <td>Count:</td>
          <td>{ $stats.count.value }</td>
        </tr>
        <tr class:better={$stats.Mo3.better && $stats.__counter > 0 && $stats.Mo3.value > -1}>
          <td>Mo3:</td>
          {#if !($stats.Mo3.value > -1)} <td>N/A</td> {/if}
          {#if ($stats.Mo3.value > -1)} <td>{ timer($stats.Mo3.value, false, true) }</td> {/if}
        </tr>
        <tr class:better={$stats.Ao5.better && $stats.__counter > 0 && $stats.Ao5.value > -1}>
          <td>Ao5:</td>
          {#if !($stats.Ao5.value > -1)} <td>N/A</td> {/if}
          {#if ($stats.Ao5.value > -1)} <td>{ timer($stats.Ao5.value, false, true) }</td> {/if}
        </tr>
      </table>
    </div>
    <div class="right absolute select-none bottom-0 right-0">
      <table class="mr-3">
        {#each [ "Ao12", "Ao50", "Ao100", "Ao200", "Ao500", "Ao1k", "Ao2k" ] as stat}
          <tr class:better={$stats[stat].better && $stats.__counter > 0 && $stats[stat].value > -1}>
            <td>{stat}:</td>
            {#if !($stats[stat].value > -1)} <td>N/A</td> {/if}
            {#if ($stats[stat].value > -1)} <td>{ timer($stats[stat].value, false, true) }</td> {/if}
          </tr>
        {/each}
      </table>
    </div>
  </div>

  {#if $session?.settings?.genImage}
  <div
    id="preview-container"
    class="absolute bottom-2 flex items-center justify-center w-full transition-all duration-300
      select-none bg-transparent h"
    class:expanded={ prevExpanded }
    class:isRunning={ $isRunning }
    on:click={() => prevExpanded = !prevExpanded }>
    <img
      on:dragstart|preventDefault
      class="bottom-2 transition-all duration-300 cursor-pointer w-full h-full object-contain"
      src={ $preview } alt="">
  </div>
  {/if}

  <Modal bind:this={ modal } bind:show={ show } onClose={ closeHandler }>
    <div class="max-w-lg max-h-96 overflow-scroll">
      {#if type === 'edit-scramble'}
        <TextArea on:keyup={ modalKeyupHandler }
          class="bg-gray-600 text-gray-200"
          bind:value={ modalData }/>
        <div class="flex w-full justify-center my-2">
          <Button on:click={() => modal.close()}>Cancel</Button>
          <Button on:click={() => modal.close( modalData.trim() )}>Save</Button>
        </div>
      {/if}

      {#if type === 'old-scrambles'}
        <div class="grid grid-cols-4 w-full text-center">
          <h2 class="col-span-3">Scramble</h2>
          <h2 class="col-span-1">Time</h2>
          {#each $solves as s }
            <span class="
              col-span-3 cursor-pointer hover:text-blue-400 my-2 text-left
              text-ellipsis overflow-hidden whitespace-nowrap
            " on:click={ () => select(s) }>{ s.scramble }</span>
            <span class="col-span-1 flex items-center justify-center">{ timer(s.time, false, true) }</span>
          {/each}
        </div>
      {/if}

      {#if type === 'settings'}
        <section>
          <Checkbox
            bind:checked={ modalData.settings.hasInspection }
            class="w-5 h-5" label="Inspection"/>
          
          <Input type="number" class="mt-2 bg-gray-700 hidden-markers { modalData.settings.hasInspection ? 'text-gray-200' : '' }"
            disabled={ !modalData.settings.hasInspection } bind:value={ modalData.settings.inspection }
            min={5} max={60} step={5}/>
        </section>
        <section>
          <Checkbox bind:checked={ modalData.settings.showElapsedTime } class="w-5 h-5 my-2" label="Show time when running"/>
        </section>
        <section>
          <Checkbox bind:checked={ modalData.settings.genImage } class="w-5 h-5 my-2" label="Generate image from scramble"/>
          <i class="text-sm">(This can hurt performance for complex cubes)</i>
        </section>
        <section>
          <Checkbox bind:checked={ modalData.settings.scrambleAfterCancel } class="w-5 h-5 my-2" label="Refresh scramble after cancel"/>
        </section>
        <section class="mt-4">
          AoX calculation:
          <div class="flex gap-2 items-center">
            <Toggle checked={ !!modalData.settings.calcAoX } on:change={ (v) => modalData.settings.calcAoX = ~~v.detail.value }/>
            <span class="ml-3">{ ['Sequential', 'Group of X'][ ~~modalData.settings.calcAoX ] }</span>
          </div>
        </section>
        <section class="flex mt-4">
          <Button flat on:click={ () => modal.close() }>Cancel</Button>
          <Button flat on:click={ () => modal.close(true) }>Save</Button>
        </section>
      {/if}
    </div>
  </Modal>
</div>

<style lang="postcss">
  @keyframes bump {
    0% {
      font-size: 110px;
    }
    50% {
      font-size: 125px;
    }
    100% {
      font-size: 110px;
    }
  }
  
  #scramble span {
    @apply ml-16 mr-10 inline-block text-center;
    font-size: 1.5em;
    width: calc(100% - 240px);
    word-spacing: 10px;
  }

  table.nshow {
    margin: 0;
    font-size: 0;
  }

  table:not(.nshow) {
    font-size: inherit;
    margin: 0px 8px;
  }

  #hints:not(.isVisible) {
    left: -80px;
  }
  
  #hints:not(.isVisible) table {
    font-size: 0;
    margin: 0;
  }

  #bulb.nshow {
    @apply ml-0 text-amber-300;
  }

  #statistics tr.better {
    text-decoration: underline;
    font-weight: bold;
  }

  .left table, .right table {
    @apply p-0 mb-4;
  }

  .timer {
    font-family: 'lcd4';
    user-select: none;
  }

  .timer.prevention {
    @apply text-red-800;
  }

  .timer.ready {
    @apply text-green-700;
    animation: bump 300ms 1;
  }

  #preview-container {
    height: 25%;
    transition: all 400ms cubic-bezier(0.88, 0.33, 0.32, 1.19);
    transition-timing-function: cubic-bezier(0.88, 0.33, 0.32, 1.19);
  }

  #preview-container.expanded {
    height: 98%;
    background-color: rgba(0, 0, 0, 0.4);
  }

  .isRunning {
    @apply transition-all duration-200 pointer-events-none opacity-0;
  }
</style>