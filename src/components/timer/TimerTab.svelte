<script lang="ts">
  /// Types
  import {
    Penalty,
    TimerState,
    type InputContext,
    type Solve,
    type TimerContext,
    type TimerInputHandler,
  } from "@interfaces";

  /// Icons
  import Close from "@icons/Close.svelte";
  import ThumbDown from "@icons/ThumbDown.svelte";
  import Flag from "@icons/FlagOutline.svelte";
  import WatchOnIcon from "@icons/Wifi.svelte";
  import WatchOffIcon from "@icons/WifiOff.svelte";
  import CommentIcon from "@icons/CommentPlusOutline.svelte";
  import BluetoothOffIcon from "@icons/BluetoothOff.svelte";

  /// Components
  import Input from "@components/material/Input.svelte";
  import Select from "@components/material/Select.svelte";

  /// Helpers
  import { writable, type Writable } from "svelte/store";
  import { adjustMillis, sTimer, timer, timerToMilli } from "@helpers/timer";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { DataService } from "@stores/data.service";
  import { NotificationService } from "@stores/notification.service";
  import { localLang } from "@stores/language.service";
  import { screen } from "@stores/screen.store";

  // Handlers
  import { StackmatInput } from "./input-handlers/Stackmat";
  import { ManualInput } from "./input-handlers/Manual";
  import { GANInput } from "./input-handlers/GAN";
  import { KeyboardInput } from "./input-handlers/Keyboard";
  import { QiYiSmartTimerInput } from "./input-handlers/QY-Timer";
  // import { ExternalTimerInput } from "./input-handlers/ExternalTimer";

  // Others
  import { randomUUID } from "@helpers/strings";
  import { minmax } from "@helpers/math";
  import Simulator from "@components/Simulator.svelte";
  import { statsReplaceId } from "@helpers/statistics";
  import { Button, Modal, StepIndicator, TextPlaceholder } from "flowbite-svelte";
  import Tooltip from "@components/material/Tooltip.svelte";
  import { blur, scale } from "svelte/transition";
  import { ChevronLeftSolid, ChevronRightSolid } from "flowbite-svelte-icons";
  import { Flip } from "@classes/Flip";
  import Reconstructor from "./Reconstructor.svelte";
  import type { ReconstructorMethod } from "@classes/reconstructors/interfaces";
  import TimerOptions from "./TimerOptions.svelte";
  import PuzzleImage from "@components/PuzzleImage.svelte";

  import StatsInfo from "./StatsInfo.svelte";

  export let context: TimerContext;
  export let battle = false;
  export let enableKeyboard = true;
  export let timerOnly = false;
  export let scrambleOnly = false;
  export let cleanOnScramble = false;

  const {
    state,
    ready,
    tab,
    solves,
    allSolves,
    session,
    stats,
    scramble,
    group,
    mode,
    preview,
    isRunning,
    decimals,
    bluetoothList,
    sortSolves,
    updateSolves,
    initScrambler,
    updateStatistics,
    editSolve,
    handleUpdateSolve,
    handleRemoveSolves,
  } = context;

  const dispatch = createEventDispatcher();
  const notification = NotificationService.getInstance();
  const dataService = DataService.getInstance();

  /// CLOCK
  const TIMER_DIGITS = /^\d+$/;
  const TIMER_DNF = /^\s*dnf\s*$/i;
  let time: Writable<number> = writable(0);
  let timeStr: string = "";
  let solveControl = [
    {
      text: "Delete",
      icon: Close,
      highlight: () => false,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();

        if ($lastSolve) {
          dataService.removeSolves([$lastSolve]).then(handleRemoveSolves);
          $time = 0;
          reset();
        }
      },
    },
    {
      text: "DNF",
      icon: ThumbDown,
      highlight: (s: any) => s.penalty === Penalty.DNF,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();
        if ($lastSolve) {
          if ($lastSolve.penalty === Penalty.P2) {
            $lastSolve.time -= 2000;
          }

          $lastSolve.penalty = $lastSolve.penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF;
          $time = $lastSolve.penalty === Penalty.DNF ? Infinity : $lastSolve.time;
          battle
            ? dispatch("update", $lastSolve)
            : dataService.updateSolve($lastSolve).then(handleUpdateSolve);
        }
      },
    },
    {
      text: "+2",
      icon: Flag,
      highlight: (s: any) => s.penalty === Penalty.P2,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();
        if ($lastSolve) {
          $lastSolve.penalty = $lastSolve.penalty === Penalty.P2 ? Penalty.NONE : Penalty.P2;
          $lastSolve.penalty === Penalty.P2 ? ($lastSolve.time += 2000) : ($lastSolve.time -= 2000);
          $time = $lastSolve.time;

          if (battle) {
            dispatch("update", $lastSolve);
          } else {
            dataService.updateSolve($lastSolve).then(handleUpdateSolve);
          }
        }
      },
    },
    {
      text: "Comments",
      icon: CommentIcon,
      highlight: () => false,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();
        if ($lastSolve) {
          editSolve($lastSolve);
        }
      },
    },
  ];

  /// LAYOUT
  let selected: number = 0;
  let lastSolve: Writable<Solve | null> = writable(null);
  let prob = -1;
  let prevExpanded: boolean = false;
  let stackmatStatus = writable(false);

  // BLUETOOTH AND EXTERNAL
  let bluetoothStatus = writable(false);
  let bluetoothHardware: any = null;
  let bluetoothBattery: number = 0;
  let sequenceParts = writable<string[]>([]);
  let recoverySequence = writable<string>("");

  // ---------------------------------------------------
  let inputContext: InputContext = {
    isRunning,
    lastSolve,
    ready,
    session,
    state,
    time,
    stackmatStatus,
    decimals,
    scramble,
    sequenceParts,
    recoverySequence,
    bluetoothStatus,
    addSolve,
    initScrambler,
    reset,
    createNewSolve,
    handleRemoveSolves,
    handleUpdateSolve,
    editSolve,
  };

  let inputMethod: Writable<TimerInputHandler> = writable(new ManualInput());
  let currentStep = writable(1);
  let deviceID: Writable<string> = writable("default");
  let deviceList: string[][] = [];
  let autoConnectId: string[] = [];

  // OTHER
  let simulator: Simulator;
  let selectedImg = 0;
  let reconstructor: ReconstructorMethod[] = [];
  let recIndex = 0;

  function selectNone() {
    selected = 0;
    $solves.forEach(s => (s.selected = false));
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
    ls.time = adjustMillis(t || $time, false);
    ls._id = randomUUID();

    $lastSolve = ls;
    $allSolves.push(ls);
    $solves.push(ls);

    if (timerOnly || scrambleOnly) return;

    if (battle) {
      ls.group = -1;
      dispatch("solve", $lastSolve);
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

  function createNewSolve() {
    $lastSolve = {
      date: Date.now(),
      penalty: Penalty.NONE,
      scramble: $scramble,
      time: $time,
      comments: "",
      selected: false,
      session: "",
    };
  }

  function reset() {
    $inputMethod.stopTimer();
    $time = 0;
    $state = TimerState.CLEAN;
    $ready = false;
    $lastSolve = null;
  }

  function keyUp(event: KeyboardEvent) {
    if ($tab || !enableKeyboard) return;
    $inputMethod.keyUpHandler(event);
  }

  function keyDown(event: KeyboardEvent) {
    const { code } = event;

    if (!enableKeyboard) return;

    switch ($tab) {
      case 0: {
        $inputMethod.keyDownHandler(event);

        if (code === "Space" || code === "Escape") {
          prevExpanded = false;
        }

        break;
      }
      case 1: {
        if (code === "Escape" && selected) {
          selectNone();
        }
        break;
      }
    }
  }

  function addTimeString() {
    if (!TIMER_DIGITS.test(timeStr) && !TIMER_DNF.test(timeStr)) {
      timeStr = "";
      return;
    }

    createNewSolve();

    if (TIMER_DIGITS.test(timeStr)) {
      addSolve(timerToMilli(+timeStr));
    } else if (TIMER_DNF.test(timeStr)) {
      addSolve(0, Penalty.DNF);
    }

    !battle && initScrambler();
    timeStr = "";
  }

  function validTimeStr(t: string): boolean {
    return TIMER_DIGITS.test(t) || TIMER_DNF.test(t) || t === "";
  }

  function initInputHandler() {
    const methodMap = {
      Manual: ManualInput,
      StackMat: StackmatInput,
      "GAN Cube": GANInput,
      "QY-Timer": QiYiSmartTimerInput,
      Keyboard: KeyboardInput,
      // ExternalTimer: ExternalTimerInput,
    };

    let newClass = methodMap[$session?.settings?.input || "Keyboard"];
    let sameClass = true;

    if (!($inputMethod instanceof newClass)) {
      sameClass = false;
      $inputMethod.disconnect();
    }

    if ($session?.settings?.input === "Manual" && !sameClass) {
      inputMethod.set(new ManualInput());
    } else if ($session?.settings?.input === "StackMat" && !sameClass) {
      inputMethod.set(new StackmatInput(inputContext));
      $inputMethod.init($deviceID, true);
    } else if ($session?.settings?.input === "GAN Cube" && !sameClass) {
      inputMethod.set(new GANInput(inputContext));
      $inputMethod.init();
    } else if ($session?.settings?.input === "QY-Timer" && !sameClass) {
      inputMethod.set(new QiYiSmartTimerInput(inputContext));
      $inputMethod.init();
    } else if ($session?.settings?.input === "Keyboard") {
      $inputMethod.disconnect();
      let ki = new KeyboardInput(inputContext);

      inputMethod.set(ki);

      let machineContext = ki.interpreter.getSnapshot().context;
      currentStep = machineContext.currentStep;
      $inputMethod.init();
    }

    // else if ($session?.settings?.input === "ExternalTimer") {
    //   if (sameClass) {
    //     dataService.external($deviceID, { type: "session", value: $session });
    //   } else {
    //     inputMethod.set(new ExternalTimerInput(inputContext));
    //     $inputMethod.init();
    //   }
    // }
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
  }

  function clean() {
    $state = TimerState.CLEAN;
    $time = 0;
    $decimals = true;
  }

  function bluetoothHandler(type: string, data: any) {
    switch (type) {
      case "move": {
        simulator.applyMove(data[0], data[1]);

        if (reconstructor.length) {
          reconstructor = [];
          recIndex = 0;
        }

        break;
      }

      case "facelet": {
        simulator.fromFacelet(data);
        break;
      }

      case "hardware": {
        bluetoothHardware = data;
        break;
      }

      case "battery": {
        bluetoothBattery = data;
        break;
      }

      case "connect": {
        $bluetoothStatus = true;
        break;
      }

      case "disconnect": {
        $bluetoothStatus = false;
        $deviceID = "";
        break;
      }

      case "device-list": {
        $bluetoothList = data;
        break;
      }

      case "reconstructor": {
        reconstructor = data;
        recIndex = 0;
        break;
      }
    }
  }

  function handleNewRecord() {
    $inputMethod.newRecord();
  }

  function step(ev: MouseEvent, v: number) {
    ev.stopPropagation();
    selectedImg = minmax(selectedImg + v, 0, $preview.length);
  }

  function handleMouseDown(ev: MouseEvent) {
    if (dataService.isElectron) return;

    ev.preventDefault();

    if ($inputMethod instanceof KeyboardInput) {
      keyDown({
        type: "keydown",
        code: "Space",
      } as KeyboardEvent);
    }
  }

  function handleMouseUp(ev: MouseEvent) {
    if (dataService.isElectron) return;

    ev.preventDefault();

    if ($inputMethod instanceof KeyboardInput) {
      keyUp({
        type: "keyup",
        code: "Space",
      } as KeyboardEvent);
    }
  }

  function stopTimer() {
    if ($inputMethod instanceof KeyboardInput) {
      $inputMethod.stopTimer();
    }
  }

  onMount(() => {
    if (timerOnly || scrambleOnly) {
      return;
    }

    navigator.mediaDevices?.addEventListener("devicechange", updateDevices);
    updateDevices();
    dataService.on("bluetooth", bluetoothHandler);
    dataService.on("new-record", handleNewRecord);
  });

  onDestroy(() => {
    $inputMethod.disconnect();
    navigator.mediaDevices?.removeEventListener("devicechange", updateDevices);
    document.querySelectorAll("#stackmat-signal").forEach(e => e.remove());
    dataService.off("bluetooth", bluetoothHandler);
    dataService.off("new-record", handleNewRecord);
  });

  $: $solves.length === 0 && reset();
  $: $session && initInputHandler();
  $: $localLang, updateTexts();
  $: $scramble && cleanOnScramble && clean();
  $: dataService.sleep($state === TimerState.RUNNING);
  $: $mode && (selectedImg = 0);
</script>

<svelte:window on:keyup={keyUp} on:keydown={keyDown} />

<div
  class:timerOnly
  class:scrambleOnly
  class="timer-tab w-full h-full"
  class:smart_cube={$session.settings.input === "GAN Cube"}
>
  <!-- Options -->
  {#if !scrambleOnly}
    <TimerOptions
      {battle}
      {bluetoothBattery}
      {context}
      {bluetoothHardware}
      {bluetoothStatus}
      {deviceID}
      {deviceList}
      {initInputHandler}
      {inputContext}
      {inputMethod}
      {enableKeyboard}
      {timerOnly}
    />
  {/if}

  <!-- Timer -->
  <div
    id="timer"
    class="text-9xl grid place-items-center w-full h-full active:bg-transparent"
    on:pointerdown|self={handleMouseDown}
    on:pointerup|self={handleMouseUp}
    role="timer"
  >
    {#if $session?.settings?.input === "Manual"}
      <div id="manual-inp">
        <div class="text-xl w-full text-center text-primary-300">
          {timeStr.trim()
            ? TIMER_DNF.test(timeStr)
              ? timeStr.toUpperCase()
              : timer(timerToMilli(+timeStr), true, true)
            : ""}
        </div>

        <Input
          bind:value={timeStr}
          stopKeyupPropagation
          on:UENTER={addTimeString}
          class="w-full max-md:w-[min(90%,20rem)] mx-auto h-36 text-center {validTimeStr(timeStr)
            ? ''
            : 'border-red-400 border-2'}"
          inpClass="text-center text-7xl outline-none"
        />
      </div>
    {:else}
      <div class="flex flex-col items-center transition-all duration-200 mx-auto">
        {#if $state === TimerState.RUNNING}
          <span
            class="timer text-gray-300 max-sm:text-7xl max-sm:[line-height:8rem]"
            in:scale
            class:ready={$ready}
            hidden={$state === TimerState.RUNNING && !$session.settings.showElapsedTime}
          >
            {timer($time, $decimals, false)}
          </span>

          {#if !dataService.isElectron}
            <Button color="alternative" class="w-min mx-auto" on:click={stopTimer}>
              {$localLang.global.cancel}
            </Button>
          {/if}
        {:else}
          <span
            class="timer text-gray-300 max-sm:text-7xl max-sm:[line-height:8rem]"
            class:prevention={$state === TimerState.PREVENTION}
            class:ready={$ready}
          >
            {$state === TimerState.STOPPED
              ? sTimer($lastSolve, $decimals, false)
              : timer($time, $decimals, false)}
          </span>

          {#if $state === TimerState.INSPECTION && !dataService.isElectron}
            <Button color="alternative" class="w-min mx-auto" on:click={stopTimer}>
              {$localLang.global.cancel}
            </Button>
          {/if}

          {#if !timerOnly && $state === TimerState.STOPPED}
            <div
              class="flex justify-center w-full z-10"
              class:show={$state === TimerState.STOPPED}
              transition:blur
            >
              {#each solveControl.slice(Number(battle), solveControl.length) as control}
                <Tooltip class="cursor-pointer" position="top" text={control.text}>
                  <Button
                    color="none"
                    class="flex mx-1 w-5 h-5 p-0 {control.highlight($solves[0] || {})
                      ? 'text-red-500'
                      : ''}"
                    on:click={control.handler}
                  >
                    <svelte:component this={control.icon} width="100%" height="100%" />
                  </Button>
                </Tooltip>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      {#if $session.settings.sessionType === "multi-step" && $state === TimerState.RUNNING}
        <div class="step-progress w-[min(100%,30rem)] text-base" transition:scale>
          <StepIndicator currentStep={$currentStep} steps={$session.settings.stepNames} />
        </div>
      {/if}

      {#if $session?.settings?.input === "StackMat"}
        <!-- {#if $session?.settings?.input === "StackMat" || $session?.settings?.input === "ExternalTimer"} -->
        <span class="text-2xl flex gap-2 items-center">
          {$localLang.TIMER.stackmatStatus}:

          <span class={$stackmatStatus ? "text-green-600" : "text-red-600"}>
            <svelte:component this={$stackmatStatus ? WatchOnIcon : WatchOffIcon} />
          </span>

          <br />
        </span>
      {/if}
    {/if}

    <span
      transition:blur
      class="timer"
      hidden={!($state === TimerState.RUNNING && !$session.settings.showElapsedTime)}>----</span
    >
  </div>

  <!-- Statistics -->
  {#if !(battle || timerOnly || scrambleOnly)}
    <StatsInfo {context} />
  {/if}

  <!-- Image -->
  <div
    id="preview-container"
    class:expanded={prevExpanded}
    class={(prevExpanded ? "" : "relative") +
      " " +
      ($session?.settings?.input === "GAN Cube" ? "z-0" : "")}
  >
    <!-- Cube3D -->
    {#if $session?.settings?.input === "GAN Cube"}
      <section class="relative cube-3d -z-10">
        <Simulator
          class={$bluetoothStatus ? "" : "z-0 opacity-20"}
          selectedPuzzle={"icarry"}
          enableDrag={false}
          enableKeyboard={false}
          gui={false}
          contained={true}
          showBackFace={$session?.settings?.showBackFace}
          bind:this={simulator}
        />
        <svelte:component
          this={BluetoothOffIcon}
          class={$bluetoothStatus ? "hidden" : "absolute text-blue-500 animate-pulse"}
          width="100%"
          height="100%"
        />
      </section>
    {:else if $session?.settings?.genImage || battle}
      <button
        class={`flex absolute items-center bottom-0 h-full max-w-[90%] left-1/2 translate-x-[-50%] mx-auto aspect-video
          justify-center transition-all duration-300 select-none` +
          (prevExpanded ? " bg-black w-full max-w-none z-10" : "z-0")}
        class:hide={$isRunning || timerOnly}
        on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
        on:click={() => {
          prevExpanded = $preview ? !prevExpanded : false;
          new Flip("#preview-container > button").flip({ duration: 200 });
        }}
      >
        {#if $preview.length === 0}
          <div class="bg-gray-700 w-full h-full rounded grid place-items-center animate-pulse">
            <svg
              width="48"
              height="48"
              class="text-gray-200"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 640 512"
            >
              <path
                d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z"
              />
            </svg>
          </div>
        {:else}
          <div class="w-full h-full flex items-center justify-center relative">
            {#if $preview.length > 1}
              <span class="absolute top-[-1.5rem] transition-all" out:blur>
                {$localLang.global.scramble}
                {selectedImg + 1} / {$preview.length}
              </span>
            {/if}

            <Button
              color="none"
              on:click={ev => step(ev, -1)}
              disabled={selectedImg === 0}
              class={"rounded-full w-[3rem] h-[3rem] " + ($preview.length < 2 ? "hidden" : "")}
            >
              <ChevronLeftSolid class="pointer-events-none" />
            </Button>

            <PuzzleImage src={$preview[selectedImg].src || ""} />

            <Button
              color="none"
              on:click={ev => step(ev, 1)}
              disabled={selectedImg + 1 === $preview.length}
              class={"rounded-full w-[3rem] h-[3rem] " + ($preview.length < 2 ? "hidden" : "")}
            >
              <ChevronRightSolid class="pointer-events-none" />
            </Button>
          </div>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Scramble -->
  <div id="scramble" class="transition-all duration-300 max-md:text-xs max-md:leading-5">
    {#if $inputMethod instanceof GANInput}
      {#if $recoverySequence}
        <pre class="scramble-content" class:hide={$isRunning} class:battle>{"=> " +
            $recoverySequence}</pre>
      {:else if $sequenceParts.length < 3}
        <TextPlaceholder
          size="xl"
          class="w-full mx-auto"
          divClass="grid gap-2 place-items-center max-h-12 overflow-hidden animate-pulse"
        />
      {:else}
        <pre class="scramble-content" class:hide={$isRunning} class:battle>
          {$sequenceParts[0]} <mark>{$sequenceParts[1]}</mark> {$sequenceParts[2]}
        </pre>
      {/if}
    {:else if !$scramble}
      <TextPlaceholder
        size="xl"
        class="w-full mx-auto"
        divClass="grid gap-2 place-items-center max-h-12 overflow-hidden animate-pulse"
      />
    {:else}
      <pre class="scramble-content" class:hide={$isRunning} class:battle>{$scramble}</pre>
    {/if}
  </div>
</div>

<!-- Result -->
<Modal open={reconstructor.length > 0} on:close={() => (reconstructor.length = 0)}>
  <div slot="header" class="flex w-full justify-center">
    <Select
      items={reconstructor}
      transform={e => e.name}
      label={e => e.name}
      value={reconstructor[recIndex].name}
      placement="right"
      onChange={(_, pos) => (recIndex = pos)}
    ></Select>
  </div>
  <Reconstructor reconstructor={reconstructor[recIndex].steps} {lastSolve} />
</Modal>

<style lang="postcss">
  .timer-tab {
    display: grid;
    overflow: hidden;
    grid-template-columns: auto auto 1fr auto;
    grid-template-rows: auto 1fr min-content;
    grid-template-areas:
      "options scramble scramble scramble"
      "options timer timer timer"
      "options leftStats image rightStats";
  }

  .timer-tab.smart_cube {
    grid-template-areas:
      "options scramble scramble scramble"
      "options image image image"
      "options leftStats timer rightStats";
  }

  .timer-tab.timerOnly {
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "options timer";
  }

  .timer-tab.scrambleOnly {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "scramble";
  }

  .timer-tab.scrambleOnly #scramble {
    margin-top: 4rem;
  }

  .timer-tab.scrambleOnly #preview-container,
  .timer-tab.scrambleOnly #timer {
    display: none;
  }

  .timer-tab.timerOnly #scramble {
    display: none;
  }

  #scramble {
    @apply grid h-full;
    grid-area: scramble;
  }

  #scramble .scramble-content {
    @apply max-w-[calc(100%-2rem)] md:w-[min(calc(100%-10rem),50rem)] mx-auto break-words whitespace-pre-wrap
      flex text-left justify-center items-baseline h-min max-h-[15rem];
    line-height: 1.3;
    overflow: hidden auto;
  }

  #scramble .scramble-content.battle {
    margin: 0;
    max-height: 9rem;
  }

  #scramble .scramble-content mark {
    @apply mr-2;
  }

  #timer {
    grid-area: timer;
    user-select: none;
    touch-action: none;
    -webkit-touch-callout: none;
  }

  #manual-inp {
    width: 30rem;
  }

  .timer {
    font-family: var(--timer-font);
    user-select: none;
    pointer-events: none;
    touch-action: none;
    -webkit-touch-callout: none;
  }

  .timer.prevention {
    @apply text-red-800;
  }

  @keyframes bump {
    0% {
      font-size: var(--font-size);
    }
    50% {
      font-size: calc(var(--font-size) * 1.3);
    }
    100% {
      font-size: var(--font-size);
    }
  }

  .timer.ready {
    @apply text-green-700;
    animation: bump 300ms 1;
    --font-size: 8rem;
  }

  @media not all and (min-width: 640px) {
    .timer.ready {
      --font-size: 4.5rem;
    }
  }

  #preview-container {
    @apply mx-auto w-full;
    grid-area: image;
  }

  .hide {
    @apply transition-all duration-200 pointer-events-none opacity-0;
  }

  .cube-3d {
    @apply w-full h-full bg-white bg-opacity-20 max-w-md shadow-md rounded-md mx-auto overflow-hidden;
    /* @apply bg-white bg-opacity-20 overflow-hidden shadow-md rounded-md mx-auto
    w-[calc(100vw-20rem)] max-md:w-[calc(100vw-3rem)]
    h-[45vh] max-md:h-[calc(100vh-25rem)]; */

    /* height: calc(100vh - 25rem); */
  }
</style>
