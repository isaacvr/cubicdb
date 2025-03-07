<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import {
    Penalty,
    TimerState,
    type InputContext,
    type Session,
    type TimerContext,
  } from "@interfaces";
  import { derived, writable, type Writable } from "svelte/store";

  /// Components
  import Simulator from "$lib/simulator/Simulator.svelte";

  /// Helpers
  import { timer, timerToMilli } from "@helpers/timer";
  import { NotificationService } from "@stores/notification.service";
  import { localLang } from "@stores/language.service";

  // Handlers
  import { StackmatInput } from "$lib/timer/adaptors/Stackmat";
  import { GANInput } from "$lib/timer/adaptors/GAN";
  import { KeyboardInput } from "$lib/timer/adaptors/Keyboard";
  import { dataService } from "$lib/data-services/data.service";
  // import { ExternalTimerInput } from "./adaptors/ExternalTimer";

  // Others
  import type { ReconstructorMethod } from "@classes/reconstructors/interfaces";
  import StatsInfo from "./StatsInfo.svelte";
  import PuzzleImageBundle from "@components/PuzzleImageBundle.svelte";
  import {
    BoltIcon,
    CopyIcon,
    FlagIcon,
    HistoryIcon,
    MessageSquareTextIcon,
    PauseIcon,
    PlayIcon,
    RefreshCwIcon,
    SquarePenIcon,
    ThumbsDownIcon,
    WifiIcon,
    WifiOffIcon,
    XIcon,
  } from "lucide-svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import { blur, scale } from "svelte/transition";
  import { twMerge } from "tailwind-merge";
  import type { Device } from "$lib/interfaces/devices.types";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Select from "@components/material/Select.svelte";
  import Modal from "@components/Modal.svelte";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { getModeCases, type Case, type IModeCase } from "./getModeCases";
  import { clone } from "@helpers/object";

  interface TimerTabContext {
    inputContext: InputContext;
    context: TimerContext;
    device: Writable<Device>;
    deviceList: string[][];
    battle?: boolean;
    timerOnly?: boolean;
    scrambleOnly?: boolean;
    cleanOnScramble?: boolean;
  }

  let {
    inputContext = $bindable(),
    context = $bindable(),
    device = $bindable(),
    battle = $bindable(false),
    timerOnly = $bindable(false),
    scrambleOnly = $bindable(false),
    cleanOnScramble = $bindable(false),
  }: TimerTabContext = $props();

  const {
    timerState,
    ready,
    tab,
    solves,
    session,
    scramble,
    preview,
    isRunning,
    decimals,
    bluetoothList,
    enableKeyboard,
    puzzleType,
    puzzleOrder,
    group,
    mode,
    prob,
    filters,
    initScrambler,
    editSolve,
    handleUpdateSolve,
    handleRemoveSolves,
    selectedGroup,
    selectedMode,
  } = context;

  const {
    lastSolve,
    time,
    recoverySequence,
    sequenceParts,
    currentStep,
    reset,
    createNewSolve,
    addSolve,
  } = inputContext;

  /// CLOCK
  const TIMER_DIGITS = /^\d+\+?$/;
  const TIMER_DNF = /^\s*dnf\s*$/i;
  let timeStr: string = $state("");
  let solveControl = $state([
    {
      text: "Delete",
      icon: XIcon,
      highlight: () => false,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();

        if ($lastSolve) {
          $dataService.solve.removeSolves([$lastSolve]).then(handleRemoveSolves);
          $time = 0;
          reset();
        }
      },
    },
    {
      text: "DNF",
      icon: ThumbsDownIcon,
      highlight: (s: any) => s.penalty === Penalty.DNF,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();
        if ($lastSolve) {
          if ($lastSolve.penalty === Penalty.P2) {
            $lastSolve.time -= 2000;
          }

          $lastSolve.penalty = $lastSolve.penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF;
          $time = $lastSolve.penalty === Penalty.DNF ? Infinity : $lastSolve.time;
          // battle
          //   ? dispatch("update", $lastSolve)
          //   : $dataService.solve.updateSolve($lastSolve).then(handleUpdateSolve);
        }
      },
    },
    {
      text: "+2",
      icon: FlagIcon,
      highlight: (s: any) => s.penalty === Penalty.P2,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();
        if ($lastSolve) {
          $lastSolve.penalty = $lastSolve.penalty === Penalty.P2 ? Penalty.NONE : Penalty.P2;
          $lastSolve.penalty === Penalty.P2 ? ($lastSolve.time += 2000) : ($lastSolve.time -= 2000);
          $time = $lastSolve.time;

          if (battle) {
            // dispatch("update", $lastSolve);
          } else {
            $dataService.solve.updateSolve($lastSolve).then(handleUpdateSolve);
          }
        }
      },
    },
    {
      text: "Comments",
      icon: MessageSquareTextIcon,
      highlight: () => false,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();
        if ($lastSolve) {
          editSolve($lastSolve);
        }
      },
    },
  ]);

  /// LAYOUT
  let selected: number = 0;
  let prevExpanded: boolean = $state(false);
  let stackmatStatus = writable(false);
  let showMixedSettingsDialog = $state(false);
  let modeIndex = $state(0);
  let groupCases = $state(false);
  let cases: IModeCase = $state({ cases: [], groups: [] });

  // // BLUETOOTH AND EXTERNAL
  // let bluetoothStatus = writable(false);
  // let bluetoothHardware: any = null;
  // let bluetoothBattery: number = 0;

  // OTHER
  let simulator: Simulator | null = $state(null);
  let reconstructor: ReconstructorMethod[] = [];
  let recIndex = 0;
  let selectedCases: Writable<boolean[]> = writable([]);

  function selectNone() {
    selected = 0;
    $solves.forEach(s => (s.selected = false));
  }

  function keyUp(event: KeyboardEvent) {
    if ($tab || !enableKeyboard) return;
    $device.keyUpHandler(event);
  }

  function keyDown(event: KeyboardEvent) {
    const { code } = event;

    if (!enableKeyboard) return;

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

  function addTimeString() {
    if (!TIMER_DIGITS.test(timeStr) && !TIMER_DNF.test(timeStr)) {
      timeStr = "";
      return;
    }

    createNewSolve();

    if (TIMER_DIGITS.test(timeStr)) {
      let isP2 = timeStr.endsWith("+");
      addSolve(
        timerToMilli(+timeStr.slice(0, isP2 ? -1 : undefined)),
        isP2 ? Penalty.P2 : Penalty.NONE
      );
    } else if (TIMER_DNF.test(timeStr)) {
      addSolve(0, Penalty.DNF);
    }

    !battle && initScrambler();
    timeStr = "";
  }

  function validTimeStr(t: string): boolean {
    return TIMER_DIGITS.test(t) || TIMER_DNF.test(t) || t === "";
  }

  // function updateDevices() {
  //   StackmatInput.updateInputDevices()?.then(dev => {
  //     // deviceList = dev;
  //   });

  //   autoConnectId.forEach(id => {
  //     notification.removeNotification(id);
  //   });

  //   autoConnectId.length = 0;

  //   // Auto detect
  //   // StackmatInput.autoDetect().then((res) => {
  //   //   if ( inputMethod instanceof StackmatInput && inputMethod.getDevice() === res.device ) {
  //   //     return;
  //   //   }

  //   //   let key = res.id;
  //   //   autoConnectId.push(key);

  //   //   notification.addNotification({
  //   //     header: $localLang.TIMER.stackmatAvailableHeader,
  //   //     text: $localLang.TIMER.stackmatAvailableText,
  //   //     fixed: true,
  //   //     actions: [
  //   //       { text: $localLang.TIMER.cancel, callback: () => {} },
  //   //       { text: $localLang.TIMER.connect, callback: () => {
  //   //         deviceID = res.device;
  //   //         $session.settings.input = 'StackMat';
  //   //         initInputHandler();
  //   //         $dataService.session.updateSession($session);
  //   //       } },
  //   //     ],
  //   //     key,
  //   //   });
  //   // })
  //   // .catch(() => {});
  // }

  function updateTexts() {
    solveControl[0].text = $localLang.global.delete;
    solveControl[3].text = $localLang.TIMER.comments;

    if (isNaN($group)) return;

    for (let i = 0, maxi = $localLang.MENU[$group][1].length; i < maxi; i += 1) {
      if ($mode[1] === $localLang.MENU[$group][1][i][1]) {
        modeIndex = i;
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
          recIndex = 0;
        }

        break;
      }

      case "facelet": {
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
        recIndex = 0;
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

  function startTimer() {
    if (!($device instanceof KeyboardInput)) return;

    $device.keyUpHandler({ type: "keydown", code: "Space" } as KeyboardEvent);
    $device.keyUpHandler({ type: "keyup", code: "Space" } as KeyboardEvent);
  }

  function stopTimer() {
    if (!($device instanceof KeyboardInput)) return;
    $device.stopTimer();
  }

  function pauseOrResume() {
    if (!($device instanceof KeyboardInput)) return;
    if ($timerState === TimerState.RUNNING) {
      $device.keyDownHandler({ type: "keydown", code: "KeyP" } as KeyboardEvent);
    } else if ($timerState === TimerState.PAUSE) {
      $device.keyDownHandler({ type: "keydown", code: "Space" } as KeyboardEvent);
    }
  }

  function handlePointerUp(ev: any) {
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
    cleanOnScramble && clean();

    if ($session?.settings?.input === "Virtual" && simulator) {
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

  function saveFilters() {
    showMixedSettingsDialog = false;
    $dataService.config.setPath(`filters/${$session._id}/${$group}/${modeIndex}`, {
      selectedCases: clone($selectedCases),
      groupCases,
    });

    $dataService.config.saveConfig();
    $prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);
    initScrambler();
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
    // navigator.mediaDevices?.removeEventListener("devicechange", updateDevices);
    // document.querySelectorAll("#stackmat-signal").forEach(e => e.remove());
    $dataService.off("bluetooth", bluetoothHandler);
    $dataService.off("new-record", handleNewRecord);
  });

  $effect(() => {
    if ($solves.length === 0) {
      reset();
    }
  });

  $effect(() => updateTexts());

  $effect(() => {
    if ($scramble) {
      untrack(() => handleScrambleChange());
    }
  });

  $effect(() => {
    $dataService.config.sleep($timerState === TimerState.RUNNING);
  });

  $effect(() => {
    let savedSelectedCases = $dataService.config.getPath(
      `filters/${$session._id}/${$group}/${modeIndex}`
    );

    $selectedCases = savedSelectedCases
      ? savedSelectedCases.selectedCases
      : cases.cases.map(() => false);

    groupCases = savedSelectedCases?.groupCases;

    untrack(() => {
      $prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);
      initScrambler();
    });
  });

  $effect(() => {
    getModeCases($group, modeIndex, $filters).then(res => (cases = res));
  });

  $prob = 0;
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

{#snippet displayTimer(tm: string[])}
  <span class="select-none">{tm[0]}</span>
  {#if tm[1]}
    <span
      class="text-base-content text-opacity-70 bg-primary bg-clip-text
        opacity-70 text-8xl mt-auto select-none">.{tm[1]}</span
    >
  {/if}
{/snippet}

{#snippet renderCase(cs: Case)}
  <Button
    color="neutral"
    class={"shaded-card aspect-square " +
      ($selectedCases[cs.pos] ? "border !border-primary !border-opacity-80" : "")}
    contentClass="grid"
    onclick={() => {
      $selectedCases[cs.pos] = !$selectedCases[cs.pos];
    }}
  >
    <PuzzleImage src={cs.img} />
    <span>{cs.name}</span>
    <!-- <input
      bind:checked={$selectedCases[cs.pos]}
      type="checkbox"
      class="checkbox checkbox-secondary checkbox-sm absolute top-0 left-0"
    /> -->
  </Button>
{/snippet}

<!-- Component -->
<section
  role="tabpanel"
  class={"timer-tab w-full h-full " + ($tab != 0 ? "!hidden" : "")}
  class:timerOnly
  class:scrambleOnly
  class:battle
  class:simulator={showSimulator($session)}
  data-timerstate={getTimerState($timerState)}
>
  <div
    class={twMerge(
      "scramble grid grid-rows-[auto_1fr] z-10 shaded-card relative transition-all duration-500",
      $isRunning ? "opacity-5" : ""
    )}
  >
    <div class="config flex items-center justify-between relative z-20">
      <h2 class="name font-bold">{$localLang.global.scramble}</h2>

      <div class="flex items-center gap-2 ml-auto w-fit">
        {#if $session.settings.sessionType === "mixed"}
          <Button
            style="--dash: 18;"
            onclick={() => {
              showMixedSettingsDialog = true;
            }}
          >
            <BoltIcon size="1.2rem" />
          </Button>

          <Tooltip>{$localLang.global.settings}</Tooltip>
        {/if}

        <Button style="--dash: 18;" onclick={() => initScrambler()}>
          <RefreshCwIcon size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "s"]}>{$localLang.global.toScramble}</Tooltip>

        <Button style="--dash: 18;">
          <CopyIcon size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "c"]}>{$localLang.TIMER.copyScramble}</Tooltip>

        <Button style="--dash: 18;">
          <SquarePenIcon size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "e"]}>{$localLang.TIMER.edit}</Tooltip>

        <Button style="--dash: 23;">
          <HistoryIcon size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "o"]}>{$localLang.TIMER.useOldScramble}</Tooltip>
      </div>
    </div>

    <div
      id="scramble"
      class="transition-all h-full min-h-[4rem] overflow-y-auto my-auto duration-300 max-md:text-xs max-md:leading-5 tx-text"
    >
      {#if $device instanceof GANInput}
        {#if $recoverySequence}
          <pre class="scramble-content" class:hide={$isRunning} class:battle>{"=> " +
              $recoverySequence}</pre>
        {:else if $sequenceParts.length < 3}
          {@render textSkeleton()}
        {:else}
          <pre class="scramble-content" class:hide={$isRunning} class:battle>
            {#each $sequenceParts[0].split(" ") as mv}
              <span>{mv}</span>
            {/each}
            
            <mark>{$sequenceParts[1]}</mark>
            
            {#each $sequenceParts[2].split(" ") as mv}
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

  <div id="timer" class="timer shaded-card relative overflow-hidden">
    <div class="config flex items-center justify-between relative z-20">
      <h2 class="name font-bold">{$localLang.HOME.timer}</h2>
    </div>

    <div
      id="timer"
      class="text-9xl flex flex-col justify-center gap-2 items-center w-full h-full active:bg-transparent"
      role="timer"
    >
      {#if $session?.settings?.input === "Manual"}
        <div id="manual-inp" class="max-w-[30rem]">
          <div class="text-xl w-full text-center tx-text">
            {timeStr.trim()
              ? TIMER_DNF.test(timeStr)
                ? timeStr.toUpperCase()
                : timer(timerToMilli(+timeStr), true, true)
              : ""}
          </div>

          <input
            type="text"
            bind:value={timeStr}
            onkeydown={e => {
              if (e.code === "Enter" || e.code === "NumpadEnter") {
                addTimeString();
              }
            }}
            class="input w-full !h-full max-md:w-[min(90%,20rem)] mx-auto text-center
              text-7xl outline-none text-base-content {validTimeStr(timeStr)
              ? ''
              : '!border-error border-2'}"
          />
        </div>
      {:else}
        <div class="flex flex-col items-center transition-all duration-200 mx-auto">
          {#if $timerState === TimerState.RUNNING || $timerState === TimerState.PAUSE}
            <span
              class="timer flex tx-text max-sm:text-7xl max-sm:[line-height:8rem]"
              in:scale
              class:ready={$ready}
              hidden={$timerState === TimerState.RUNNING && !$session.settings.showElapsedTime}
            >
              {@render displayTimer(timer($time, $decimals, false).split("."))}
            </span>
          {:else}
            <span
              class="timer flex items-end tx-text max-sm:text-7xl max-sm:[line-height:8rem]"
              class:prevention={$timerState === TimerState.PREVENTION}
              class:ready={$ready}
            >
              {@render displayTimer(timer($time, $decimals, false).split("."))}
            </span>

            {#if !timerOnly && $timerState === TimerState.STOPPED}
              <div
                class="flex justify-center w-full z-10"
                class:show={$timerState === TimerState.STOPPED}
                transition:blur
              >
                {#each solveControl.slice(Number(battle), solveControl.length) as control}
                  {@const Icon = control.icon}
                  <Button
                    color="none"
                    class="flex mx-1 w-5 h-5 p-0 pointer-events-auto {control.highlight(
                      $solves[0] || {}
                    )
                      ? 'text-red-500'
                      : ''}"
                    on:click={control.handler}
                  >
                    <Icon size="1.2rem" />
                  </Button>
                  <Tooltip>{control.text}</Tooltip>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        {#if $session?.settings.sessionType === "multi-step" && $timerState === TimerState.RUNNING}
          <div class="step-progress w-full max-w-[20rem]" transition:scale>
            <div class="name text-base">
              {($session.settings.stepNames || [])[$currentStep - 1] || ""}
            </div>
            <ul class="flex gap-2">
              {#each $session.settings.stepNames || [] as _, pos}
                <div
                  class={"step rounded-md h-2 w-full " +
                    (pos + 1 === $currentStep ? "bg-primary" : "bg-base-100")}
                ></div>
              {/each}
            </ul>
          </div>
        {/if}

        {#if $session?.settings?.input === "StackMat"}
          <!-- {#if $session?.settings?.input === "StackMat" || $session?.settings?.input === "ExternalTimer"} -->
          <span class="text-2xl flex gap-2 items-center">
            {$localLang.TIMER.stackmatStatus}:

            <span class={$stackmatStatus ? "text-green-600" : "text-red-600"}>
              {#if $stackmatStatus}
                <WifiIcon />s
              {:else}
                <WifiOffIcon />
              {/if}
            </span>

            <br />
          </span>
        {/if}

        <div class="action flex items-center gap-2">
          {#if $timerState === TimerState.RUNNING || $timerState === TimerState.PAUSE}
            <Button onclick={pauseOrResume}>
              {#if $timerState === TimerState.RUNNING}
                <PauseIcon size="1.2rem" />
              {:else}
                <PlayIcon size="1.2rem" />
              {/if}
            </Button>

            <Button onclick={stopTimer}>
              <XIcon size="1.2rem" />
            </Button>
          {:else}
            <Button onclick={startTimer}>
              <PlayIcon size="1.2rem" />
            </Button>
          {/if}
        </div>
      {/if}

      <span
        transition:blur
        class="timer"
        hidden={!($timerState === TimerState.RUNNING && !$session.settings.showElapsedTime)}
        >----</span
      >
    </div>
  </div>

  <div
    class={twMerge(
      "info flex flex-col overflow-x-clip overflow-y-auto gap-1 transition-all duration-500",
      $isRunning ? "opacity-5" : ""
    )}
  >
    <div
      class="image shaded-card max-h-[15rem] flex place-items-center w-full transition-all duration-200"
    >
      <PuzzleImageBundle
        src={$preview.map(s => s.src || "")}
        onclick={() => (prevExpanded = !prevExpanded)}
        class="cursor-pointer"
      />
    </div>

    <div class="shaded-card w-full h-full gap-2 justify-between text-sm !px-0">
      <StatsInfo bind:context />
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

<Modal bind:show={showMixedSettingsDialog} class="w-full max-w-2xl">
  <h2 class="text-xl text-center">{$localLang.global.settings}</h2>

  <div class="flex flex-wrap gap-2 justify-center w-fit mx-auto mt-2">
    <Select
      class="mx-auto"
      bind:value={$group}
      items={$localLang.MENU}
      transform={(_, p) => p}
      label={e => e[0]}
      onChange={() => {
        selectedGroup(true, true);
        modeIndex = 0;
      }}
    />

    <Select
      class="mx-auto"
      bind:value={modeIndex}
      items={$localLang.MENU[$group][1]}
      transform={(_, p) => p}
      label={e => e[0]}
      hasIcon={e => e[1]}
      onChange={() => {
        $mode = $localLang.MENU[$group][1][modeIndex];
        selectedMode(true, true, true);
      }}
    />
  </div>

  <!-- <span class="flex flex-wrap">filters: {$filters}</span> -->

  {#if cases.cases.length > 0}
    <div class="actions flex gap-2 flex-wrap justify-center items-center my-2">
      <Button color="accept" onclick={() => ($selectedCases = $selectedCases.map(() => true))}>
        {$localLang.IMPORT_EXPORT.selectAll}
      </Button>
      <Button color="urgent" onclick={() => ($selectedCases = $selectedCases.map(() => false))}>
        {$localLang.IMPORT_EXPORT.selectNone}
      </Button>

      {#if cases.groups.length > 0}
        <Button onclick={() => (groupCases = !groupCases)}>
          {$localLang.global[groupCases ? "toUngroup" : "toGroup"]}
        </Button>
      {/if}
    </div>

    {#if groupCases && cases.groups.length}
      <div class="overflow-x-clip overflow-y-auto max-h-[50vh] grid gap-4">
        {#each cases.groups as group}
          <div>
            <h3 class="text-lg flex items-center">
              {$localLang.TIMER.caseName(group.name)}

              <Button
                color="none"
                class="text-success ml-4 text-xs"
                onclick={() => {
                  group.cases.forEach(cs => ($selectedCases[cs.pos] = true));
                }}
              >
                {$localLang.IMPORT_EXPORT.selectAll}
              </Button>

              <Button
                color="none"
                class="text-error text-xs"
                onclick={() => {
                  group.cases.forEach(cs => ($selectedCases[cs.pos] = false));
                }}
              >
                {$localLang.IMPORT_EXPORT.selectNone}
              </Button>
            </h3>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
              {#each group.cases as cs}
                {@render renderCase(cs)}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div
        class="overflow-x-clip overflow-y-auto grid max-h-[50vh]
        grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2"
      >
        {#each cases.cases as cs}
          {@render renderCase(cs)}
        {/each}
      </div>
    {/if}
  {/if}

  <Button class="mt-4 mx-auto" onclick={saveFilters}>
    {$localLang.global.accept}
  </Button>
</Modal>

<!-- <section
  role="tabpanel"
  class:timerOnly
  class:scrambleOnly
  class:battle
  class={"timer-tab opacity-0 invisible pointer-events-none w-full h-full " +
    ($tab === 0 ? "" : "opacity-0 invisible pointer-events-none")}
  class:simulator={showSimulator($session)}
  data-timerstate={getTimerState($timerState)}
  data-timerinput={getTimerInput($session?.settings?.input || "Keyboard")}
>
  <!-- Options - ->
  {#if !scrambleOnly && !battle}
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

  <!-- Statistics - ->
  {#if !(battle || timerOnly || scrambleOnly)}
    <StatsInfo {context} />
  {/if}

  <!-- Image - ->
  <div
    id="preview-container"
    class:expanded={prevExpanded}
    class={(prevExpanded ? "" : "relative") + " " + (showSimulator($session) ? "z-0" : "")}
  >
    <!-- Cube3D - ->
    {#if showSimulator($session)}
      <section class="relative cube-3d -z-10">
        {#if $session?.settings?.input === "Virtual"}
          <Simulator
            enableDrag={true}
            enableKeyboard={false}
            contained={true}
            showBackFace={$session?.settings?.showBackFace}
            bind:this={simulator}
            zoom={9}
            movestart={() => $device.sendEvent({ type: "move:start" })}
            solved={() => $device.sendEvent({ type: "solved" })}
            animationTime={100}
          />
        {:else}
          <Simulator
            class={$bluetoothStatus ? "" : "z-0 opacity-20"}
            selectedPuzzle={"icarry"}
            enableDrag={false}
            enableKeyboard={false}
            contained={true}
            showBackFace={$session?.settings?.showBackFace}
            animationTime={100}
            bind:this={simulator}
          />

          <svelte:component
            this={BluetoothOffIcon}
            class={$bluetoothStatus ? "hidden" : "absolute text-blue-500 animate-pulse"}
            width="100%"
            height="100%"
          />
        {/if}
      </section>
    {:else if $session?.settings?.genImage || battle}
      <button
        class={`flex absolute items-center bottom-0 h-full max-w-[90%] left-1/2 translate-x-[-50%] mx-auto aspect-video
          justify-center transition-all duration-300 select-none` +
          (prevExpanded ? " bg-black w-full max-w-none z-10" : "z-0")}
        aria-label={$localLang.global.images}
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
            <PuzzleImageBundle src={$preview.map(s => s.src || "")} allowDownload={prevExpanded} />
          </div>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Scramble - ->
  <div id="scramble" class="transition-all duration-300 max-md:text-xs max-md:leading-5 tx-text">
    {#if $device instanceof GANInput}
      {#if $recoverySequence}
        <pre class="scramble-content" class:hide={$isRunning} class:battle>{"=> " +
            $recoverySequence}</pre>
      {:else if $sequenceParts.length < 3}
        <TextPlaceholder
          size="xl"
          divClass="w-full mx-auto grid gap-2 place-items-center max-h-12 overflow-hidden animate-pulse"
        />
      {:else}
        <pre class="scramble-content" class:hide={$isRunning} class:battle>
          {#each $sequenceParts[0].split(" ") as mv}
            <span>{mv}</span>
          {/each}
          
          <mark>{$sequenceParts[1]}</mark>
          
          {#each $sequenceParts[2].split(" ") as mv}
            <span>{mv}</span>
          {/each}
        </pre>
      {/if}
    {:else if !$scramble}
      <TextPlaceholder
        size="xl"
        divClass="w-full mx-auto grid gap-2 place-items-center max-h-12 overflow-hidden animate-pulse"
      />
    {:else}
      <pre class="scramble-content" class:hide={$isRunning} class:battle>{$scramble}</pre>
    {/if}
  </div>
</section>

<!-- Result - ->
<Modal
  open={reconstructor.length > 0}
  on:close={() => {
    reconstructor.length = 0;
    $enableKeyboard = localStorage.getItem("--timer-tab-enableKeyboard") === "true";
  }}
>
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
    grid-area: tabs;
  }

  .timer-tab.simulator {
    grid-template-areas:
      "options scramble scramble scramble"
      "options image image image"
      "options leftStats timer rightStats";
  }

  .timer-tab.simulator[data-timerinput="virtual"][data-timerstate="clean"] #timer {
    display: none;
  }

  .timer-tab.simulator[data-timerinput="virtual"][data-timerstate="running"] #scramble {
    display: none;
  }

  .timer-tab.simulator[data-timerstate="running"] {
    grid-template-areas:
      "options image image image"
      "options image image image"
      "options leftStats timer rightStats";
  }

  .timer-tab.simulator[data-timerstate="running"] #scramble {
    display: none;
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

  .timer-tab.battle {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "scramble"
      "timer"
      "image";
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
    @apply grid h-full place-items-center grid-cols-1;
    grid-area: scramble;
  }

  #scramble .scramble-content {
    @apply max-w-[calc(100%-2rem)] md:w-[min(calc(100%-10rem),50rem)] mx-auto break-words whitespace-pre-wrap
      flex flex-wrap gap-2 text-left justify-center items-baseline h-min max-h-[15rem];
    line-height: 1.3;
    overflow: hidden auto;
    row-gap: 0rem;
  }

  #scramble .scramble-content.battle {
    margin: 0;
    max-height: 9rem;
    text-align: center;
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
    color: var(--th-emphasis);
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
    user-select: none;
    pointer-events: none;
    touch-action: none;
    -webkit-touch-callout: none;
  }

  .cube-3d {
    @apply w-[calc(100%-1rem)] h-full bg-white bg-opacity-20 max-w-md shadow-md rounded-md mx-auto overflow-hidden;
  }
</style> -->

<style lang="postcss">
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
    @apply break-words whitespace-pre-wrap
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
