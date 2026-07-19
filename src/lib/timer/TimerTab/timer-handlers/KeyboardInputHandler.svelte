<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  // dataService was used before migration; controller now handles persistence
  import type { Device } from "$lib/timer/adaptors/devices";
  import { timer } from "@helpers/timer";
  import { Penalty, TimerState, type InputContext, type TimerContext } from "@interfaces";
  import { localLang } from "@stores/language.service";

  import {
    FlagIcon,
    MessageSquareTextIcon,
    PauseIcon,
    PlayIcon,
    ThumbsDownIcon,
    XIcon,
  } from "lucide-svelte";
  import type { Writable } from "svelte/store";
  import { blur, scale } from "svelte/transition";
  import { twMerge } from "tailwind-merge";
  import { TIMER_DEVICE_TYPES } from "$lib/timer/devices/TimerDeviceConstants";

  interface KeyboardInputProps {
    inputContext: InputContext;
    context: TimerContext;
    device: Writable<Device>;
    timerOnly?: boolean;
    showActions?: boolean;
    class?: string;
  }

  let {
    inputContext = $bindable(),
    context = $bindable(),
    device = $bindable(),
    timerOnly = $bindable(false),
    showActions = $bindable(true),
    class: _cl = $bindable(""),
  }: KeyboardInputProps = $props();

  const { editSolve, requestUpdateSolve, requestRemoveSolves, timerController } = context;

  const { reset } = inputContext;
  const { time, lastSolve, currentStep, session, ready, decimals, timerState, solves } =
    timerController;

  let solveControl = $state([
    {
      text: "Delete",
      icon: XIcon,
      highlight: () => false,
      handler: (ev: MouseEvent) => {
        ev.stopPropagation();

        if ($lastSolve) {
          requestRemoveSolves([$lastSolve]);
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

          // if (battle) {
          //   // dispatch("update", $lastSolve);
          // } else {
          requestUpdateSolve($lastSolve);
          // }
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

  function startTimer() {
    if ($device.type !== TIMER_DEVICE_TYPES.KEYBOARD) return;

    $device.keyDownHandler({ type: "keydown", code: "Space" } as KeyboardEvent);
    $device.keyUpHandler({ type: "keyup", code: "Space" } as KeyboardEvent);
  }

  function stopTimer() {
    if ($device.type !== TIMER_DEVICE_TYPES.KEYBOARD) return;

    if ($timerState === TimerState.RUNNING) {
      // In RUNNING, any non-escape keydown transitions to STOPPED and saves solve.
      $device.keyDownHandler({ type: "keydown", code: "Enter" } as KeyboardEvent);
      return;
    }

    if ($timerState === TimerState.PAUSE) {
      // In PAUSE, escape returns to CLEAR.
      $device.keyDownHandler({ type: "keydown", code: "Escape" } as KeyboardEvent);
    }
  }

  function pauseOrResume() {
    if ($device.type !== TIMER_DEVICE_TYPES.KEYBOARD) return;
    if ($timerState === TimerState.RUNNING) {
      $device.keyDownHandler({ type: "keydown", code: "KeyP" } as KeyboardEvent);
    } else if ($timerState === TimerState.PAUSE) {
      $device.keyDownHandler({ type: "keydown", code: "Space" } as KeyboardEvent);
    }
  }

  function updateTexts() {
    solveControl[0].text = $localLang.global.delete;
    solveControl[3].text = $localLang.TIMER.comments;
  }

  $effect(() => updateTexts());
</script>

{#snippet displayTimer(tm: string[])}
  <span class="cdb-timer-display-main select-none">{tm[0]}</span>
  {#if tm[1]}
    <span class="cdb-timer-display-fraction mt-auto select-none">.{tm[1]}</span>
  {/if}
{/snippet}

<div class={twMerge("flex flex-col items-center transition-all duration-200 mx-auto", _cl)}>
  {#if $timerState === TimerState.RUNNING || $timerState === TimerState.PAUSE}
    <span class="timer cdb-timer-display tx-text" in:scale class:ready={$ready}>
      {#if $session.settings.showElapsedTime || $device.type === "gan_icarry"}
        {@render displayTimer(timer($time, $decimals, false).split("."))}
      {:else}
        ---
      {/if}
    </span>
  {:else if $device.type === TIMER_DEVICE_TYPES.KEYBOARD}
    <span
      class="timer cdb-timer-display tx-text"
      class:prevention={$timerState === TimerState.PREVENTION}
      class:ready={$ready}
      class:text-error={$timerState === TimerState.PREVENTION && !$ready}
      class:text-success={$ready}
    >
      {#if $timerState === TimerState.INSPECTION && $time <= 0}
        <span class="cdb-timer-display-main select-none text-warning">+2</span>
      {:else}
        {@render displayTimer(timer($time, $decimals, false).split("."))}
      {/if}
    </span>

    {#if !timerOnly && $timerState === TimerState.STOPPED}
      <div
        class="flex justify-center w-full z-10"
        class:show={$timerState === TimerState.STOPPED}
        transition:blur
      >
        <!-- {#each solveControl.slice(Number(battle), solveControl.length) as control} -->
        {#each solveControl as control}
          {@const Icon = control.icon}
          <Tooltip tooltipText={control.text}>
            <Button
              type={control.highlight($solves[0] || {}) ? "danger" : "tertiary"}
              size="xs"
              icon
              class="mx-1 pointer-events-auto"
              onclick={control.handler}
            >
              <Icon size="1.2rem" />
            </Button>
          </Tooltip>
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

{#if showActions}
  <div class="action flex items-center gap-2">
    {#if $timerState === TimerState.RUNNING}
      <Button type="primary" size="md" icon onclick={pauseOrResume}>
        <PauseIcon />
      </Button>

      <Button type="danger" size="md" icon onclick={stopTimer}>
        <XIcon />
      </Button>
    {:else if $timerState === TimerState.PAUSE}
      <Button type="primary" size="md" icon onclick={pauseOrResume}>
        <PlayIcon />
      </Button>

      <Button type="danger" size="md" icon onclick={stopTimer}>
        <XIcon />
      </Button>
    {:else}
      <Button type="primary" size="md" icon onclick={startTimer}>
        <PlayIcon />
      </Button>
    {/if}
  </div>
{/if}
