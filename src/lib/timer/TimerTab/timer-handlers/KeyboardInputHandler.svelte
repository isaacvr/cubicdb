<script lang="ts">
  import { solveController } from "$lib/controllers/SolveController";
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

  const { editSolve, handleUpdateSolve, handleRemoveSolves, timerController } = context;

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
          solveController
            .removeSolves([$lastSolve])
            .then(handleRemoveSolves)
            .catch(() => {});
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
          solveController
            .updateSolve($lastSolve)
            .then(handleUpdateSolve)
            .catch(() => {});
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
    if ($device.type != "timer_keyboard") return;

    $device.keyDownHandler({ type: "keydown", code: "Space" } as KeyboardEvent);
    $device.keyUpHandler({ type: "keyup", code: "Space" } as KeyboardEvent);
  }

  function stopTimer() {
    if ($device.type != "timer_keyboard") return;

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
    if ($device.type != "timer_keyboard") return;
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
  <span class="select-none">{tm[0]}</span>
  {#if tm[1]}
    <span
      class="text-base-content/70 bg-primary bg-clip-text
        opacity-70 text-8xl mt-auto select-none">.{tm[1]}</span
    >
  {/if}
{/snippet}

<div class={twMerge("flex flex-col items-center transition-all duration-200 mx-auto", _cl)}>
  {#if $timerState === TimerState.RUNNING || $timerState === TimerState.PAUSE}
    <span
      class="timer flex tx-text max-sm:text-7xl max-sm:leading-32"
      in:scale
      class:ready={$ready}
    >
      {#if $session.settings.showElapsedTime || $device.type === "gan_icarry"}
        {@render displayTimer(timer($time, $decimals, false).split("."))}
      {:else}
        ---
      {/if}
    </span>
  {:else if $device.type === "timer_keyboard"}
    <span
      class="timer flex items-end tx-text max-sm:text-7xl max-sm:leading-32"
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
        <!-- {#each solveControl.slice(Number(battle), solveControl.length) as control} -->
        {#each solveControl as control}
          {@const Icon = control.icon}
          <Tooltip tooltipText={control.text}>
            <Button
              color="none"
              class="flex mx-1 w-5 h-5 p-0 pointer-events-auto {control.highlight($solves[0] || {})
                ? 'text-red-500'
                : ''}"
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
