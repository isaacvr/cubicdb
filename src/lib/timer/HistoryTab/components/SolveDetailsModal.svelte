<script lang="ts">
  import moment from "moment";
  import { options } from "@cstimer/scramble/scramble";
  import { STEP_COLORS } from "@constants";
  import type { Penalty as PenaltyType, Solve } from "@interfaces";
  import { Penalty } from "@interfaces";
  import { sTimer, timer } from "@helpers/timer";
  import Modal from "@components/Modal.svelte";
  import PuzzleImageBundle from "@components/PuzzleImageBundle.svelte";
  import TextArea from "@material/TextArea.svelte";
  import { Dropdown, DropdownItem, Spinner } from "$lib/cubicdbKit";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import { localLang } from "@stores/language.service";
  import {
    CalendarIcon,
    ChevronDownIcon,
    Dice5Icon,
    MessageSquareTextIcon,
    RouteIcon,
    SaveIcon,
    TrashIcon,
    XIcon,
  } from "lucide-svelte";

  interface PenaltyOption {
    label: string;
    penalty: PenaltyType;
  }

  interface SolveEditTransitionNames {
    shell: string;
    date: string;
    time: string;
  }

  interface SolveDetailsModalProps {
    show?: boolean;
    solve: Solve;
    preview: string[];
    solveSteps: number[];
    stepNames: string[];
    isMultiStepSession: boolean;
    reconstructionError: boolean;
    penalties: PenaltyOption[];
    transitionNames: SolveEditTransitionNames;
    onclose: (solve?: Solve) => void;
    ondelete: () => void;
    oncheckReconstruction: () => void;
    onparse: (text: string) => string;
    onsetPenalty: (penalty: PenaltyType) => void;
  }

  let {
    show = $bindable(false),
    solve = $bindable(),
    preview,
    solveSteps,
    stepNames,
    isMultiStepSession,
    reconstructionError,
    penalties,
    transitionNames,
    onclose,
    ondelete,
    oncheckReconstruction,
    onparse,
    onsetPenalty,
  }: SolveDetailsModalProps = $props();

  let fComment = $state(false);
  let showDropdown = $state(false);
  let penaltyTriggerElement: HTMLDivElement | null = $state(null);

  function focusTextArea(focused: boolean) {
    setTimeout(() => (fComment = focused), 100);
  }

  let activePenaltyLabel = $derived(
    [{ label: $localLang.TIMER.noPenalty, penalty: Penalty.NONE }, ...penalties].find(
      p => p.penalty === solve.penalty
    )?.label || $localLang.TIMER.noPenalty
  );
</script>

<Modal
  bind:show
  {onclose}
  title={$localLang.TIMER.edit}
  showCloseButton
  closeOnClickOutside
  size="2xl"
  class="w-[min(100%,40rem)] shaded-card"
  transitionName={transitionNames.shell}
>
  <div class="flex justify-between items-center m-2">
    <span
      class="view-time m-1 w-max text-lg font-bold"
      style:view-transition-name={transitionNames.time}
    >
      {#if solve.penalty === Penalty.NONE || solve.penalty === Penalty.P2}
        {sTimer(solve, true, true)}
      {/if}
      {#if solve.penalty === Penalty.P2}
        <span class="font-small text-red-500">+2</span>
      {/if}
      {#if solve.penalty === Penalty.DNF}
        <span class="font-small text-red-500">DNF</span>
      {/if}
      {#if solve.penalty === Penalty.DNS}
        <span class="font-small text-red-500">DNS</span>
      {/if}
    </span>
    <span class="flex items-center font-small">
      <CalendarIcon size="1.2rem" />
      <span class="ml-2" style:view-transition-name={transitionNames.date}>
        {moment(solve?.date).format("D MMM YYYY")} <br />
        {moment(solve?.date).format("HH:MM")}
      </span>
    </span>
  </div>
  <div
    class={"algorithm-container m-2 transition-all duration-300 delay-100 " +
      (fComment ? "collapsed" : "")}
  >
    <Dice5Icon size="1.2rem" />

    <pre
      contenteditable="false"
      class="text-center text-sm wrap-break-word whitespace-normal overflow-auto max-h-[20svh]">
        {@html solve?.scramble?.replaceAll("\n", "<br>") || ""}
      </pre>

    <div
      class="preview col-span-2 mx-auto overflow-hidden w-full h-full
        flex items-center justify-center relative px-1 max-h-[30vh]"
    >
      {#if preview}
        <PuzzleImageBundle src={preview} allowDownload />
      {:else}
        <Spinner size="20" />
      {/if}
    </div>

    {#if isMultiStepSession && solve?.steps?.length}
      <hr class="w-full border border-t-gray-400 col-span-2" />
      <h3 class="text-center col-span-2 mt-2 mb-8 text-lg">
        {$localLang.global.steps}
      </h3>

      <div class="col-span-2 flex mb-4">
        {#each solveSteps as s, p (p)}
          <span
            class="step-part"
            data-percent={`${s}%`}
            data-time={timer((solve.steps || [])[p], true, true)}
            style={`
                width: ${s}%;
                background-color: ${STEP_COLORS[p]};
                --p: ${p};
              `}
          ></span>
        {/each}
      </div>

      <div class="col-span-2 flex mb-4 text-center -mt-4">
        {#each solveSteps as s, p (p)}
          <span style={`width: ${s}%; `}>{stepNames[p] || ""}</span>
        {/each}
      </div>
    {/if}

    <MessageSquareTextIcon size="1.2rem" />

    <TextArea
      blurOnEscape
      onfocus={() => focusTextArea(true)}
      onblur={() => focusTextArea(false)}
      cClass={fComment ? "max-h-[30ch]" : "max-h-[20ch]"}
      getInnerText={onparse}
      class="border border-gray-400 text-sm"
      bind:value={solve.comments}
      placeholder={$localLang.TIMER.comment}
    />
  </div>
  <div class="mt-2 flex flex-wrap justify-evenly gap-1">
    <Button aria-label={$localLang.global.delete} type="danger" onclick={ondelete}>
      <TrashIcon size="1.2rem" />
      {$localLang.global.delete}
    </Button>

    <Button aria-label={$localLang.global.cancel} type="secondary" onclick={() => onclose()}>
      <XIcon size="1.2rem" />
      {$localLang.global.cancel}
    </Button>

    <Button
      aria-label={$localLang.global.save}
      onclick={() => {
        onclose(solve);
      }}
      class="mr-2 text-sm gap-1 px-2"
    >
      <SaveIcon size="1.2rem" />
      {$localLang.global.save}
    </Button>

    {#if !reconstructionError}
      <Tooltip tooltipText={$localLang.global.reconstruction}>
        <Button
          aria-label={$localLang.global.reconstruction}
          onclick={oncheckReconstruction}
          type="success"
          size="sm"
          icon
        >
          <RouteIcon size="1.2rem" />
        </Button>
      </Tooltip>
    {/if}

    <div class="relative" bind:this={penaltyTriggerElement}>
      <Button>
        {activePenaltyLabel}

        <ChevronDownIcon size="1.2rem" />
      </Button>
      <Dropdown
        trigger={penaltyTriggerElement}
        bind:open={showDropdown}
        class="bg-base-200 text-base-content rounded-md"
      >
        {#each [{ label: $localLang.TIMER.noPenalty, penalty: Penalty.NONE }, ...penalties] as p}
          <DropdownItem
            class="bg-base-200 hover:bg-base-300"
            onclick={() => {
              onsetPenalty(p.penalty);
              showDropdown = false;
            }}
          >
            {p.label}
          </DropdownItem>
        {/each}
      </Dropdown>
    </div>
  </div>
</Modal>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .font-small {
    font-size: 0.7rem;
  }

  .algorithm-container {
    display: grid;
    grid-template-columns: 1.3rem 1fr;
    grid-template-rows: auto 1fr auto auto auto;
  }

  .algorithm-container.collapsed {
    grid-template-rows: auto 0.5fr auto auto auto;
  }

  .step-part {
    height: 1.8rem;
    display: flex;
    position: relative;
  }

  .step-part:first-child {
    @apply rounded-l-full;
  }

  .step-part:last-child {
    @apply rounded-r-full;
  }

  .step-part::before {
    content: attr(data-percent);
    position: absolute;
    left: 50%;
    transform: translate(-50%, -1.5rem);
  }

  .step-part::after {
    content: attr(data-time);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: black;
    font-size: 0.8rem;
  }
</style>
