<script lang="ts">
  import { onMount } from "svelte";
  import { derived, writable, type Writable } from "svelte/store";
  import { getSeed, setSeed } from "@cstimer/lib/mathlib";
  import { dataService } from "$lib/data-services/data.service";
  import { Popover, Spinner, Dropdown, DropdownItem, Input } from "flowbite-svelte";
  import { NotificationService } from "@stores/notification.service";
  import { localLang } from "@stores/language.service";
  import {
    DIALOG_MODES,
    TIMER_INPUT,
    type ActiveTool,
    type Solve,
    type TimerContext,
    type ToolItem,
  } from "@interfaces";
  import { copyToClipboard } from "@helpers/strings";
  import { STEP_COLORS } from "@constants";
  import TextArea from "@material/TextArea.svelte";
  import Select from "@material/Select.svelte";
  import Checkbox from "@material/Checkbox.svelte";
  import { timer } from "@helpers/timer";
  import { GANInput } from "$lib/timer/adaptors/GAN";
  import { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";
  import ToolFrame from "./timer-tools/ToolFrame.svelte";
  import CrossTool from "./timer-tools/CrossTool.svelte";
  import BldHelperTool from "./timer-tools/BLDHelperTool.svelte";
  import DailyStatsTool from "./timer-tools/DailyStatsTool.svelte";
  import MetronomeTool from "./timer-tools/MetronomeTool.svelte";
  import SolverTool from "./timer-tools/SolverTool.svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";

  // ICONS
  import CubeCategory from "@components/wca/CubeCategory.svelte";
  // import TuneIcon from "@icons/Tune.svelte";
  // import RefreshIcon from "@icons/Refresh.svelte";
  // import PencilIcon from "@icons/PencilOutline.svelte";
  // import CalendarIcon from "@icons/CalendarTextOutline.svelte";
  // import CopyIcon from "@icons/ContentCopy.svelte";
  // import SettingsIcon from "@icons/Cog.svelte";
  // import BluetoothOnIcon from "@icons/Bluetooth.svelte";
  // import BluetoothOffIcon from "@icons/BluetoothOff.svelte";
  import ToolsIcon from "@icons/Tools.svelte";
  import ChartIcon from "@icons/ChartLineVariant.svelte";
  import MetronomeIcon from "@icons/Metronome.svelte";
  import { BeanIcon, LightbulbIcon, Settings2Icon } from "lucide-svelte";
  import Modal from "@components/Modal.svelte";
  import InputAdaptorIcon from "$lib/cubicdbKit/InputAdaptorIcon.svelte";
  import Range from "$lib/cubicdbKit/Range.svelte";

  type TModal = "" | "edit-scramble" | "old-scrambles" | "settings";

  interface TimerOptionsProps {
    context: TimerContext;
    timerOnly?: boolean;
    battle?: boolean;
    enableKeyboard: Writable<boolean>;
    deviceID: Writable<string>;
    deviceList: string[][];
    // initInputHandler: Function;
  }

  let {
    context,
    timerOnly,
    battle,
    enableKeyboard,
    deviceID,
    deviceList,
    // initInputHandler,
  }: TimerOptionsProps = $props();

  const {
    tab,
    solves,
    session,
    scramble,
    mode,
    isRunning,
    bluetoothList,
    initScrambler,
    updateStatistics,
    editSessions,
  } = context;

  const iconSize = "1.2rem";

  let timerInput = derived(session, $s => {
    return DIALOG_MODES.indexOf($s.settings.mode || $mode[1] || "") > -1
      ? TIMER_INPUT
      : TIMER_INPUT.filter(inp => inp != "GAN Cube");
  });

  let notification = NotificationService.getInstance();

  /// MODAL
  let show = $state(false);
  let type: TModal = $state("");
  let modalData: any = $state(null);
  let closeHandler: Function = () => {};

  let showSeedModal = $state(false);
  let seedStr = $state("");
  let seedCounter = $state(0);

  // OTHER
  let isSearching = $state(false);
  let showToolsMenu = $state(false);
  let connectingPos = $state(-1);

  const DD_CLASS = "font-medium p-2 text-sm hover:bg-primary flex items-center";

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
      icon: ChartIcon,
      iconParams: {
        class: " m-1 pointer-events-none text-red-300 ",
      },
      component: DailyStatsTool,
      handler: () => {},
    },
    {
      id: "metronome",
      text: "Metronome",
      icon: MetronomeIcon,
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

  let toolList: ActiveTool[] = [];

  function handleSettingsDialog() {
    let initialCalc = $session?.settings?.calcAoX;

    if (!$session.settings.input) {
      $session.settings.input = "Keyboard";
    }

    openDialog("settings", $session, (data: any) => {
      if (data) {
        $session = $session;

        if (timerOnly) return;

        // initInputHandler();

        $dataService.session.updateSession({ ...$session });
        initialCalc != $session.settings.calcAoX && updateStatistics(false);
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

  function saveEnableKeyboard() {
    localStorage.setItem("--timer-options-enableKeyboard", $enableKeyboard.toString());
    $enableKeyboard = false;
  }

  function recoverEnableKeyboard() {
    $enableKeyboard = localStorage.getItem("--timer-options-enableKeyboard") === "true";
  }

  function openDialog(ev: TModal, dt: any, fn: Function) {
    if (!canOpenDialog(ev)) return;

    type = ev;
    modalData = dt;
    closeHandler = fn;
    show = true;
    saveEnableKeyboard();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!$enableKeyboard) return;

    const { code } = event;

    switch ($tab) {
      case 0: {
        if (code != "Space" && !$isRunning && !battle && event.ctrlKey) {
          if (code === "KeyS") {
            event.preventDefault();
            initScrambler();
          } else if (code === "KeyE") {
            event.preventDefault();
            if (!show || (show && type != "edit-scramble")) {
              openDialog("edit-scramble", $scramble, (scr: string) => scr && initScrambler(scr));
            }
          } else if (code === "KeyO") {
            event.preventDefault();
            openDialog("old-scrambles", null, () => {});
          } else if (code === "KeyC") {
            toClipboard();
          } else if (code === "Comma") {
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
      closeHandler(modalData.trim());
      show = false;
    }
  }

  function select(s: Solve) {
    initScrambler(s.scramble);
    closeHandler();
    show = false;
  }

  function searchBluetooth() {
    // let gn =
    //   modalData.settings.input === "GAN Cube"
    //     ? new GANInput(inputContext)
    //     : new QiYiSmartTimerInput(inputContext);
    // isSearching = true;
    // $bluetoothList.length = 0;
    // $dataService.config
    //   .searchBluetooth(gn)
    //   .then(() => {
    //     if ($inputMethod instanceof GANInput && $inputMethod.connected) {
    //       $inputMethod.disconnect();
    //     }
    //     inputMethod.set(gn);
    //   })
    //   .catch(err => {
    //     console.log("ERROR: ", err);
    //   })
    //   .finally(() => {
    //     connectingPos = -1;
    //     isSearching = false;
    //   });
  }

  function cancelSearch() {
    $dataService.config.cancelBluetoothRequest();
  }

  function connectBluetooth(id: string) {
    if (id != $deviceID) {
      isSearching = false;
      $deviceID = id;
      let type = modalData.settings.input === "GAN Cube" ? "GAN" : "QYTimer";
      $dataService.config.setPath(`timer/inputs/${type}`, { mac: id });
      $dataService.config.saveConfig();
      $dataService.config.connectBluetoothDevice(id);
    } else {
      // $inputMethod.disconnect();
    }
  }

  // function selectExternalTimer(id: string) {
  //   if (id === $deviceID) {
  //     deviceID.set("");
  //   } else {
  //     deviceID.set(id);

  //     if (!($inputMethod instanceof ExternalTimerInput)) {
  //       $inputMethod.disconnect();
  //       inputMethod.set(new ExternalTimerInput(inputContext));
  //     }

  //     ($inputMethod as ExternalTimerInput).setExternal(id);
  //     dataService.external(id, { type: "session", value: $session });
  //   }
  // }

  function addTool(tool: ToolItem) {
    showToolsMenu = false;

    if (toolList.some(t => t.tool.id === tool.id)) {
      toolList.find(t => t.tool.id === tool.id)!.open = true;
    } else {
      toolList = [...toolList, { tool, open: true }];
    }
  }

  function prepareShowSeedModal() {
    let seed = getSeed();
    seedCounter = seed[0];
    seedStr = seed[1];
    showSeedModal = true;
    saveEnableKeyboard();
  }

  function syncSolved() {
    $dataService.emitBluetoothData("sync-solved", null);
  }

  onMount(() => {
    // toolList = [{ tool: tools[4], open: true }];
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- {#if $session?.settings?.input === "GAN Cube"}
    <li>
      <Button
        aria-label={"GAN Cube"}
        
        class="{BUTTON_CLASS} {$bluetoothStatus ? 'text-blue-500' : 'text-gray-400'}"
        on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
      >
        <svelte:component
          this={$bluetoothStatus ? BluetoothOnIcon : BluetoothOffIcon}
          width="100%"
          height="100%"
        />
      </Button>

      <Popover placement="right">
        {#if $bluetoothStatus}
          <Table>
            <TableBody>
              <TableBodyRow>
                <TableBodyCell>{$localLang.global.name}</TableBodyCell>
                <TableBodyCell>{bluetoothHardware?.deviceName || "-"}</TableBodyCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableBodyCell>Hardware Version</TableBodyCell>
                <TableBodyCell>{bluetoothHardware?.hardwareVersion || "-"}</TableBodyCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableBodyCell>Software Version</TableBodyCell>
                <TableBodyCell>{bluetoothHardware?.softwareVersion || "-"}</TableBodyCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableBodyCell>Gyroscope</TableBodyCell>
                <TableBodyCell>
                  {bluetoothHardware?.gyro ? $localLang.global.yes : $localLang.global.no}
                </TableBodyCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableBodyCell>MAC</TableBodyCell>
                <TableBodyCell>{$deviceID != "default" ? $deviceID : "-"}</TableBodyCell>
              </TableBodyRow>
              <TableBodyRow>
                <TableBodyCell>Battery</TableBodyCell>
                <TableBodyCell>{bluetoothBattery ? bluetoothBattery + "%" : "-"}</TableBodyCell>
              </TableBodyRow>
            </TableBody>
          </Table>
        {:else}
          <BluetoothOffIcon size="2rem" />
        {/if}
      </Popover>
    </li>
  {/if} -->

<Button color="neutral" class="group" aria-label={"Seed"} onclick={prepareShowSeedModal}>
  <BeanIcon class="group-hover:text-green-500" size={iconSize} />
</Button>
<Tooltip placement="bottom" class="z-10">Seed</Tooltip>

<Button
  color="neutral"
  class="group"
  id="tools"
  aria-label={$localLang.HOME.tools}
  on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
>
  <ToolsIcon class="group-hover:text-warning" size={iconSize} />
</Button>
<Tooltip placement="bottom" class="z-10">
  {$localLang.HOME.tools}
</Tooltip>

<Dropdown
  bind:open={showToolsMenu}
  placement="bottom"
  class="max-h-[20rem] w-max overflow-y-scroll bg-base-100 rounded-md text-base-content"
  triggeredBy="#tools"
>
  {#each tools as tool}
    {@const Icon = tool.icon}
    <DropdownItem defaultClass={DD_CLASS} onclick={() => addTool(tool)}>
      <Icon {...tool.iconParams} size="1.2rem" />
      {tool.text}
    </DropdownItem>
  {/each}
</Dropdown>

<Button color="neutral" class="group">
  <LightbulbIcon class="group-hover:text-warning" size={iconSize} />
</Button>
<Tooltip placement="bottom" class="z-10">Hints</Tooltip>

<Button color="neutral" class="group" onclick={handleSettingsDialog}>
  <Settings2Icon class="group-hover:text-warning" size={iconSize} />
</Button>
<Tooltip placement="bottom" class="z-10" keyBindings={["control", "comma"]}>
  {$localLang.global.settings}
</Tooltip>

<!-- Tools list -->
<!-- <ul class="tool-container" class:open={toolList.some(t => t.open)}>
    {#each toolList as tool}
      <ToolFrame
        {tool}
        on:close={() => (toolList = toolList.filter(t => t.tool.id != tool.tool.id))}
        on:expand={() => (tool.open = true)}
        on:collapse={() => (tool.open = false)}
      >
        <svelte:component this={tool.tool.component} {context} />
      </ToolFrame>
    {/each}
  </ul> -->

<!-- title={$localLang.TIMER.modal[type || "settings"]} -->

<!-- Timer tab modal -->
<Modal bind:show class="space-y-2" onclose={recoverEnableKeyboard}>
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
      {#each $solves.slice(0, 500) as s}
        <Button
          aria-label={$localLang.TIMER.scramble}
          class="
          col-span-3 cursor-pointer hover:text-blue-400 my-2 justify-start p-0 rounded-none
          text-ellipsis overflow-hidden whitespace-nowrap
        "
          onclick={() => select(s)}>{s.scramble}</Button
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
          items={$timerInput}
          transform={e => e}
          placement="right"
          hasIcon={e => e}
          IconComponent={InputAdaptorIcon}
        />
      </section>
    {/if}

    <!-- Steps -->
    {#if $session.settings.sessionType === "multi-step"}
      <section
        class="flex w-max px-2 py-1 rounded-md shadow-md mx-auto my-2 border border-gray-600 cursor-default"
      >
        {$localLang.global.steps}: {$session.settings.steps}
      </section>
      <Popover>
        <div class="flex flex-wrap gap-2">
          {#each $session.settings.stepNames || [] as st, p}
            <Button
              class="pointer-events-none text-black"
              style={`background-color: ${STEP_COLORS[p]}`}>{st}</Button
            >
          {/each}
        </div>
      </Popover>
    {/if}

    <!-- External Timer -->
    <!-- {#if modalData.settings.input === "ExternalTimer"}
      <section class="bg-white bg-opacity-10 p-2 shadow-md rounded-md">
        <ul class="mt-4">
          {#each $externalTimers as { id, name } (id)}
            <li
              class="flex items-center justify-between mt-2 pl-4 bg-white bg-opacity-10 rounded-md text-white"
            >
              {name}
              <Button
                color={id === $deviceID ? "red" : "green"}
                loading={isConnecting}
                onclick={() => selectExternalTimer(id)}
              >
                {id === $deviceID ? $localLang.TIMER.disconnect : $localLang.TIMER.connect}
              </Button>
            </li>
          {/each}
        </ul>
      </section>
    {/if} -->

    <!-- Stackmat selector -->
    {#if modalData.settings.input === "StackMat"}
      <section>
        {$localLang.TIMER.device}: <Select
          class="max-w-full"
          bind:value={$deviceID}
          items={deviceList}
          label={e => e[1]}
          transform={e => e[0]}
        />
      </section>
    {/if}

    <!-- Search Bluetooth -->
    {#if modalData.settings.input === "GAN Cube" || modalData.settings.input === "QY-Timer"}
      <section class="bg-white bg-opacity-10 p-2 shadow-md rounded-md">
        <div class="flex justify-center gap-2">
          <Button onclick={() => !isSearching && searchBluetooth()}>
            {#if isSearching}
              <Spinner size="4" color="white" />
            {:else}
              {$localLang.global.search}
            {/if}
          </Button>

          {#if isSearching}
            <Button onclick={cancelSearch}>
              {$localLang.global.cancel}
            </Button>
          {/if}
        </div>

        <ul class="mt-4">
          {#each $bluetoothList as { deviceId, deviceName }, pos (deviceId)}
            <li class="flex items-center gap-2 pl-4 bg-white bg-opacity-10 rounded-md">
              {deviceName}

              <!-- {#if deviceId === $deviceID}
              <Tooltip text={$localLang.TIMER.syncSolved} position="top" class="ml-auto">
                <Button onclick={syncSolved} class="bg-primary-800 tx-text px-3">
                  <SyncIcon size="1.2rem" />
                </Button>
              </Tooltip>
              {/if} -->
              <Button
                color={deviceId === $deviceID ? "error" : "primary"}
                class="gap-2 ml-auto"
                onclick={() => {
                  if (pos === connectingPos) return;
                  if (deviceId === $deviceID) {
                    deviceList = [];
                    // $inputMethod.disconnect();
                    $deviceID = "default";
                    return;
                  }
                  connectingPos = pos;
                  connectBluetooth(deviceId);
                }}
              >
                {#if pos === connectingPos}
                  <Spinner size="4" color="white" />
                {:else}
                  {deviceId === $deviceID ? $localLang.TIMER.disconnect : $localLang.TIMER.connect}
                {/if}
              </Button>
            </li>
          {/each}
        </ul>
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
    {#if modalData.settings.input === "Keyboard" || modalData.settings.input === "ExternalTimer"}
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
    {#if modalData.settings.input === "GAN Cube"}
      <section>
        <Checkbox
          bind:checked={modalData.settings.showBackFace}
          on:change={e => ($session = $session)}
          class="w-5 h-5"
          label={$localLang.global.showBackFace}
        />
      </section>
    {/if}

    <!-- Scramble after cancel -->
    {#if modalData.settings.input != "Manual" && !timerOnly}
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
        onclick={() => {
          closeHandler(type === "settings" ? true : modalData.trim());
          show = false;
        }}
      >
        {$localLang.global.save}
      </Button>
    {/if}
  </div>
</Modal>

<!-- title={"Seed"} -->

<!-- Seed Modal -->
<Modal bind:show={showSeedModal} onclose={recoverEnableKeyboard}>
  <Input bind:value={seedStr} />
  <Input type="number" bind:value={seedCounter} min={1} max={5000} />

  <div class="flex justify-center gap-2">
    <Button onclick={() => (showSeedModal = false)}>
      {$localLang.global.cancel}
    </Button>
    <Button onclick={prepareShowSeedModal}>{$localLang.global.reset}</Button>
    <Button
      onclick={() => {
        setSeed(seedCounter, seedStr);
        initScrambler();
        showSeedModal = false;
      }}
    >
      {$localLang.global.update}
    </Button>
  </div>
</Modal>
