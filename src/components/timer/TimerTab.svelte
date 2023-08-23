<script lang="ts">
  /// Types
  import { Penalty, TimerState, TIMER_INPUT, type InputContext, type Language, type Solve, type TimerContext, type TimerInputHandler } from '@interfaces';

  /// Icons
  import Close from '@icons/Close.svelte';
  import ThumbDown from '@icons/ThumbDown.svelte';
  import Flag from '@icons/FlagOutline.svelte';
  import Refresh from '@icons/Refresh.svelte';
  import Pencil from '@icons/PencilOutline.svelte';
  import Calendar from '@icons/CalendarTextOutline.svelte';
  import Copy from '@icons/ContentCopy.svelte';

  // @ts-ignore
  import Settings from '@icons/Settings.svelte';
  import LightBulb from '@icons/LightbulbOn.svelte';
  import NoteIcon from '@icons/NoteEdit.svelte';
  import WatchOnIcon from '@icons/Wifi.svelte';
  import WatchOffIcon from '@icons/WifiOff.svelte';
  import CommentIcon from '@icons/CommentPlusOutline.svelte';

  /// Components
  import Tooltip from '@material/Tooltip.svelte';
  import Modal from '@components/Modal.svelte';
  import Button from '@components/material/Button.svelte';
  import TextArea from '@components/material/TextArea.svelte';
  import Checkbox from '@components/material/Checkbox.svelte';
  import Input from '@components/material/Input.svelte';
  import Toggle from '@components/material/Toggle.svelte';
  import Select from '@components/material/Select.svelte';

  /// Helpers
  import { sTimer, timer, timerToMilli } from '@helpers/timer';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { DataService } from '@stores/data.service';
  import { NotificationService } from '@stores/notification.service';
  import { derived, writable, type Readable, type Writable } from 'svelte/store';
  import { KeyboardInput } from './input-handlers/Keyboard';
  import { StackmatInput } from './input-handlers/Stackmat';
  import { ManualInput } from './input-handlers/Manual';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
    import { stopPropagation } from '@helpers/DOM';
 
  export let context: TimerContext;
  export let battle = false;
  export let enableKeyboard = true;

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  const {
    state, ready, tab, solves, allSolves, session, Ao5, stats, scramble,
    group, mode, hintDialog, hint, cross, xcross, preview, isRunning, decimals,
    sortSolves, initScrambler, updateStatistics, selectedGroup, setConfigFromSolve, editSolve
  } = context;

  const dispatch = createEventDispatcher();
  const notification = NotificationService.getInstance();

  /// CLOCK
  const TIMER_DIGITS = /^\d+$/;
  const TIMER_DNF = /^\s*dnf\s*$/i;
  let time: Writable<number> = writable(0);
  let timeStr: string = '';
  let solveControl = [
    { text: "Delete", icon: Close, highlight: () => false, handler: () => {
      if ( $lastSolve ) {
        dataService.removeSolves([ $lastSolve ]);
        $time = 0;
        reset();
      }
    }},
    { text: "DNF", icon: ThumbDown, highlight: (s: any) => s.penalty === Penalty.DNF, handler: () => {
      if ( $lastSolve ) {
        $lastSolve.penalty = $lastSolve.penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF;
        $time = $lastSolve.penalty === Penalty.DNF ? Infinity : $lastSolve.time;
        battle ? dispatch('update', $lastSolve) : dataService.updateSolve($lastSolve);
      }
    } },
    { text: "+2", icon: Flag, highlight: (s: any) => s.penalty === Penalty.P2, handler: () => {
      if ( $lastSolve ) {
        $lastSolve.penalty = $lastSolve.penalty === Penalty.P2 ? Penalty.NONE : Penalty.P2;
        $lastSolve.penalty === Penalty.P2 ? $lastSolve.time += 2000 : $lastSolve.time -= 2000;
        $time = $lastSolve.time;

        if ( battle ) {
          dispatch('update', $lastSolve);
        } else {
          dataService.updateSolve($lastSolve);
        }
      }
    } },
    { text: "Comments", icon: CommentIcon, highlight: () => false, handler: () => {
      if ( $lastSolve ) {
        editSolve( $lastSolve );
      }
    } }
  ];

  /// LAYOUT
  const textColor = 'text-gray-400';
  let selected: number = 0;
  let lastSolve: Writable<Solve | null> = writable(null);
  let prob = -1;
  let prevExpanded: boolean = false;
  let stackmatStatus: Writable<boolean> = writable(false);
  let inputContext: InputContext = {
    isRunning, lastSolve, ready, session, state, time, stackmatStatus, decimals,
    addSolve, initScrambler, reset, createNewSolve
  };

  let inputMethod: TimerInputHandler = new KeyboardInput(inputContext);
  let deviceID = 'default';
  let deviceList: string[][] = [];
  let autoConnectId: string[] = [];

  /// NOTES
  let showNotes = false;
  let notesW = 250;
  let notesH = 250;
  let notesL = document.body.clientWidth - notesW - 50;
  let notesT = (document.body.clientHeight - notesH) / 2;
  let noteContent = "";

  /// MODAL
  let modal: any = null;
  let show = false;
  let type = '';
  let modalData: any = null;
  let closeHandler: Function = () => {};

  /// SCRAMBLE
  let stateMessage: string = '...';
  let openDialog = (ev: string, dt: any, fn: Function) => {
    type = ev; modalData = dt; closeHandler = fn; show = true;
  };
  
  let options = [
    { text: "Reload scramble [Ctrl + S]", icon: Refresh, handler: () => initScrambler() },
    { text: "Edit [Ctrl + E]", icon: Pencil, handler: () => {
      openDialog('edit-scramble', $scramble, (scr: string) => scr && initScrambler(scr));
    } },
    { text: "Use old scramble [Ctrl + O]", icon: Calendar, handler: () => {
      openDialog('old-scrambles', null, () => {});
    } },
    { text: "Copy scramble [Ctrl + C]", icon: Copy, handler: () => copyToClipboard() },
    { text: "Notes [Ctrl + N]", icon: NoteIcon, handler: () => showNotes = true },
    { text: "Settings", icon: Settings, handler: () => {
      let initialCalc = $session?.settings?.calcAoX;
    
      if ( !$session.settings.input ) {
        $session.settings.input = 'Keyboard';
      }

      openDialog('settings', $session, (data: any) => {
        if ( data ) {
          initInputHandler();
          dataService.updateSession($session);
          initialCalc != $session.settings.calcAoX && updateStatistics(false);
        }
      });
    } },
  ];

  const dataService = DataService.getInstance();

  function selectNone() {
    selected = 0;
    $solves.forEach(s => s.selected = false);
  }

  function addSolve(t?: number, p?: Penalty) {
    let ls = $lastSolve as Solve;
    
    ls.date = Date.now();
    ls.group = $group;
    ls.mode = $mode[1];
    ls.len = $mode[2];
    ls.prob = prob;
    ls.session = $session._id;
    ls.penalty = p || Penalty.NONE;
    ls.time = t || $time;
    
    $lastSolve = ls;
    $allSolves.push( ls );
    $solves.push( ls );

    if ( battle ) {
      ls.group = -1;
      dispatch('solve', $lastSolve);
    } else {
      dataService.addSolve(ls);
      sortSolves();
      updateStatistics(true);
    }
  }

  function keyDown(event: KeyboardEvent) {
    const { code } = event;

    if ( !enableKeyboard ) return;
    
    switch( $tab ) {
      case 0: {
        inputMethod.keyDownHandler(event);
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

  function createNewSolve() {
    $lastSolve = {
      date: Date.now(),
      penalty: Penalty.NONE,
      scramble: $scramble,
      time: $time,
      comments: '',
      selected: false,
      session: ""
    };
  }

  function reset() {
    inputMethod.stopTimer();
    $time = 0;
    $state = TimerState.CLEAN;
    $ready = false;
    $lastSolve = null;
  }

  function keyUp(event: KeyboardEvent) {
    if ( $tab || !enableKeyboard ) {
      return;
    }
    
    inputMethod.keyUpHandler(event);
    
    const { code } = event;
    
    if ( code != 'Space' && !$isRunning && !battle ) {
      if ( code === 'KeyE' && event.ctrlKey ) {
        if ( !show || (show && type != 'edit-scramble') ) {
          openDialog('edit-scramble', $scramble, (scr: string) => scr && initScrambler(scr));
        }
      } else if ( code === 'KeyO' && event.ctrlKey ) {
        openDialog('old-scrambles', null, () => {});
      } else if ( code === 'KeyC' && event.ctrlKey ) {
        copyToClipboard();
      } else if ( code === 'KeyN' && event.ctrlKey ) {
        showNotes = true;
      } else if ( code === 'KeyS' && event.ctrlKey ) {
        initScrambler();
      }
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText($scramble).then(() => {
      notification.addNotification({
        key: crypto.randomUUID(),
        header: $localLang.global.done,
        text: $localLang.global.scrambleCopied,
        timeout: 1000
      });
    });
  }

  function modalKeyupHandler(e: CustomEvent) {
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

  let mx = 0, my = 0, cx = notesL, cy = notesT, dragging = false;

  function handleMouseDown(e: MouseEvent) {
    mx = e.clientX;
    my = e.clientY;
    cx = notesL;
    cy = notesT;
    dragging = true;
  }

  function handleMouseMove(e: MouseEvent) {
    if ( dragging ) {
      notesL = cx + e.clientX - mx;
      notesT = cy + e.clientY - my;
    }
  }

  function handleMouseUp() {
    dragging = false;
  }

  function addTimeString() {
    if ( !TIMER_DIGITS.test(timeStr) && !TIMER_DNF.test(timeStr) ) {
      timeStr = '';
      return;
    }

    createNewSolve();

    if ( TIMER_DIGITS.test(timeStr) ) {
      addSolve( timerToMilli(+timeStr) );
    } else if ( TIMER_DNF.test(timeStr) ) {
      addSolve( 0, Penalty.DNF );
    }
    
    !battle && initScrambler();
    timeStr = '';
  }

  function validTimeStr(t: string): boolean {
    return TIMER_DIGITS.test(t) || TIMER_DNF.test(t) || t === '';
  }

  function initInputHandler() {
    dataService.sleep(false);
    inputMethod.disconnect();

    if ( $session?.settings?.input === 'Manual' && !(inputMethod instanceof ManualInput) ) {
      inputMethod = new ManualInput();
    } else if ( $session?.settings?.input === 'StackMat' && !(inputMethod instanceof StackmatInput) ) {
      inputMethod = new StackmatInput( inputContext );
      dataService.sleep(true);
    } else {
      inputMethod = new KeyboardInput( inputContext );
    }

    inputMethod.init(deviceID, true);
  }

  function updateDevices() {
    StackmatInput.updateInputDevices().then(dev => {
      deviceList = dev;
    });

    autoConnectId.forEach(id => {
      notification.removeNotification(id);
    });

    autoConnectId.length = 0;

    // Auto detect
    StackmatInput.autoDetect().then((res) => {
      if ( inputMethod instanceof StackmatInput && inputMethod.getDevice() === res.device ) {
        return;
      }

      let key = res.id;
      autoConnectId.push(key);
      
      notification.addNotification({
        header: $localLang.TIMER.stackmatAvailableHeader,
        text: $localLang.TIMER.stackmatAvailableText,
        fixed: true,
        actions: [
          { text: $localLang.TIMER.cancel, callback: () => {} },
          { text: $localLang.TIMER.connect, callback: () => {
            deviceID = res.device;
            $session.settings.input = 'StackMat';
            initInputHandler();
            dataService.updateSession($session);
          } },
        ],
        key,
      });
    })
    .catch(() => {});
  }

  function updateTexts() {
    solveControl[0].text = $localLang.TIMER.delete;
    solveControl[3].text = $localLang.TIMER.comments;
    options[0].text = `${ $localLang.TIMER.reloadScramble } [Ctrl + S]`;
    options[1].text = `${ $localLang.TIMER.edit } [Ctrl + E]`;
    options[2].text = `${ $localLang.TIMER.useOldScramble } [Ctrl + O]`;
    options[3].text = `${ $localLang.TIMER.copyScramble } [Ctrl + C]`;
    options[4].text = `${ $localLang.TIMER.notes } [Ctrl + N]`;
    options[5].text = `${ $localLang.TIMER.settings }`;
  }

  onMount(() => {
    navigator.mediaDevices.addEventListener('devicechange', updateDevices);

    initInputHandler();
    $group = 0;
    selectedGroup();
    updateStatistics(false);
    updateDevices();
  });

  onDestroy(() => {
    inputMethod.disconnect();
    navigator.mediaDevices.removeEventListener('devicechange', updateDevices);
  });

  $: $solves.length === 0 && reset();
  $: $session && initInputHandler();
  $: $localLang, updateTexts();
</script>

<svelte:window
  on:keyup={ keyUp }
  on:keydown={ keyDown }
  on:mousemove={ handleMouseMove }
  on:mouseup={ handleMouseUp }
  ></svelte:window>
  
  <!-- on:pointerdown|self={ pointerDown }
  on:pointerup={ pointerUp } -->
  <!-- on:touchstart|self={ pointerDown } -->
  <!-- on:touchend={ pointerUp } -->
<div
  class="w-full h-full { textColor }"
  >
  <!-- Scramble and options -->
  <div id="scramble" class="transition-all duration-300">
    {#if !$scramble}
      <span> {stateMessage} </span>
    {/if}
    <span
      class:isRunning={ $isRunning }
      class:battle={ battle }
      contenteditable="false" bind:innerHTML={$scramble}></span>

    <div class="absolute top-1 right-12 flex flex-col" class:isRunning={ $isRunning }>
      {#each options.filter((e, p) => !battle ? true : p === 3 || p === 5) as option}
        <Tooltip class="cursor-pointer" position="left" text={ option.text } hasKeybinding>
          <button aria-label={ option.text } tabindex="0" class="my-3 mx-1 w-5 h-5 { textColor }"
            on:click={ option.handler } on:keydown={ (e) => e.code === 'Space' ? e.preventDefault() : null }>
            <svelte:component this={option.icon} width="100%" height="100%"/>
          </button>
        </Tooltip>
      {/each}
    </div>
  </div>

  <!-- Notes -->
  {#if showNotes && !battle}
    <div id="notes" class="fixed z-10 w-56 h-56 bg-violet-400 rounded-md" style="
      --left: { notesL }px;
      --top: { notesT }px;
      --width: { notesW }px;
      --height: calc({ notesH }px + 1.5rem);
    ">
      <div class="relative w-full h-6 cursor-move flex items-center" on:mousedown={ handleMouseDown }>
        <span class="ml-auto mr-2 cursor-pointer text-gray-700" on:click={ () => showNotes = false }>
          <Close width="1.2rem" height="1.2rem"/>
        </span>
      </div>
      <TextArea bind:value={ noteContent } cClass="w-full h-full" class="bg-gray-600 text-gray-300 p-4"></TextArea>
    </div>
  {/if}

  <!-- Timer -->
  <div id="timer" class="absolute top-1/3 text-9xl h-32 flex flex-col items-center justify-center">
    {#if $session?.settings?.input === 'Manual'}
      <div id="manual-inp">
        <Input
          bind:value={ timeStr } stopKeyupPropagation
          on:UENTER={ addTimeString }
          class="w-full h-36 text-center {
            validTimeStr(timeStr) ? '' :  'border-red-400 border-2' }
            focus-within:shadow-black"
          inpClass="text-center"/>
      </div>
    {:else}
      <span
        class="timer { textColor }"
        class:prevention={ $state === TimerState.PREVENTION }
        class:ready={$ready}
        hidden={$state === TimerState.RUNNING && !$session.settings.showElapsedTime}>
          { $state === TimerState.STOPPED ? sTimer($lastSolve, $decimals, false) : timer($time, $decimals, false)}
        </span>
      
      {#if $session?.settings?.input === 'StackMat' }
        <span class="text-2xl flex gap-2 items-center">
          { $localLang.TIMER.stackmatStatus }:
          
          <span class={ $stackmatStatus ? 'text-green-600' : 'text-red-600' }>
            <svelte:component this={ $stackmatStatus ? WatchOnIcon : WatchOffIcon }/>
          </span>
        </span>
      {/if}
    {/if}
    <span
      class="timer"
      hidden={!($state === TimerState.RUNNING && !$session.settings.showElapsedTime)}>----</span>
    {#if $state === TimerState.STOPPED}
      <div class="flex justify-center w-full" class:show={$state === TimerState.STOPPED}>
        {#each solveControl.slice(Number(battle), solveControl.length) as control}
          <Tooltip class="cursor-pointer" position="top" text={ control.text }>
            <div class="my-3 mx-1 w-5 h-5 { control.highlight($solves[0] || {}) ? 'text-red-500' : '' }" on:click={ control.handler }>
              <svelte:component this={control.icon} width="100%" height="100%"/>
            </div>
          </Tooltip>
        {/each}
      </div>
    {/if}
  </div>

  {#if !battle}
    <!-- Hints -->
    <div id="hints"
      class="bg-white bg-opacity-10 w-max p-2 { textColor } rounded-md
        shadow-md absolute select-none left-0 top-1/4 transition-all duration-1000"
      class:isVisible={$hintDialog && !$isRunning}>

      <table class="inline-block align-middle transition-all duration-300" class:nshow={!$hint}>
        <tr><td>{ $localLang.TIMER.cross }</td> <td class="text-yellow-500">{$cross}</td></tr>
        <tr><td>XCross</td> <td class="text-yellow-500">{$xcross}</td></tr>
        {#if $Ao5}
          <tr>
            <td>{ $localLang.TIMER.nextAo5 }</td>
            <td class="text-yellow-500">[{ timer($Ao5[0], false, true) }, { timer($Ao5[1], false, true) }]</td>
          </tr>
        {/if}
      </table>

      <div id="bulb"
        class="w-8 h-8 inline-block align-middle mx-0 my-2 cursor-pointer"
        class:nshow={!$hint} on:click={() => $hint = !$hint}>
        <LightBulb width="100%" height="100%"/>
      </div>
    </div>

    <!-- Statistics -->
    <div id="statistics"
      class="{ textColor } pointer-events-none transition-all duration-300"
      class:isRunning={ $isRunning }>

      <div class="left absolute select-none bottom-0 left-0 ">
        <table class="ml-3">
          <tr class:better={$stats.best.better && $stats.counter.value > 0 && $stats.best.value > -1}>
            <td>{ $localLang.TIMER.best }:</td>
            {#if !$stats.best.value} <td>N/A</td> {/if}
            {#if $stats.best.value} <td>{ timer($stats.best.value, true, true) }</td> {/if}
          </tr>
          <tr>
            <td>{ $localLang.TIMER.worst }:</td>
            {#if !$stats.worst.value} <td>N/A</td> {/if}
            {#if $stats.worst.value} <td>{ timer($stats.worst.value, true, true) }</td> {/if}
          </tr>
          <tr class:better={$stats.avg.better && $stats.counter.value > 0}>
            <td>{ $localLang.TIMER.average }:</td>
            {#if !$stats.avg.value} <td>N/A</td> {/if}
            {#if $stats.avg.value} <td>{ timer($stats.avg.value, true, true) }</td> {/if}
          </tr>
          <tr>
            <td>{ $localLang.TIMER.deviation }:</td>
            {#if !$stats.dev.value} <td>N/A</td> {/if}
            {#if $stats.dev.value} <td>{ timer($stats.dev.value, true, true) }</td> {/if}
          </tr>
          <tr>
            <td>{ $localLang.TIMER.count }:</td>
            <td>{ $stats.count.value }</td>
          </tr>
          <tr class:better={$stats.Mo3.better && $stats.counter.value > 0 && $stats.Mo3.value > -1}>
            <td>Mo3:</td>
            {#if !($stats.Mo3.value > -1)} <td>N/A</td> {/if}
            {#if ($stats.Mo3.value > -1)} <td>{ timer($stats.Mo3.value, true, true) }</td> {/if}
          </tr>
          <tr class:better={$stats.Ao5.better && $stats.counter.value > 0 && $stats.Ao5.value > -1}>
            <td>Ao5:</td>
            {#if !($stats.Ao5.value > -1)} <td>N/A</td> {/if}
            {#if ($stats.Ao5.value > -1)} <td>{ timer($stats.Ao5.value, true, true) }</td> {/if}
          </tr>
        </table>
      </div>
      <div class="right absolute select-none bottom-0 right-0">
        <table class="mr-3">
          {#each [ "Ao12", "Ao50", "Ao100", "Ao200", "Ao500", "Ao1k", "Ao2k" ] as stat}
            <tr class:better={$stats[stat].better && $stats.counter.value > 0 && $stats[stat].value > -1}>
              <td>{stat}:</td>
              {#if !($stats[stat].value > -1)} <td>N/A</td> {/if}
              {#if ($stats[stat].value > -1)} <td>{ timer($stats[stat].value, true, true) }</td> {/if}
            </tr>
          {/each}
        </table>
      </div>
    </div>
  {/if}

  <!-- Image -->
  {#if $session?.settings?.genImage || battle}
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
    <div class="max-w-lg max-h-[30rem]">
      {#if type === 'edit-scramble'}
        <TextArea on:keyup={ modalKeyupHandler }
          class="bg-gray-600 text-gray-200"
          bind:value={ modalData }/>
        <div class="flex w-full justify-center my-2">
          <Button ariaLabel={ $localLang.TIMER.cancel } on:click={() => modal.close()}>
            { $localLang.TIMER.cancel }
          </Button>
          <Button ariaLabel={ $localLang.TIMER.save } on:click={() => modal.close( modalData.trim() )}>
            { $localLang.TIMER.save }
          </Button>
        </div>
      {/if}

      {#if type === 'old-scrambles'}
        <div class="grid grid-cols-4 w-full text-center">
          <h2 class="col-span-3">{ $localLang.TIMER.scramble }</h2>
          <h2 class="col-span-1">{ $localLang.TIMER.time }</h2>
          {#each $solves as s }
            <button aria-label={ $localLang.TIMER.scramble } tabindex="0" class="
              col-span-3 cursor-pointer hover:text-blue-400 my-2 text-left
              text-ellipsis overflow-hidden whitespace-nowrap
            " on:click={ () => select(s) }>{ s.scramble }</button>
            <span class="col-span-1 flex items-center justify-center">{ timer(s.time, false, true) }</span>
          {/each}
        </div>
      {/if}

      {#if type === 'settings'}
        <section class="flex gap-4 items-center mb-4">
          { $localLang.TIMER.inputMethod }: <Select bind:value={ modalData.settings.input } items={ TIMER_INPUT } transform={ (e) => e }/>
        </section>
        {#if modalData.settings.input === 'StackMat'}
          <section class="mb-4"> { $localLang.TIMER.device }: <Select class="max-w-full"
            bind:value={ deviceID } items={ deviceList }
            label={ e => e[1] } transform={e => e[0]}/>
          </section>
        {/if}

        {#if modalData.settings.input === 'Keyboard'}
          <section class="flex gap-4 items-center">
            <Checkbox
            bind:checked={ modalData.settings.hasInspection }
            class="w-5 h-5" label={ $localLang.TIMER.inspection }/>
            
            <Input type="number" class="mt-2 bg-gray-700 hidden-markers { modalData.settings.hasInspection ? 'text-gray-200' : '' }"
            disabled={ !modalData.settings.hasInspection } bind:value={ modalData.settings.inspection }
            min={5} max={60} step={5}/>
          </section>

          <section class="my-2">
            <Checkbox
              bind:checked={ modalData.settings.withoutPrevention }
              class="w-5 h-5" label={ $localLang.TIMER.withoutPrevention }/>

            <i class="text-sm text-yellow-500">({ $localLang.TIMER.withoutPreventionDescription })</i>
          </section>
          
          <section>
            <Checkbox bind:checked={ modalData.settings.showElapsedTime } class="w-5 h-5 my-2" label={ $localLang.TIMER.showTime }/>
          </section>
        {/if}
        
        <section>
          <Checkbox bind:checked={ modalData.settings.genImage } class="w-5 h-5 my-2" label={ $localLang.TIMER.genImage }/>
          <i class="text-sm text-yellow-500">({ $localLang.TIMER.canHurtPerformance })</i>
        </section>
        
        {#if modalData.settings.input != 'Manual'}
          <section class="mt-2">
            <Checkbox bind:checked={ modalData.settings.scrambleAfterCancel }
            class="w-5 h-5 my-2" label={ $localLang.TIMER.refreshScramble }/>
          </section>
        {/if}

        <section>
          <Checkbox bind:checked={ modalData.settings.recordCelebration }
            class="w-5 h-5 my-2" label={ $localLang.TIMER.recordCelebration }/>
        </section>
        <section class="mt-4 flex gap-4">
          { $localLang.TIMER.aoxCalculation }:
          <div class="flex gap-2 items-center">
            <Toggle checked={ !!modalData.settings.calcAoX } on:change={ (v) => modalData.settings.calcAoX = ~~v.detail.value }/>
            <span class="ml-3">{ [$localLang.TIMER.sequential, $localLang.TIMER.groupOfX ][ ~~modalData.settings.calcAoX ] }</span>
          </div>
        </section>
        <section class="flex mt-4">
          <Button ariaLabel={ $localLang.TIMER.cancel } flat on:click={ () => modal.close() }>
            { $localLang.TIMER.cancel }
          </Button>
          <Button ariaLabel={ $localLang.TIMER.save } flat on:click={ () => modal.close(true) }>
            { $localLang.TIMER.save }
          </Button>
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
  
  #scramble {
    @apply flex items-center justify-center;
  }

  #scramble span {
    @apply ml-16 mr-10 inline-block text-center;
    font-size: 1.5em;
    width: calc(100% - 240px);
    word-spacing: 10px;
    max-height: 16rem;
    overflow: scroll;
  }

  #scramble span.battle {
    width: 100%;
    max-width: 45rem;
    margin: 0;
  }

  #timer {
    width: max-content;
    margin-left: 50%;
    transform: translateX(-50%);
  }

  #manual-inp {
    width: 30rem;
  }

  #notes {
    left: var(--left, 0px);
    top: var(--top, 0px);
    width: var(--width, 100px);
    height: var(--height, 100px);
    display: grid;
    grid-template-rows: 1.5rem 1fr;
    resize: both;
    overflow: hidden;
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
    font-family: var(--timer-font);
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