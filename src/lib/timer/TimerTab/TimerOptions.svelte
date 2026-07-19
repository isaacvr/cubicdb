<script lang="ts">
  import { untrack } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import { getSeed, setSeed } from "@cstimer/lib/mathlib";
  import { dataService } from "$lib/data-services/data.service";
  import { sessionController } from "$lib/controllers/SessionController";
  import { NotificationService } from "@stores/notification.service";
  import { localLang } from "@stores/language.service";
  import { type ActiveTool, type Solve, type TimerContext, type ToolItem } from "@interfaces";
  import { copyToClipboard } from "@helpers/strings";
  import { STEP_COLORS } from "@constants";
  import TextArea from "@material/TextArea.svelte";
  import Select from "@material/Select.svelte";
  import Checkbox from "@material/Checkbox.svelte";
  import { timer } from "@helpers/timer";
  import CrossTool from "./timer-tools/CrossTool.svelte";
  import BldHelperTool from "./timer-tools/BLDHelperTool.svelte";
  import DailyStatsTool from "./timer-tools/DailyStatsTool.svelte";
  import MetronomeTool from "./timer-tools/MetronomeTool.svelte";
  import SolverTool from "./timer-tools/SolverTool.svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Input from "$lib/cubicdbKit/Input.svelte";

  import CubeCategory from "@components/wca/CubeCategory.svelte";

  import {
    BeanIcon,
    BoltIcon,
    ChartSplineIcon,
    CopyIcon,
    HammerIcon,
    HistoryIcon,
    LightbulbIcon,
    MusicIcon,
    RefreshCwIcon,
    Settings2Icon,
    SquarePenIcon,
  } from "lucide-svelte";
  import Modal from "@components/Modal.svelte";
  import Range from "$lib/cubicdbKit/Range.svelte";
  import { clone } from "@helpers/object";
  import DeviceIcon from "$lib/cubicdbKit/DeviceIcon.svelte";
  import { getModeCases, type Case, type IModeCase } from "./getModeCases";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { devices } from "@stores/devices.store";
  import { resolveTimerDeviceSelection } from "../devices/TimerDeviceSelection";
  import { TIMER_DEVICE_TYPES } from "../devices/TimerDeviceConstants";

  type TModal = "" | "edit-scramble" | "old-scrambles" | "settings";

  interface OptionSelector {
    seed?: boolean;
    tools?: boolean;
    hints?: boolean;
    sessionSettings?: boolean;
    modeSettings?: boolean;
    refreshScramble?: boolean;
    copyScramble?: boolean;
    editScramble?: boolean;
    oldScramble?: boolean;
  }

  interface TimerOptionsProps {
    context: TimerContext;
    timerOnly?: boolean;
    battle?: boolean;
    // enableKeyboard: Writable<boolean>;
    initInputHandler: (...args: any[]) => any;
    options: OptionSelector;
  }

  let {
    context = $bindable(),
    timerOnly = $bindable(),
    battle = $bindable(),
    // enableKeyboard = $bindable(),
    initInputHandler,
    options,
  }: TimerOptionsProps = $props();

  const { initScrambler, selectedGroup, selectedMode, timerController } = context;
  const {
    session,
    device,
    deviceList,
    tab,
    group,
    scramble,
    prob,
    isRunning,
    mode,
    filters,
    solves,
  } = timerController;

  const iconSize = "1.2rem";

  let notification = NotificationService.getInstance();

  /// MODAL
  let show = $state(false);
  let type: TModal = $state("");
  let modalData: any = $state(null);
  let closeHandler: (...args: any[]) => any = () => {};

  let showSeedModal = $state(false);
  let seedStr = $state("");
  let seedCounter = $state(0);
  let showMixedSettingsDialog = $state(false);
  let modeIndex = $state(0);
  let groupCases = $state(false);
  let cases: IModeCase = $state({ cases: [], groups: [] });
  let selectedCases: Writable<boolean[]> = writable([]);

  // OTHER
  let showToolsMenu = $state(false);

  const DD_CLASS = "font-medium p-2 text-sm hover:bg-primary flex items-center";
  const TIMER_OPTION_BUTTON_COLOR = "ghost";
  const TIMER_OPTION_BUTTON_CLASS = "cdb-action-icon-button size-8 min-h-8 p-0";

  const tools: ToolItem[] = [
    {
      id: "cross-xcross",
      text: "Cross & XCross",
      icon: CubeCategory,
      iconParams: {
        icon: "333cross",
        containerClass: " pointer-events-none text-green-300 ",
      },
      component: CrossTool,
      handler: () => {},
    },
    {
      id: "bld-helper",
      text: "BLD Helper",
      icon: CubeCategory,
      iconParams: {
        icon: "333ni",
        containerClass: " pointer-events-none text-orange-300 ",
      },
      component: BldHelperTool,
      hasSettings: true,
      handler: () => {},
    },
    {
      id: "daily-stats",
      text: "Daily Stats",
      icon: ChartSplineIcon,
      iconParams: {
        class: " m-1 pointer-events-none text-red-300 ",
      },
      component: DailyStatsTool,
      handler: () => {},
    },
    {
      id: "metronome",
      text: "Metronome",
      icon: MusicIcon,
      iconParams: {
        class: " m-1 pointer-events-none text-purple-300 ",
      },
      component: MetronomeTool,
      handler: () => {},
    },
    // {
    //   id: "stackmat",
    //   text: "Stackmat",
    //   icon: HandIcon,
    //   iconParams: {
    //     class: " m-1 pointer-events-none text-blue-300 ",
    //   },
    //   component: StackmatTool,
    //   handler: () => {},
    // },
    {
      id: "solver",
      text: "Solver",
      icon: CubeCategory,
      iconParams: {
        icon: "333",
        containerClass: " pointer-events-none text-green-300 ",
      },
      component: SolverTool,
      handler: () => {},
    },
  ];

  let toolList: ActiveTool[] = $state([]);

  async function handleSettingsDialog() {
    let initialCalc = $session?.settings?.calcAoX;
    const normalizedInput = resolveTimerDeviceSelection($session.settings.input, $devices);

    if (normalizedInput && normalizedInput !== $session.settings.input) {
      const updated = await sessionController
        .applySettings($session, { input: normalizedInput } as any)
        .catch(() => null);
      if (updated) $session = updated;
    }

    openDialog("settings", $session, async (data: any) => {
      // Persist the whole settings object, then ensure the input device is valid
      const updated = await sessionController
        .applySettings($session, modalData.settings)
        .catch(() => null);
      if (updated) $session = updated;

      let input = modalData.settings.input;
      let dv = $devices.find(d => d.id === input);

      if (!dv) {
        const upd = await sessionController
          .applySettings($session, { input: $devices[0].id } as any)
          .catch(() => null);
        if (upd) $session = upd;
        $device = $devices[0];
      } else {
        const upd = await sessionController
          .applySettings($session, { input } as any)
          .catch(() => null);
        if (upd) $session = upd;
        $device = dv;
      }

      $devices.forEach(device => (device.enabled = device.id === input));

      if (data) {
        if (timerOnly) return;

        initInputHandler($session.settings.input);

        // Settings already persisted via applySettings above
        if (initialCalc != $session.settings.calcAoX) {
          timerController.updateStatistics(false);
        }
      }
    });
  }

  function toClipboard() {
    copyToClipboard($scramble).then(() => {
      notification.addNotification({
        header: $localLang.global.done,
        text: $localLang.global.scrambleCopied,
        timeout: 1000,
      });
    });
  }

  function canOpenDialog(ev: string) {
    if (timerOnly) {
      return ["settings"].indexOf(ev) > -1;
    }

    return true;
  }

  // function saveEnableKeyboard() {
  //   localStorage.setItem("--timer-options-enableKeyboard", enableKeyboard.toString());
  //   enableKeyboard.set(false);
  // }

  // function recoverEnableKeyboard() {
  //   enableKeyboard.set(localStorage.getItem("--timer-options-enableKeyboard") === "true");
  // }

  function openDialog(ev: TModal, dt: any, fn: (...args: any[]) => any) {
    if (!canOpenDialog(ev)) return;

    type = ev;
    modalData = { ...dt };
    closeHandler = fn;
    show = true;
    // saveEnableKeyboard();
  }

  function handleKeydown(event: KeyboardEvent) {
    // if (!$enableKeyboard) return;

    const { code } = event;

    switch ($tab) {
      case 0: {
        if (code != "Space" && !$isRunning && !battle && event.ctrlKey) {
          if (code === "KeyS" && options.refreshScramble) {
            event.preventDefault();
            initScrambler(undefined, undefined, undefined, event);
          } else if (code === "KeyE" && options.editScramble) {
            event.preventDefault();
            if (!show || (show && type != "edit-scramble")) {
              openDialog(
                "edit-scramble",
                $scramble,
                (scr: string, nativeEvent?: KeyboardEvent | MouseEvent) =>
                  scr && initScrambler(scr, undefined, undefined, nativeEvent)
              );
            }
          } else if (code === "KeyO" && options.oldScramble) {
            event.preventDefault();
            openDialog("old-scrambles", null, () => {});
          } else if (code === "Comma" && options.sessionSettings) {
            handleSettingsDialog();
          }
        }
        break;
      }
    }
  }

  function modalKeyupHandler(e: KeyboardEvent) {
    e.stopPropagation();
    show = e.code === "Escape" ? closeHandler() : show;

    if (e.code === "Enter" && e.ctrlKey) {
      closeHandler(modalData.trim(), e);
      show = false;
    }
  }

  function select(s: Solve, nativeEvent: MouseEvent) {
    initScrambler(s.scramble, undefined, undefined, nativeEvent);
    closeHandler();
    show = false;
  }

  function addTool(tool: ToolItem) {
    showToolsMenu = false;

    if (toolList.some(t => t.tool.id === tool.id)) {
      toolList.find(t => t.tool.id === tool.id)!.open = true;
    } else {
      toolList = [...toolList, { tool, open: false }];
    }
  }

  function prepareShowSeedModal() {
    let seed = getSeed();
    seedCounter = seed[0];
    seedStr = seed[1];
    showSeedModal = true;
    // saveEnableKeyboard();
  }

  function saveFilters() {
    showMixedSettingsDialog = false;
    $dataService.config.setPath(`filters/${$session._id}/${$group}/${modeIndex}`, {
      selectedCases: clone($selectedCases),
      groupCases,
    });

    $dataService.config.saveConfig();
    $prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);
  }

  $effect(() => {
    if (!options.modeSettings) return;
    if (isNaN($group)) return;

    for (let i = 0, maxi = $localLang.MENU[$group][1].length; i < maxi; i += 1) {
      if ($mode[1] === $localLang.MENU[$group][1][i][1]) {
        modeIndex = i;
        break;
      }
    }
  });

  $effect(() => {
    if (!options.modeSettings) return;

    let savedSelectedCases = $dataService.config.getPath(
      `filters/${$session._id}/${$group}/${modeIndex}`
    );

    $selectedCases = savedSelectedCases
      ? savedSelectedCases.selectedCases
      : cases.cases.map(() => false);

    groupCases = savedSelectedCases?.groupCases;

    untrack(() => {
      $prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);
    });
  });

  $effect(() => {
    if (!options.modeSettings) return;
    getModeCases($group, modeIndex, $filters).then(res => (cases = res));
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if options.seed}
  <Tooltip tooltipText="Seed" placement="bottom-end" class="z-10">
    <Button color="neutral" class="group" aria-label="Seed" onclick={prepareShowSeedModal}>
      <BeanIcon class="group-hover:text-green-500" size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.tools}
  <Tooltip tooltipText={$localLang.HOME.tools} placement="bottom-end" class="z-10">
    <Button
      color="neutral"
      class="group"
      id="tools"
      aria-label={$localLang.HOME.tools}
      on:keydown={e => (e.detail.code === "Space" ? e.detail.preventDefault() : null)}
    >
      <HammerIcon class="group-hover:text-warning" size={iconSize} />
    </Button>
  </Tooltip>

  <div
    class="absolute mt-2 bg-base-100 rounded-md text-base-content z-50 shadow-lg max-h-80 overflow-y-auto {showToolsMenu
      ? 'block'
      : 'hidden'}"
  >
    {#each tools as tool (tool.id)}
      {@const Icon = tool.icon}
      <button
        class={DD_CLASS}
        onclick={() => {
          addTool(tool);
          showToolsMenu = false;
        }}
      >
        <Icon {...tool.iconParams} size={iconSize} />
        {tool.text}
      </button>
    {/each}
  </div>
{/if}

{#if options.hints}
  <Tooltip tooltipText="Hints" placement="bottom-end" class="z-10">
    <Button color="neutral" class="group">
      <LightbulbIcon class="group-hover:text-warning" size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.sessionSettings}
  <Tooltip
    tooltipText={$localLang.global.settings}
    placement="bottom-end"
    class="z-30"
    keyBindings={["control", "comma"]}
  >
    <Button color="neutral" class="group" onclick={handleSettingsDialog}>
      <Settings2Icon class="group-hover:text-warning" size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.modeSettings && $session.settings.sessionType === "mixed"}
  <Tooltip tooltipText={$localLang.global.settings} placement="bottom-end" class="z-30">
    <Button
      color={TIMER_OPTION_BUTTON_COLOR}
      class={TIMER_OPTION_BUTTON_CLASS}
      style="--dash: 18;"
      onclick={() => {
        showMixedSettingsDialog = true;
      }}
    >
      <BoltIcon size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.refreshScramble}
  <Tooltip
    tooltipText={$localLang.global.toScramble}
    placement="bottom-end"
    class="z-30"
    keyBindings={["control", "s"]}
  >
    <Button
      color={TIMER_OPTION_BUTTON_COLOR}
      class={TIMER_OPTION_BUTTON_CLASS}
      style="--dash: 18;"
      onclick={(event: MouseEvent) => initScrambler(undefined, undefined, undefined, event)}
    >
      <RefreshCwIcon size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.copyScramble}
  <Tooltip tooltipText={$localLang.TIMER.copyScramble} placement="bottom-end" class="z-30">
    <Button
      color={TIMER_OPTION_BUTTON_COLOR}
      class={TIMER_OPTION_BUTTON_CLASS}
      style="--dash: 18;"
      onclick={() => {
        copyToClipboard($scramble).then(() => {
          notification.addNotification({
            header: $localLang.global.done,
            text: $localLang.global.scrambleCopied,
            timeout: 1000,
          });
        });
      }}
    >
      <CopyIcon size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.editScramble}
  <Tooltip
    tooltipText={$localLang.TIMER.edit}
    placement="bottom-end"
    class="z-30"
    keyBindings={["control", "e"]}
  >
    <Button
      color={TIMER_OPTION_BUTTON_COLOR}
      class={TIMER_OPTION_BUTTON_CLASS}
      style="--dash: 18;"
      onclick={() =>
        openDialog(
          "edit-scramble",
          $scramble,
          (scr: string, nativeEvent?: KeyboardEvent | MouseEvent) =>
            scr && initScrambler(scr, undefined, undefined, nativeEvent)
        )}
    >
      <SquarePenIcon size={iconSize} />
    </Button>
  </Tooltip>
{/if}

{#if options.oldScramble}
  <Tooltip
    tooltipText={$localLang.TIMER.useOldScramble}
    placement="bottom-end"
    class="z-30"
    keyBindings={["control", "o"]}
  >
    <Button color={TIMER_OPTION_BUTTON_COLOR} class={TIMER_OPTION_BUTTON_CLASS} style="--dash: 23;">
      <HistoryIcon size={iconSize} />
    </Button>
  </Tooltip>
{/if}

<!-- Tools list -->
<!-- <ul class="tool-container" class:open={toolList.some(t => t.open)}> -->
<!-- {#each toolList as tool}
    {@const ToolComponent = tool.tool.component}
    <ToolFrame
      {tool}
      on:close={() => (toolList = toolList.filter(t => t.tool.id != tool.tool.id))}
      on:expand={() => (tool.open = true)}
      on:collapse={() => (tool.open = false)}
    >
      <ToolComponent {context} />
    </ToolFrame>
  {/each} -->
<!-- </ul> -->

<!-- title={$localLang.TIMER.modal[type || "settings"]} -->

<!-- Timer tab modal onclose={recoverEnableKeyboard} -->
<Modal bind:show class="space-y-2">
  {#if type === "edit-scramble"}
    <TextArea
      onkeyup={modalKeyupHandler}
      class="bg-gray-900 text-gray-200 border border-gray-600"
      bind:value={modalData}
    />
  {/if}

  {#if type === "old-scrambles"}
    <div class="grid grid-cols-4 w-full text-center max-h-[calc(100vh-16rem)]">
      <h2 class="col-span-3">{$localLang.TIMER.scramble}</h2>
      <h2 class="col-span-1">{$localLang.TIMER.time}</h2>
      {#each $solves.slice(0, 500) as s (s._id)}
        <Button
          aria-label={$localLang.TIMER.scramble}
          class="
          col-span-3 cursor-pointer hover:text-blue-400 my-2 justify-start p-0 rounded-none
          text-ellipsis overflow-hidden whitespace-nowrap
        "
          onclick={(event: MouseEvent) => select(s, event)}>{s.scramble}</Button
        >
        <span class="col-span-1 flex items-center justify-center">{timer(s.time, true, true)}</span>
      {/each}
    </div>
  {/if}

  {#if type === "settings"}
    <!-- Input Method -->
    {#if !(timerOnly || $session.settings.sessionType === "multi-step")}
      <section class="flex gap-4 items-center">
        {$localLang.TIMER.inputMethod}:
        <Select
          bind:value={modalData.settings.input}
          items={$devices}
          label={e => e.name}
          transform={e => e.id}
          placement="right-start"
          hasIcon={e => e.type}
          iconKey="type"
          IconComponent={DeviceIcon}
        />
      </section>
    {/if}

    {@const selectedDevice = $devices.find(d => d.id === modalData.settings.input)}

    <!-- Steps -->
    {#if $session.settings.sessionType === "multi-step"}
      <section
        class="flex w-max px-2 py-1 rounded-md shadow-md mx-auto my-2 border border-gray-600 cursor-default"
      >
        {$localLang.global.steps}: {$session.settings.steps}
      </section>
      <div class="flex flex-wrap gap-2">
        {#each $session.settings.stepNames || [] as st, p (p)}
          <Button
            class="pointer-events-none text-black"
            style={`background-color: ${STEP_COLORS[p]}`}>{st}</Button
          >
        {/each}
      </div>
    {/if}

    <!-- External Timer -->
    <!-- {#if modalData.settings.input === "ExternalTimer"}
      <section class="bg-white/10 p-2 shadow-md rounded-md">
        <ul class="mt-4">
          {#each $externalTimers as { id, name } (id)}
            <li
              class="flex items-center justify-between mt-2 pl-4 bg-white/10 rounded-md text-white"
            >
              {name}
              <Button
                color={id === $device.id ? "red" : "green"}
                loading={isConnecting}
                onclick={() => selectExternalTimer(id)}
              >
                {id === $device.id ? $localLang.TIMER.disconnect : $localLang.TIMER.connect}
              </Button>
            </li>
          {/each}
        </ul>
      </section>
    {/if} -->

    <!-- Stackmat selector -->
    {#if selectedDevice && selectedDevice.type === "stackmat"}
      <section>
        {$localLang.TIMER.device}: <Select
          class="max-w-full"
          bind:value={$device.id}
          items={$deviceList}
          label={e => e[1]}
          transform={e => e[0]}
        />
      </section>
    {/if}

    <section class="flex flex-wrap gap-4 items-center">
      <Checkbox
        bind:checked={modalData.settings.hasInspection}
        class="w-5 h-5"
        label={$localLang.TIMER.inspection +
          (modalData.settings.hasInspection ? ` (${modalData.settings.inspection})s` : "")}
      />

      {#if modalData.settings.hasInspection}
        <Range
          class="w-52 mx-auto"
          bind:value={modalData.settings.inspection}
          min={5}
          max={60}
          step={5}
        />
      {/if}
    </section>

    <!-- Inspections, Prevention, Elapsed time -->
    {#if selectedDevice && selectedDevice.type === TIMER_DEVICE_TYPES.KEYBOARD}
      <section>
        <Checkbox
          bind:checked={modalData.settings.withoutPrevention}
          class="w-5 h-5"
          label={$localLang.TIMER.withoutPrevention}
        />

        <i class="text-sm text-yellow-500">({$localLang.TIMER.withoutPreventionDescription})</i>
      </section>

      <section>
        <Checkbox
          bind:checked={modalData.settings.showElapsedTime}
          class="w-5 h-5 my-2"
          label={$localLang.TIMER.showTime}
        />
      </section>
    {/if}

    <!-- Show back face -->
    {#if selectedDevice && selectedDevice.type === "gan_icarry"}
      <section>
        <Checkbox
          bind:checked={modalData.settings.showBackFace}
          on:change={() => ($session = $session)}
          class="w-5 h-5"
          label={$localLang.global.showBackFace}
        />
      </section>
    {/if}

    <!-- Scramble after cancel -->
    {#if selectedDevice && selectedDevice.type != "manual_entry" && !timerOnly}
      <section class="mt-2">
        <Checkbox
          bind:checked={modalData.settings.scrambleAfterCancel}
          class="w-5 h-5 my-2"
          label={$localLang.TIMER.refreshScramble}
        />
      </section>
    {/if}

    <!-- Gen images, Celebrations, AoX calculation -->
    {#if !timerOnly}
      <section>
        <Checkbox
          bind:checked={modalData.settings.genImage}
          class="w-5 h-5 my-2"
          label={$localLang.TIMER.genImage}
        />
      </section>

      <section>
        <Checkbox
          bind:checked={modalData.settings.recordCelebration}
          class="w-5 h-5 my-2"
          label={$localLang.TIMER.recordCelebration}
        />
      </section>

      <section class="flex flex-wrap gap-4 items-center">
        {$localLang.TIMER.aoxCalculation}:

        <Select
          value={~~modalData.settings.calcAoX}
          items={[$localLang.TIMER.sequential, $localLang.TIMER.groupOfX]}
          transform={(_, p) => p}
          label={e => e}
          onChange={(_, p) => (modalData.settings.calcAoX = p)}
        />
      </section>
    {/if}
  {/if}

  <div class="flex w-full justify-center gap-2">
    <Button color="cancel" aria-label={$localLang.global.cancel} onclick={() => (show = false)}>
      {$localLang.global.cancel}
    </Button>

    {#if type === "edit-scramble" || type === "settings"}
      <Button
        aria-label={$localLang.global.save}
        onclick={(event: MouseEvent) => {
          closeHandler(type === "settings" ? true : modalData.trim(), event);
          show = false;
        }}
      >
        {$localLang.global.save}
      </Button>
    {/if}
  </div>
</Modal>

<!-- Seed Modal onclose={recoverEnableKeyboard} -->
<Modal bind:show={showSeedModal}>
  <Input bind:value={seedStr} />
  <Input type="number" bind:value={seedCounter} min={1} max={5000} class="mt-2" />

  <div class="flex justify-center gap-2 mt-4">
    <Button onclick={() => (showSeedModal = false)}>
      {$localLang.global.cancel}
    </Button>
    <Button onclick={prepareShowSeedModal}>{$localLang.global.reset}</Button>
    <Button
      onclick={(event: MouseEvent) => {
        setSeed(seedCounter, seedStr);
        initScrambler(undefined, undefined, undefined, event);
        showSeedModal = false;
      }}
    >
      {$localLang.global.update}
    </Button>
  </div>
</Modal>

{#snippet renderCase(cs: Case)}
  <Button
    color="neutral"
    class={"shaded-card aspect-square " +
      ($selectedCases[cs.pos] ? "border border-primary/80!" : "")}
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

<!-- Trainer Modal onclose={recoverEnableKeyboard} -->
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
        {#each cases.groups as group (group)}
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
              {#each group.cases as cs (cs)}
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
        {#each cases.cases as cs (cs)}
          {@render renderCase(cs)}
        {/each}
      </div>
    {/if}
  {/if}

  <Button class="mt-4 mx-auto" onclick={saveFilters}>
    {$localLang.global.accept}
  </Button>
</Modal>
