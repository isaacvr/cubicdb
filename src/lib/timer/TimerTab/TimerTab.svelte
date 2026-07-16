<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import {
    TimerState,
    type InputContext,
    type ITimerController,
    type Session,
    type TimerContext,
  } from "@interfaces";
  import { writable } from "svelte/store";

  /// Components
  import Simulator from "$lib/simulator/Simulator.svelte";

  import { localLang } from "@stores/language.service";

  // Handlers
  import { KeyboardInput } from "$lib/timer/adaptors/Keyboard";
  import { dataService } from "$lib/data-services/data.service";

  // Others
  import type { ReconstructorMethod } from "@classes/reconstructors/interfaces";
  import StatsInfo from "./StatsInfo.svelte";
  import PuzzleImageBundle from "@components/PuzzleImageBundle.svelte";

  import { blur } from "svelte/transition";
  import { twMerge } from "tailwind-merge";
  import TimerOptions from "./TimerOptions.svelte";
  import ManualInputHandler from "./timer-handlers/ManualInputHandler.svelte";
  import KeyboardInputHandler from "./timer-handlers/KeyboardInputHandler.svelte";
  import StackmatInputHandler from "./timer-handlers/StackmatInputHandler.svelte";
  import VirtualInputHandler from "./timer-handlers/VirtualInputHandler.svelte";
  import { TIMER_DEVICE_TYPES } from "../devices/TimerDeviceConstants";

  interface TimerTabContext {
    inputContext: InputContext;
    timerController: ITimerController;
    context: TimerContext;
    battle?: boolean;
    cleanOnScramble?: boolean;
    managedKeyboardActive?: boolean;
  }

  let {
    inputContext = $bindable(),
    timerController = $bindable(),
    context = $bindable(),
    battle = $bindable(false),
    cleanOnScramble = $bindable(false),
    managedKeyboardActive = false,
  }: TimerTabContext = $props();

  const { reset } = inputContext;
  const {
    time,
    solves,
    tab,
    device,
    timerState,
    decimals,
    bluetoothList,
    puzzleOrder,
    puzzleType,
    scramble,
    session,
    isRunning,
    timerOnly,
    scrambleOnly,
    preview,
    enableKeyboard,
  } = timerController;

  /// LAYOUT
  let selected: number = 0;
  let prevExpanded: boolean = $state(false);

  // OTHER
  let simulator: Simulator | null = $state(null);
  let reconstructor: ReconstructorMethod[] = [];
  let recoverySequence = writable<string>("");
  let sequenceParts = writable<string[]>([]);

  function selectNone() {
    selected = 0;
    $solves.forEach(s => (s.selected = false));
  }

  function keyUp(event: KeyboardEvent) {
    if (managedKeyboardActive) return;
    if ($tab || !$enableKeyboard) return;
    $device.keyUpHandler(event);
  }

  function keyDown(event: KeyboardEvent) {
    if (managedKeyboardActive) return;
    const { code } = event;

    if (!$enableKeyboard) return;

    switch ($tab) {
      case 0: {
        $device.keyDownHandler(event);

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

  function clean() {
    $timerState = TimerState.CLEAN;
    $time = 0;
    $decimals = true;
  }

  function bluetoothHandler(type: string, data: any) {
    switch (type) {
      case "move": {
        simulator?.applyMove(data[0], data[1]);

        if (reconstructor.length) {
          reconstructor = [];
        }

        break;
      }

      case "facelet": {
        console.log("facelet: ", data);
        simulator?.fromFacelet(data);
        break;
      }

      case "device-list": {
        $bluetoothList = data;
        break;
      }

      case "reconstructor": {
        if (data.length > 0) {
          localStorage.setItem("--timer-tab-enableKeyboard", $enableKeyboard.toString());
        }
        reconstructor = data;
        break;
      }

      case "sync-solved": {
        $device.sendEvent({ type: "sync-solved" });
        break;
      }
    }
  }

  function handleNewRecord() {
    $device.newRecord();
  }

  function handlePointerUp(ev: any) {
    if (managedKeyboardActive) return;
    if ($dataService.isElectron) return;

    ev.preventDefault();

    if ($device instanceof KeyboardInput) {
      $device.keyDownHandler({
        type: "keydown",
        code: "Escape",
      } as KeyboardEvent);
    }
  }

  function showSimulator(s: Session) {
    return s?.settings?.input === "GAN Cube" || s?.settings?.input === "Virtual";
  }

  function handleScrambleChange() {
    if (cleanOnScramble) clean();

    if ($device.type === "virtual_cube_keyboard" && simulator) {
      simulator.resetPuzzle($puzzleType, $puzzleOrder, $scramble);
    }
  }

  function getTimerState(st: TimerState) {
    if (st === TimerState.INSPECTION) return "inspection";
    if (st === TimerState.PREVENTION) return "prevention";
    if (st === TimerState.RUNNING) return "running";
    if (st === TimerState.STOPPED) return "stopped";
    return "clean";
  }

  function focusManualInput() {
    if ($tab || $device.type != "manual_entry") return;
    let manualInput: HTMLInputElement | null = document.querySelector("#manual-inp input");
    if (manualInput) {
      manualInput.focus();
    }
  }

  onMount(() => {
    if (timerOnly || scrambleOnly) {
      return;
    }

    // navigator.mediaDevices?.addEventListener("devicechange", updateDevices);
    // updateDevices();
    $dataService.on("bluetooth", bluetoothHandler);
    $dataService.on("new-record", handleNewRecord);
  });

  onDestroy(() => {
    $device.disconnect();
    $dataService.off("bluetooth", bluetoothHandler);
    $dataService.off("new-record", handleNewRecord);
  });

  // Reset when no solves
  $effect(() => {
    if ($solves.length === 0) {
      reset();
    }
  });

  // Handle scramble change
  $effect(() => {
    if ($scramble) {
      untrack(() => handleScrambleChange());
    }
  });

  // Prevent sleep when running
  $effect(() => {
    $dataService.config.sleep($timerState === TimerState.RUNNING);
  });

  // Focus on manual input
  $effect(() => {
    focusManualInput();
  });

  // Get scramble info from device
  $effect(() => {
    if ($device.type === "gan_icarry") {
      console.log("SET STUFF");
      sequenceParts = $device.sequenceParts;
      recoverySequence = $device.recoverySequence;
    }
  });
</script>

<svelte:window onkeyup={keyUp} onkeydown={keyDown} onpointerup={handlePointerUp} />

<!-- Snippets -->
{#snippet textSkeleton()}
  <div class="grid place-items-center gap-1 max-w-lg mx-auto">
    <div class="rounded-md animate-pulse bg-base-100 h-3 w-full"></div>
    <div class="rounded-md animate-pulse bg-base-100 h-3 w-full max-w-[90%]"></div>
    <div class="rounded-md animate-pulse bg-base-100 h-3 w-full max-w-[75%]"></div>
  </div>
{/snippet}

<!-- Component -->
<section
  role="tabpanel"
  class={"timer-tab w-full h-full " + ($tab != 0 ? "hidden!" : "")}
  class:timerOnly
  class:scrambleOnly
  class:battle
  class:simulator={showSimulator($session)}
  data-timerstate={getTimerState($timerState)}
>
  <div
    class={twMerge(
      "scramble grid z-10 shaded-card relative transition-all duration-500",
      $isRunning ? "opacity-5" : ""
    )}
  >
    <div class="config flex items-center justify-between relative z-20">
      <h2 class="name font-bold">{$localLang.global.scramble}</h2>

      <div class="flex items-center gap-2 ml-auto w-fit">
        <TimerOptions
          battle={false}
          {context}
          initInputHandler={() => {}}
          {timerOnly}
          options={{
            modeSettings: true,
            refreshScramble: true,
            copyScramble: true,
            editScramble: true,
            oldScramble: true,
          }}
        />
      </div>
    </div>

    <div
      id="scramble"
      class="transition-all h-full min-h-16 overflow-y-auto my-auto duration-300 max-md:text-xs max-md:leading-5 tx-text"
    >
      {#if $device.type === "gan_icarry"}
        <div>
          <div class="w-2 h-2 rounded-full bg-primary"></div>
          <div class="w-2 h-2 rounded-full bg-secondary"></div>
          <div class="w-2 h-2 rounded-full bg-accent"></div>
        </div>
        {#if $recoverySequence}
          <pre class="scramble-content text-primary" class:hide={$isRunning} class:battle>{"=> " +
              $recoverySequence}</pre>
        {:else if $sequenceParts.length < 3}
          <pre class="scramble-content text-secondary">{JSON.stringify(
              $sequenceParts,
              null,
              2
            )}</pre>
          <!-- {@render textSkeleton()} -->
        {:else}
          <pre class="scramble-content text-accent" class:hide={$isRunning} class:battle>
            {#each $sequenceParts[0].split(" ") as mv (mv)}
              <span>{mv}</span>
            {/each}
            
            <mark>{$sequenceParts[1]}</mark>
            
            {#each $sequenceParts[2].split(" ") as mv (mv)}
              <span>{mv}</span>
            {/each}
          </pre>
        {/if}
      {:else if !$scramble}
        {@render textSkeleton()}
      {:else}
        <pre class="scramble-content" class:hide={$isRunning} class:battle>{$scramble}</pre>
      {/if}
    </div>
  </div>

  <div class="timer shaded-card relative overflow-hidden">
    <div class="config flex items-center justify-between relative z-20">
      <h2 class="name font-bold">{$localLang.HOME.timer}</h2>
    </div>

    <div
      class="text-9xl flex flex-col justify-center gap-2 items-center w-full h-full active:bg-transparent"
      role="timer"
    >
      {#if $device.type === "manual_entry"}
        <ManualInputHandler {battle} {context} {inputContext} />
      {:else if $device.type === TIMER_DEVICE_TYPES.KEYBOARD}
        <KeyboardInputHandler {device} {context} {inputContext} />
      {:else if $device.type === "gan_icarry"}
        <Simulator
          controlled
          useDevice={$device}
          selectedPuzzle="icarry"
          enableDrag={false}
          enableKeyboard={false}
        />
        <KeyboardInputHandler
          class="z-50 translate-y-[80%]"
          timerOnly
          showActions={false}
          {device}
          {context}
          {inputContext}
        />
      {:else if $device.type === "stackmat"}
        <StackmatInputHandler {device} {context} {inputContext} />
      {:else if $device.type === "virtual_cube_keyboard"}
        <VirtualInputHandler {device} {context} {inputContext} />
        <!-- {:else if $device.type === "network_timer"}
        NTW -->
      {:else if $device.type === "qiyi_smart_timer"}
        QY
        <!-- {:else if $device.type === "usb_timer"}
        USB -->
      {/if}

      <!-- <StatsInfo bind:context /> -->
    </div>
  </div>

  <div
    class={twMerge(
      "info flex flex-col overflow-x-clip overflow-y-auto gap-1 transition-all duration-500",
      $isRunning ? "opacity-5" : ""
    )}
  >
    <div
      class="image shaded-card max-h-60 flex place-items-center w-full transition-all duration-200"
    >
      <PuzzleImageBundle
        src={$preview.map(s => s.src || "")}
        onclick={() => (prevExpanded = !prevExpanded)}
        class="cursor-pointer"
      />
    </div>

    <div class="shaded-card w-full h-full gap-2 justify-between text-sm px-0!">
      <StatsInfo bind:context {timerController} />
    </div>
  </div>
</section>

{#if prevExpanded}
  <dialog
    open={prevExpanded}
    class="flex items-center px-2 w-full h-full shaded-card inset-0 rounded-md overflow-hidden"
    in:blur={{ duration: 300 }}
    out:blur={{ duration: 200 }}
  >
    <PuzzleImageBundle
      src={$preview.map(s => s.src || "")}
      onclick={() => (prevExpanded = !prevExpanded)}
      allowDownload={prevExpanded}
    />
  </dialog>
{/if}

<style lang="postcss">
  @reference "@src/themes/index.css";

  section {
    grid-area: tabs;
    display: grid;
    grid-template-areas:
      "scramble info"
      "timer info";
    gap: 0.25rem;
    grid-template-columns: 1fr 16rem;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    height: 100%;
  }

  section > .scramble {
    grid-area: scramble;
    grid-template-rows: auto minmax(0, 1fr);
  }

  section > .timer {
    grid-area: timer;
  }

  section > .info {
    grid-area: info;
  }

  /* TESTING */
  /* .timer-tab.simulator[data-timerinput="virtual"][data-timerstate="clean"] #timer {
    display: none;
  }

  .timer-tab.simulator[data-timerinput="virtual"][data-timerstate="running"] #scramble {
    display: none;
  } */

  .timer-tab.simulator[data-timerstate="running"] {
    grid-template-areas:
      "options image image image"
      "options image image image"
      "options leftStats timer rightStats";
  }

  .timer-tab.simulator[data-timerstate="running"] #scramble {
    display: none;
  }

  #scramble .scramble-content {
    @apply wrap-break-word whitespace-pre-wrap
      flex flex-wrap gap-2 text-left justify-center items-baseline;
    line-height: 1.3;
    overflow: hidden auto;
    row-gap: 0rem;
    max-height: calc(50vh - 4rem);
  }

  #scramble .scramble-content.battle {
    margin: 0;
    max-height: 9rem;
    text-align: center;
  }
</style>
