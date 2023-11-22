<script lang="ts">
  /// Types
  import { Penalty, TimerState, TIMER_INPUT, type InputContext, type Language,
    type Solve, type TimerContext, type TimerInputHandler } from '@interfaces';

  /// Icons
  import Close from '@icons/Close.svelte';
  import ThumbDown from '@icons/ThumbDown.svelte';
  import Flag from '@icons/FlagOutline.svelte';
  import Refresh from '@icons/Refresh.svelte';
  import Pencil from '@icons/PencilOutline.svelte';
  import Calendar from '@icons/CalendarTextOutline.svelte';
  import Copy from '@icons/ContentCopy.svelte';
  import Settings from '@icons/Cog.svelte';
  import LightBulb from '@icons/LightbulbOn.svelte';
  import NoteIcon from '@icons/NoteEdit.svelte';
  import WatchOnIcon from '@icons/Wifi.svelte';
  import WatchOffIcon from '@icons/WifiOff.svelte';
  import CommentIcon from '@icons/CommentPlusOutline.svelte';
  import BluetoothOnIcon from '@icons/Bluetooth.svelte';
  import BluetoothOffIcon from '@icons/BluetoothOff.svelte';
  import TuneIcon from '@icons/Tune.svelte';

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

  import { StackmatInput } from './input-handlers/Stackmat';
  import { ManualInput } from './input-handlers/Manual';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { copyToClipboard, randomUUID } from '@helpers/strings';
  import { GANInput } from './input-handlers/GAN';
  import Simulator from '@components/Simulator.svelte';
  import { KeyboardInput } from './input-handlers/Keyboard';
  import { QiYiSmartTimerInput } from './input-handlers/QY-Timer';
  import { statsReplaceId } from '@helpers/statistics';
  import StatsProgress from './StatsProgress.svelte';

  export let context: TimerContext;
  export let battle = false;
  export let enableKeyboard = true;
  export let timerOnly = false;
  export let scrambleOnly = false;
  export let cleanOnScramble = false;

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  const {
    state, ready, tab, solves, allSolves, session, Ao5, stats, scramble, group, mode, hintDialog,
    hint, cross, xcross, preview, isRunning, decimals, bluetoothList,
    setSolves, sortSolves, updateSolves, initScrambler, updateStatistics, selectedGroup,
    setConfigFromSolve, editSolve, handleUpdateSession, handleUpdateSolve, handleRemoveSolves,
    editSessions
  } = context;

  const dispatch = createEventDispatcher();
  const notification = NotificationService.getInstance();
  const dataService = DataService.getInstance();

  /// CLOCK
  const TIMER_DIGITS = /^\d+$/;
  const TIMER_DNF = /^\s*dnf\s*$/i;
  let time: Writable<number> = writable(0);
  let timeStr: string = '';
  let solveControl = [
    { text: "Delete", icon: Close, highlight: () => false, handler: () => {
      if ( $lastSolve ) {
        dataService.removeSolves([ $lastSolve ]).then( handleRemoveSolves );
        $time = 0;
        reset();
      }
    }},
    { text: "DNF", icon: ThumbDown, highlight: (s: any) => s.penalty === Penalty.DNF, handler: () => {
      if ( $lastSolve ) {
        $lastSolve.penalty = $lastSolve.penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF;
        $time = $lastSolve.penalty === Penalty.DNF ? Infinity : $lastSolve.time;
        battle ? dispatch('update', $lastSolve) : dataService.updateSolve($lastSolve).then( handleUpdateSolve );
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
          dataService.updateSolve($lastSolve).then( handleUpdateSolve );
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
  let stackmatStatus = writable(false);
  let isMobile = dataService.isMobile;

  // BLUETOOTH
  let bluetoothStatus = writable(false);
  let bluetoothHardware: any = null;
  let bluetoothBattery: number = 0;

  // ---------------------------------------------------
  let inputContext: InputContext = {
    isRunning, lastSolve, ready, session, state, time, stackmatStatus, decimals, scramble,
    bluetoothStatus, addSolve, initScrambler, reset, createNewSolve
  };

  let inputMethod: TimerInputHandler = new ManualInput();
  let currentStep = writable(1);
  let totalSteps = writable(1);
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
  let canOpenDialog = (ev: string): boolean => {
    if ( timerOnly ) {
      return [ 'settings' ].indexOf(ev) > -1;
    }

    return true;
  };

  let openDialog = (ev: string, dt: any, fn: Function) => {
    if ( !canOpenDialog(ev) ) return;

    type = ev; modalData = dt; closeHandler = fn; show = true;
  };

  // OTHER
  let simulator: Simulator;
  let isSearching = false;
  let isConnecting = false;
  
  let options = [
    { text: "Reload scramble [Ctrl + S]", icon: Refresh, handler: () => initScrambler() },
    { text: "Edit [Ctrl + E]", icon: Pencil, handler: () => {
      openDialog('edit-scramble', $scramble, (scr: string) => scr && initScrambler(scr));
    } },
    { text: "Use old scramble [Ctrl + O]", icon: Calendar, handler: () => {
      openDialog('old-scrambles', null, () => {});
    } },
    { text: "Copy scramble [Ctrl + C]", icon: Copy, handler: () => toClipboard() },
    { text: "Notes [Ctrl + N]", icon: NoteIcon, handler: () => showNotes = true },
    { text: "Settings", icon: Settings, handler: () => {
      let initialCalc = $session?.settings?.calcAoX;
    
      if ( !$session.settings.input ) {
        $session.settings.input = 'Keyboard';
      }

      openDialog('settings', $session, (data: any) => {
        if ( data ) {
          $session = $session;
          
          if ( timerOnly ) return;

          initInputHandler();
          dataService.updateSession($session).then( handleUpdateSession );
          initialCalc != $session.settings.calcAoX && updateStatistics(false);
        }
      });
    } },
  ];

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
    ls._id = randomUUID();
    
    $lastSolve = ls;
    $allSolves.push( ls );
    $solves.push( ls );

    if ( timerOnly || scrambleOnly ) return;

    if ( battle ) {
      ls.group = -1;
      dispatch('solve', $lastSolve);
    } else {
      dataService.addSolve(ls).then(d => {
        let s = $allSolves.find(s => s.date === d.date);

        if (s) {
          statsReplaceId($stats, s._id, d._id);
          s._id = d._id;
          updateSolves();
        }
      });
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
        toClipboard();
      } else if ( code === 'KeyN' && event.ctrlKey ) {
        showNotes = true;
      } else if ( code === 'KeyS' && event.ctrlKey ) {
        initScrambler();
      }
    }
  }

  function toClipboard() {
    copyToClipboard($scramble).then(() => {
      notification.addNotification({
        key: randomUUID(),
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
    const methodMap = {
      "Manual": ManualInput,
      "StackMat": StackmatInput,
      "GAN Cube": GANInput,
      "QY-Timer": QiYiSmartTimerInput,
      "Keyboard": KeyboardInput,
    };

    let newClass = methodMap[$session?.settings?.input || 'Keyboard'];
    let sameClass = true;

    if ( !(inputMethod instanceof newClass) ) {
      sameClass = false;
      inputMethod.disconnect();
    }

    dataService.sleep( newClass === StackmatInput );

    if ( $session?.settings?.input === 'Manual' && !sameClass ) {
      inputMethod = new ManualInput();
    } else if ( $session?.settings?.input === 'StackMat' && !sameClass ) {
      inputMethod = new StackmatInput( inputContext );
      inputMethod.init(deviceID, true);
    } else if ( $session?.settings?.input === 'GAN Cube' && !sameClass ) {
      inputMethod = new GANInput( inputContext );
      inputMethod.init();
    } else if ( $session?.settings?.input === 'QY-Timer' && !sameClass ) {
      inputMethod = new QiYiSmartTimerInput( inputContext );
      inputMethod.init();
    } else if ( $session?.settings?.input === 'Keyboard' ) {
      inputMethod.disconnect();
      let ki = new KeyboardInput( inputContext );
      
      inputMethod = ki;

      currentStep = ki.interpreter.machine.context.currentStep;
      totalSteps = ki.interpreter.machine.context.steps;
      inputMethod.init();
    }
  }

  function updateDevices() {
    StackmatInput.updateInputDevices()?.then(dev => {
      deviceList = dev;

      // if ( inputMethod instanceof StackmatInput && !deviceList.some(e => e[0] === deviceID) ) {
      //   deviceID = deviceList[0][0];
      //   inputMethod.disconnect();
      //   inputMethod.init(deviceID, true);
      // }
    });

    autoConnectId.forEach(id => {
      notification.removeNotification(id);
    });

    autoConnectId.length = 0;

    // Auto detect
    // StackmatInput.autoDetect().then((res) => {
    //   if ( inputMethod instanceof StackmatInput && inputMethod.getDevice() === res.device ) {
    //     return;
    //   }

    //   let key = res.id;
    //   autoConnectId.push(key);
      
    //   notification.addNotification({
    //     header: $localLang.TIMER.stackmatAvailableHeader,
    //     text: $localLang.TIMER.stackmatAvailableText,
    //     fixed: true,
    //     actions: [
    //       { text: $localLang.TIMER.cancel, callback: () => {} },
    //       { text: $localLang.TIMER.connect, callback: () => {
    //         deviceID = res.device;
    //         $session.settings.input = 'StackMat';
    //         initInputHandler();
    //         dataService.updateSession($session);
    //       } },
    //     ],
    //     key,
    //   });
    // })
    // .catch(() => {});
  }

  function updateTexts() {
    solveControl[0].text = $localLang.global.delete;
    solveControl[3].text = $localLang.TIMER.comments;
    options[0].text = `${ $localLang.TIMER.reloadScramble } [Ctrl + S]`;
    options[1].text = `${ $localLang.TIMER.edit } [Ctrl + E]`;
    options[2].text = `${ $localLang.TIMER.useOldScramble } [Ctrl + O]`;
    options[3].text = `${ $localLang.TIMER.copyScramble } [Ctrl + C]`;
    options[4].text = `${ $localLang.TIMER.notes } [Ctrl + N]`;
    options[5].text = `${ $localLang.TIMER.settings }`;
  }

  function searchBluetooth() {
    let gn = modalData.settings.input === 'GAN Cube'
      ? new GANInput( inputContext )
      : new QiYiSmartTimerInput( inputContext );

    isSearching = true;
    $bluetoothList.length = 0;

    dataService.searchBluetooth(gn).then(mac => {
      deviceID = mac;
      inputMethod.disconnect();
      inputMethod = gn;
    }).catch((err) => {
      notification.addNotification({
        key: randomUUID(),
        header: 'Search error',
        text: 'Bluetooth error.',
      });

      console.log("ERROR: ", err);
    }).finally(() => {
      isConnecting = false;
      isSearching = false;
    });
  }

  function connectBluetooth(id: string) {
    if ( id != deviceID ) {
      isSearching = false;
      isConnecting = true;
      dataService.connectBluetoothDevice(id);
    } else {
      inputMethod.disconnect();
    }
  }

  function showBluetoothData() {
    notification.addNotification({
      key: randomUUID(),
      header: 'GAN Cube info',
      text: '',
      html: $bluetoothStatus ? `
        <ul>
          <li>Name: ${ bluetoothHardware?.deviceName || '--' }</li>
          <li>Hardware Version: ${ bluetoothHardware?.hardwareVersion || '--' }</li>
          <li>Software Version: ${ bluetoothHardware?.softwareVersion || '--' }</li>
          <li>Gyroscope: ${ bluetoothHardware?.gyro ?? "--" }</li>
          <li>MAC: ${ deviceID != 'default' ? deviceID : '--' }</li>
          <li>Battery: ${ bluetoothBattery || '--' }%</li>
        </ul>` : `Disconnected`,
      fixed: true,
      actions: [ { text: 'Ok', callback: () => {} } ]
    });
  }

  function clean() {
    $state = TimerState.CLEAN;
    $time = 0;
    $decimals = true;
  }

  onMount(() => {
    if ( timerOnly || scrambleOnly ) {
      return;
    }

    navigator.mediaDevices?.addEventListener('devicechange', updateDevices);

    initInputHandler();
    $group = 0;
    selectedGroup();
    // updateStatistics(false);
    updateDevices();

    // subs = [
    //   dataService.bluetoothSub.subscribe((data) => {
    //     if ( !data ) return;

    //     switch(data.type) {
    //       case 'move': {
    //         simulator.applyMove( data.data[0], data.data[1] );
    //         break;
    //       }

    //       case 'facelet': {
    //         simulator.fromFacelet( data.data );
    //         break;
    //       }

    //       case 'hardware': {
    //         bluetoothHardware = data.data;
    //         break;
    //       }

    //       case 'battery': {
    //         bluetoothBattery = data.data;
    //         break;
    //       }

    //       // case 'connect': {
    //       //   $bluetoothStatus = true;
    //       //   break;
    //       // }

    //       case 'disconnect': {
    //         // $bluetoothStatus = false;
    //         deviceID = '';
    //         break;
    //       }
    //     }
    //   })
    // ];
  });

  onDestroy(() => {
    inputMethod.disconnect();
    navigator.mediaDevices?.removeEventListener('devicechange', updateDevices);
    // subs.forEach(s => s());
    document.querySelectorAll('#stackmat-signal').forEach(e => e.remove());
  });

  $: $solves.length === 0 && reset();
  $: $session && initInputHandler();
  $: $localLang, updateTexts();
  $: $scramble && cleanOnScramble && clean();
</script>

<svelte:window
  on:keyup={ keyUp }
  on:keydown={ keyDown }
  on:mousemove={ handleMouseMove }
  on:mouseup={ handleMouseUp }
></svelte:window>

<div
  class="w-full h-full { textColor } { (timerOnly || scrambleOnly) ? 'mt-8' : '' }"
  >
  {#if !timerOnly }
    <!-- Scramble -->
    <div id="scramble" class="transition-all duration-300 max-md:text-xs max-md:leading-5">
      {#if !$scramble}
        <span> {stateMessage} </span>
      {/if}
      <span
        class:hide={ $isRunning }
        class:battle={ battle }
        contenteditable="false" bind:innerHTML={$scramble}></span>

      <!-- Options -->
      {#if !scrambleOnly }
        <div class="absolute md:top-1 md:right-12 md:flex md:flex-col
          max-md:left-1/2 max-md:-translate-x-[50%] max-md:top-[11rem] max-md:w-max" class:hide={ $isRunning }>
          {#each options.filter((e, p) => !battle ? true : p === 3 || p === 5) as option}
            {#if !$isMobile}
              <Tooltip class="cursor-pointer" position="left" text={ option.text } hasKeybinding>
                <button aria-label={ option.text } tabindex="0" class="my-3 mx-1 w-5 h-5 { textColor }"
                  on:click={ option.handler } on:keydown={ (e) => e.code === 'Space' ? e.preventDefault() : null }>
                  <svelte:component this={option.icon} width="100%" height="100%"/>
                </button>
              </Tooltip>
            {:else}
              <button aria-label={ option.text } tabindex="0" class="my-3 mx-2 w-5 h-5 { textColor }"
                on:click={ option.handler } on:keydown={ (e) => e.code === 'Space' ? e.preventDefault() : null }>
                <svelte:component this={option.icon} width="100%" height="100%"/>
              </button>
            {/if}
          {/each}

          {#if $isMobile}
            <button on:click={ editSessions } class="cursor-pointer"><TuneIcon size="1.2rem"/> </button>
          {/if}

          {#if $session?.settings?.input === 'GAN Cube'}
            {#if !$isMobile}
              <Tooltip class="cursor-pointer" position="left" text={ 'GAN Cube' } hasKeybinding>
                <button aria-label={ 'GAN Cube' } tabindex="0" class="my-3 mx-1 w-5 h-5 { $bluetoothStatus ? 'text-blue-600' : textColor }"
                  on:click={ showBluetoothData } on:keydown={ (e) => e.code === 'Space' ? e.preventDefault() : null }>
                  <svelte:component this={ $bluetoothStatus ? BluetoothOnIcon : BluetoothOffIcon } width="100%" height="100%"/>
                </button>
              </Tooltip>
            {:else}
              <button aria-label={ 'GAN Cube' } tabindex="0" class="my-3 mx-1 w-5 h-5 { $bluetoothStatus ? 'text-blue-600' : textColor }"
                on:click={ showBluetoothData } on:keydown={ (e) => e.code === 'Space' ? e.preventDefault() : null }>
                <svelte:component this={ $bluetoothStatus ? BluetoothOnIcon : BluetoothOffIcon } width="100%" height="100%"/>
              </button>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Notes -->
    {#if showNotes && !battle}
      <div id="notes" class="fixed z-10 w-56 h-56 bg-violet-400 rounded-md" style="
        --left: { notesL }px;
        --top: { notesT }px;
        --width: { notesW }px;
        --height: calc({ notesH }px + 1.5rem);
      ">
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="relative w-full h-6 cursor-move flex items-center" on:mousedown={ handleMouseDown }>
          <button class="ml-auto mr-2 cursor-pointer text-gray-700" on:click={ () => showNotes = false }>
            <Close width="1.2rem" height="1.2rem"/>
          </button>
        </div>
        <TextArea bind:value={ noteContent } cClass="w-full h-full" class="bg-gray-600 text-gray-300 p-4"></TextArea>
      </div>
    {/if}
  {:else}
    <div class="absolute top-1/3 right-12 flex flex-col" class:hide={ $isRunning }>
      {#each options.filter((e, p) => p === 5) as option}
        <Tooltip class="cursor-pointer" position="left" text={ option.text } hasKeybinding>
          <button aria-label={ option.text } tabindex="0" class="my-3 mx-1 w-5 h-5 { textColor }"
            on:click={ option.handler } on:keydown={ (e) => e.code === 'Space' ? e.preventDefault() : null }>
            <svelte:component this={option.icon} width="100%" height="100%"/>
          </button>
        </Tooltip>
      {/each}
    </div>
  {/if}

  <!-- Timer -->
  {#if !scrambleOnly}
    <div id="timer" class={ "absolute text-9xl flex flex-col items-center justify-center " + 
      ($session?.settings?.input === 'GAN Cube' ? 'bottom-8 h-auto' : 'top-[40%] h-32') }>

      <!-- Cube3D -->
      {#if $session?.settings?.input === 'GAN Cube'}
        <section class="relative cube-3d">
          <Simulator
            enableDrag={ false }
            enableKeyboard={ false }
            gui={ false }
            contained={ true }
            showBackFace={ $session?.settings?.showBackFace }
            bind:this={ simulator }
          />
        </section>
      {/if}

      {#if $session?.settings?.input === 'Manual'}
        <div id="manual-inp">
          <Input
            bind:value={ timeStr } stopKeyupPropagation
            on:UENTER={ addTimeString }
            class="w-full max-md:w-[min(90%,20rem)] mx-auto h-36 text-center mt-16 {
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
        
        {#if $session.settings.sessionType === 'multi-step' && $state === TimerState.RUNNING }
          <div class="step-progress w-[min(100%,30rem)] text-base">
            <StatsProgress value={ $currentStep } total={ $totalSteps }
              title={ ($session.settings.stepNames || [])[$currentStep - 1] || '' }
              label={ `${ $currentStep } / ${ $totalSteps }` }/>
          </div>
        {/if}

        {#if $session?.settings?.input === 'StackMat' }
          <span class="text-2xl flex gap-2 items-center">
            { $localLang.TIMER.stackmatStatus }:
            
            <span class={ $stackmatStatus ? 'text-green-600' : 'text-red-600' }>
              <svelte:component this={ $stackmatStatus ? WatchOnIcon : WatchOffIcon }/>
            </span>

            <br />
          </span>
        {/if}
      {/if}

      <span
        class="timer"
        hidden={!($state === TimerState.RUNNING && !$session.settings.showElapsedTime)}>----</span> 
      {#if !timerOnly && $state === TimerState.STOPPED}
        <div class="flex justify-center w-full" class:show={$state === TimerState.STOPPED}>
          {#each solveControl.slice(Number(battle), solveControl.length) as control}
            <Tooltip class="cursor-pointer" position="top" text={ control.text }>
              <button class="flex my-3 mx-1 w-5 h-5 { control.highlight($solves[0] || {}) ? 'text-red-500' : '' }"
                on:click={ control.handler }>
                <svelte:component this={control.icon} width="100%" height="100%"/>
              </button>
            </Tooltip>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Hints -->
  {#if !(battle || timerOnly || scrambleOnly) }
    <div id="hints"
      class="bg-backgroundLv1 w-max p-2 { textColor } rounded-md
        shadow-md absolute select-none left-0 max-md:hidden md:top-1/4 transition-all duration-1000"
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

      <button id="bulb"
        class="w-8 h-8 inline-block align-middle mx-0 my-2 cursor-pointer"
        class:nshow={!$hint} on:click={() => $hint = !$hint}>
        <LightBulb width="100%" height="100%"/>
      </button>
    </div>

    <!-- Statistics -->
    <div id="statistics"
      class="{ textColor } pointer-events-none transition-all duration-300 max-md:text-xs"
      class:hide={ $isRunning }>

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
  {#if $session?.settings?.genImage || battle }
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <button
      id="preview-container"
      class="absolute bottom-2 flex items-center justify-center w-full transition-all duration-300
        select-none bg-transparent"
      class:expanded={ prevExpanded }
      class:hide={ $isRunning || $session.settings.input === 'GAN Cube' || timerOnly }
      on:click={() => prevExpanded = !prevExpanded }>
      <img
        on:dragstart|preventDefault
        class="bottom-2 transition-all duration-300 cursor-pointer h-full object-contain"
        src={ $preview } alt="">
    </button>
  {/if}

  <!-- Modal -->
  <!-- {#if !timerOnly} -->
    <Modal bind:this={ modal } bind:show={ show } onClose={ closeHandler }>
      <div class={"max-w-lg max-h-[30rem] " + (type === 'old-scrambles' ? 'overflow-scroll' : '')}>
        {#if type === 'edit-scramble'}
          <TextArea on:keyup={ modalKeyupHandler } class="bg-gray-900 text-gray-200" bind:value={ modalData }/>

          <div class="flex w-full justify-center my-2 gap-2">
            <Button ariaLabel={ $localLang.global.cancel } on:click={() => modal.close()}>
              { $localLang.global.cancel }
            </Button>
            <Button class="bg-purple-800 hover:bg-purple-700 text-gray-300"
              ariaLabel={ $localLang.global.save } on:click={() => modal.close( modalData.trim() )}>
              { $localLang.global.save }
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
          {#if !(timerOnly || $session.settings.sessionType === 'multi-step') }
            <section class="flex gap-4 items-center mb-4">
              { $localLang.TIMER.inputMethod }: <Select bind:value={ modalData.settings.input } items={ TIMER_INPUT } transform={ (e) => e }/>
            </section>
          {/if}

          {#if $session.settings.sessionType === 'multi-step' }
            <section class="flex mb-4 w-max px-2 py-1 rounded-md shadow-md mx-auto my-2 border border-gray-600 cursor-default">
              { $localLang.global.steps }: { $session.settings.steps }
            </section>
          {/if}

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

          {#if modalData.settings.input === 'GAN Cube' || modalData.settings.input === 'QY-Timer' }
            <section class="bg-white bg-opacity-10 p-2 shadow-md rounded-md">
              <div class="flex justify-center mb-4">
                <Button class="bg-purple-600 text-gray-300" on:click={ searchBluetooth } loading={ isSearching }>
                  Search
                </Button>
              </div>

              <ul>
                {#each $bluetoothList as { deviceId, deviceName } (deviceId)}
                  <li class="flex items-center justify-between mb-2 pl-4 bg-white bg-opacity-10 rounded-md">
                    { deviceName }
                    <Button class={"text-gray-300 " + ( deviceId === deviceID ? 'bg-red-600' : 'bg-green-600' )}
                      loading={ isConnecting } on:click={ () => connectBluetooth(deviceId)}>
                      { deviceId === deviceID ? 'Disconnect' : 'Connect'}
                    </Button>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}

          {#if modalData.settings.input === 'GAN Cube'}
            <section>
              <Checkbox
                bind:checked={ modalData.settings.showBackFace } on:change={ (e) => $session = $session }
                class="w-5 h-5" label={ 'Show back face' }/>
            </section>
          {/if}
          
          {#if modalData.settings.input != 'Manual' && !timerOnly}
            <section class="mt-2">
              <Checkbox bind:checked={ modalData.settings.scrambleAfterCancel }
              class="w-5 h-5 my-2" label={ $localLang.TIMER.refreshScramble }/>
            </section>
          {/if}

          {#if !timerOnly}
            <section>
              <Checkbox bind:checked={ modalData.settings.genImage } class="w-5 h-5 my-2" label={ $localLang.TIMER.genImage }/>
              <i class="text-sm text-yellow-500">({ $localLang.TIMER.canHurtPerformance })</i>
            </section>

            <section>
              <Checkbox bind:checked={ modalData.settings.recordCelebration }
                class="w-5 h-5 my-2" label={ $localLang.TIMER.recordCelebration }/>
            </section>
            <section class="mt-4 flex gap-4">
              { $localLang.TIMER.aoxCalculation }:
              <div class="flex gap-2 items-center">
                <Toggle checked={ !!modalData.settings.calcAoX } on:change={ (v) => modalData.settings.calcAoX = ~~v.detail.value }/>
                <span class="ml-3">{ [$localLang.TIMER.sequential, $localLang.TIMER.groupOfX ][ ~~modalData?.settings?.calcAoX ] }</span>
              </div>
            </section>
          {/if}

          <section class="flex mt-4">
            <Button ariaLabel={ $localLang.global.cancel } flat on:click={ () => modal.close() }>
              { $localLang.global.cancel }
            </Button>
            <Button ariaLabel={ $localLang.global.save } flat on:click={ () => modal.close(true) }>
              { $localLang.global.save }
            </Button>
          </section>
        {/if}
      </div>
    </Modal>
  <!-- {/if} -->
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
    @apply md:ml-16 md:mr-10 mx-4 inline-block text-center md:w-[calc(100%-15rem)]
      max-md:max-h-[10rem] md:max-h-[16rem];
    font-size: 1.5em;
    word-spacing: .5rem;
    overflow: hidden auto;
  }

  #scramble span.battle {
    margin: 0;
    max-height: 9rem;
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
    @apply max-md:h-[20%] md:h-[25%];
    transition: all 400ms cubic-bezier(0.88, 0.33, 0.32, 1.19);
    transition-timing-function: cubic-bezier(0.88, 0.33, 0.32, 1.19);
  }

  #preview-container.expanded {
    height: 98%;
    background-color: rgba(0, 0, 0, 0.4);
  }

  #preview-container:not(.expanded) img {
    max-width: calc(100% - 13rem);
    margin-left: 2rem;
  }

  .hide {
    @apply transition-all duration-200 pointer-events-none opacity-0;
  }

  .cube-3d {
    @apply bg-white bg-opacity-20 overflow-hidden shadow-md rounded-md;
    width: calc(100vw - 20rem);
    height: calc(100vh - 25rem);
  }
</style>