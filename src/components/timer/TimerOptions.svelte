<script lang="ts">
  import { derived, type Writable } from "svelte/store";
  import { Button, Modal, Popover, Range, Spinner, Dropdown, DropdownItem } from "flowbite-svelte";
  import { DataService } from "@stores/data.service";
  import { NotificationService } from "@stores/notification.service";
  import { localLang } from "@stores/language.service";
  import {
    DIALOG_MODES,
    TIMER_INPUT,
    type ActiveTool,
    type InputContext,
    type Solve,
    type TimerContext,
    type TimerInputHandler,
    type ToolItem,
  } from "@interfaces";
  import { copyToClipboard, randomUUID } from "@helpers/strings";
  import { CubeDBICON, STEP_COLORS } from "@constants";
  import TextArea from "@components/material/TextArea.svelte";
  import Select from "@components/material/Select.svelte";
  import Checkbox from "@components/material/Checkbox.svelte";
  import Tooltip from "@components/material/Tooltip.svelte";
  import { timer } from "@helpers/timer";
  import { GANInput } from "./input-handlers/GAN";
  import { QiYiSmartTimerInput } from "./input-handlers/QY-Timer";
  import { ExternalTimerInput } from "./input-handlers/ExternalTimer";

  // ICONS
  import TuneIcon from "@icons/Tune.svelte";
  import Refresh from "@icons/Refresh.svelte";
  import Pencil from "@icons/PencilOutline.svelte";
  import Calendar from "@icons/CalendarTextOutline.svelte";
  import Copy from "@icons/ContentCopy.svelte";
  import Settings from "@icons/Cog.svelte";
  import BluetoothOnIcon from "@icons/Bluetooth.svelte";
  import BluetoothOffIcon from "@icons/BluetoothOff.svelte";
  import ToolsIcon from "@icons/Tools.svelte";
  import ChartIcon from "@icons/ChartLineVariant.svelte";
  import HandIcon from "@icons/HandFrontRight.svelte";
  import MetronomeIcon from "@icons/Metronome.svelte";
  import WCACategory from "@components/wca/WCACategory.svelte";
  import ToolFrame from "./timer-tools/ToolFrame.svelte";
  import CrossTool from "./timer-tools/CrossTool.svelte";
  import { onMount } from "svelte";
  import BldHelperTool from "./timer-tools/BLDHelperTool.svelte";
  import DailyStatsTool from "./timer-tools/DailyStatsTool.svelte";
  import MetronomeTool from "./timer-tools/MetronomeTool.svelte";
  import StackmatTool from "./timer-tools/StackmatTool.svelte";
  import SolverTool from "./timer-tools/SolverTool.svelte";

  type TModal = "" | "edit-scramble" | "old-scrambles" | "settings";

  export let context: TimerContext;
  export let timerOnly: boolean;
  export let battle: boolean;
  export let enableKeyboard: boolean;
  export let initInputHandler: Function;
  export let bluetoothStatus: Writable<boolean>;
  export let bluetoothHardware: any;
  export let bluetoothBattery: any;
  export let deviceID: Writable<string>;
  export let inputContext: InputContext;
  export let inputMethod: Writable<TimerInputHandler>;
  export let deviceList: string[][];

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

  let timerInput = derived(session, $s => {
    return DIALOG_MODES.indexOf($s.settings.mode || $mode[1] || "") > -1
      ? TIMER_INPUT
      : TIMER_INPUT.filter(inp => inp != "GAN Cube");
  });

  let dataService = DataService.getInstance();
  let notification = NotificationService.getInstance();

  /// MODAL
  let show = false;
  let type: TModal = "";
  let modalData: any = null;
  let closeHandler: Function = () => {};

  // OTHER
  let externalTimers = dataService.externalTimers;
  let isSearching = false;
  let isConnecting = false;
  let showToolsMenu = false;

  const BUTTON_CLASS = "w-7 h-7 p-1 ";
  const DD_CLASS = "font-medium p-2 text-sm dark:hover:bg-gray-600 flex items-center";

  const options = [
    { text: "Reload scramble [Ctrl + S]", icon: Refresh, handler: () => initScrambler() },
    {
      text: "Edit [Ctrl + E]",
      icon: Pencil,
      handler: () => {
        openDialog("edit-scramble", $scramble, (scr: string) => scr && initScrambler(scr));
      },
    },
    {
      text: "Use old scramble [Ctrl + O]",
      icon: Calendar,
      handler: () => {
        openDialog("old-scrambles", null, () => {});
      },
    },
    { text: "Copy scramble [Ctrl + C]", icon: Copy, handler: () => toClipboard() },
    {
      text: "Settings",
      icon: Settings,
      handler: () => {
        let initialCalc = $session?.settings?.calcAoX;

        if (!$session.settings.input) {
          $session.settings.input = "Keyboard";
        }

        openDialog("settings", $session, (data: any) => {
          if (data) {
            $session = $session;

            if (timerOnly) return;

            initInputHandler();

            dataService.updateSession($session);
            initialCalc != $session.settings.calcAoX && updateStatistics(false);
          }
        });
      },
    },
  ];

  const tools: ToolItem[] = [
    {
      id: "cross-xcross",
      text: "Cross & XCross",
      icon: WCACategory,
      iconParams: {
        icon: "333cross",
        buttonClass: " pointer-events-none text-green-300 ",
      },
      component: CrossTool,
      handler: () => {},
    },
    {
      id: "bld-helper",
      text: "BLD Helper",
      icon: WCACategory,
      iconParams: {
        icon: "333ni",
        buttonClass: " pointer-events-none text-orange-300 ",
      },
      component: BldHelperTool,
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
    {
      id: "stackmat",
      text: "Stackmat",
      icon: HandIcon,
      iconParams: {
        class: " m-1 pointer-events-none text-blue-300 ",
      },
      component: StackmatTool,
      handler: () => {},
    },
    {
      id: "solver",
      text: "Solver",
      icon: WCACategory,
      iconParams: {
        icon: "333",
        buttonClass: " pointer-events-none text-green-300 ",
      },
      component: SolverTool,
      handler: () => {},
    },
  ];

  let toolList: ActiveTool[] = [];

  function showBluetoothData() {
    notification.addNotification({
      key: randomUUID(),
      header: "GAN Cube",
      text: "",
      html: $bluetoothStatus
        ? `
        <ul>
          <li>Name: ${bluetoothHardware?.deviceName || "--"}</li>
          <li>Hardware Version: ${bluetoothHardware?.hardwareVersion || "--"}</li>
          <li>Software Version: ${bluetoothHardware?.softwareVersion || "--"}</li>
          <li>Gyroscope: ${bluetoothHardware?.gyro ?? "--"}</li>
          <li>MAC: ${$deviceID != "default" ? $deviceID : "--"}</li>
          <li>Battery: ${bluetoothBattery || "--"}%</li>
        </ul>`
        : `Disconnected`,
      fixed: true,
      actions: [{ text: "Ok", callback: () => {} }],
      icon: CubeDBICON,
    });
  }

  function toClipboard() {
    copyToClipboard($scramble).then(() => {
      notification.addNotification({
        key: randomUUID(),
        header: $localLang.global.done,
        text: $localLang.global.scrambleCopied,
        timeout: 1000,
        icon: CubeDBICON,
      });
    });
  }

  function canOpenDialog(ev: string) {
    if (timerOnly) {
      return ["settings"].indexOf(ev) > -1;
    }

    return true;
  }

  function openDialog(ev: TModal, dt: any, fn: Function) {
    if (!canOpenDialog(ev)) return;

    type = ev;
    modalData = dt;
    closeHandler = fn;
    show = true;
  }

  function keyDown(event: KeyboardEvent) {
    if (!enableKeyboard) return;

    const { code } = event;

    switch ($tab) {
      case 0: {
        if (code != "Space" && !$isRunning && !battle && event.ctrlKey) {
          if (code === "KeyS") {
            initScrambler();
          } else if (code === "KeyE") {
            if (!show || (show && type != "edit-scramble")) {
              openDialog("edit-scramble", $scramble, (scr: string) => scr && initScrambler(scr));
            }
          } else if (code === "KeyO") {
            openDialog("old-scrambles", null, () => {});
          } else if (code === "KeyC") {
            toClipboard();
          } else if (code === "Comma") {
            options[4].handler();
          }
        }
        break;
      }
    }
  }

  function updateTexts() {
    options[0].text = `${$localLang.TIMER.reloadScramble} [Ctrl + S]`;
    options[1].text = `${$localLang.TIMER.edit} [Ctrl + E]`;
    options[2].text = `${$localLang.TIMER.useOldScramble} [Ctrl + O]`;
    options[3].text = `${$localLang.TIMER.copyScramble} [Ctrl + C]`;
    options[4].text = `${$localLang.TIMER.settings} [Ctrl + ,]`;
    // options[4].text = `${ $localLang.TIMER.notes } [Ctrl + N]`;
    // options[5].text = `${ $localLang.TIMER.settings } [Ctrl + ,]`;
  }

  function modalKeyupHandler(e: CustomEvent) {
    let kevent: KeyboardEvent = e.detail;
    kevent.stopPropagation();
    show = kevent.code === "Escape" ? closeHandler() : show;

    if (kevent.code === "Enter" && kevent.ctrlKey) {
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
    let gn =
      modalData.settings.input === "GAN Cube"
        ? new GANInput(inputContext)
        : new QiYiSmartTimerInput(inputContext);

    isSearching = true;
    $bluetoothList.length = 0;

    dataService
      .searchBluetooth(gn)
      .then(mac => {
        deviceID.set(mac);

        if ($inputMethod instanceof GANInput && $inputMethod.connected) {
          $inputMethod.disconnect();
        }

        inputMethod.set(gn);
      })
      .catch(err => {
        // notification.addNotification({
        //   key: randomUUID(),
        //   header: 'Search error',
        //   text: 'Bluetooth error.',
        // });

        console.log("ERROR: ", err);
      })
      .finally(() => {
        isConnecting = false;
        isSearching = false;
      });
  }

  function cancelSearch() {
    dataService.cancelBluetoothRequest();
  }

  function connectBluetooth(id: string) {
    if (id != $deviceID) {
      isSearching = false;
      isConnecting = true;
      dataService.connectBluetoothDevice(id);
    } else {
      $inputMethod.disconnect();
    }
  }

  function selectExternalTimer(id: string) {
    if (id === $deviceID) {
      deviceID.set("");
    } else {
      deviceID.set(id);

      if (!($inputMethod instanceof ExternalTimerInput)) {
        $inputMethod.disconnect();
        inputMethod.set(new ExternalTimerInput(inputContext));
      }

      ($inputMethod as ExternalTimerInput).setExternal(id);
      dataService.external(id, { type: "session", value: $session });
    }
  }

  function addTool(tool: ToolItem) {
    showToolsMenu = false;

    if (toolList.some(t => t.tool.id === tool.id)) {
      toolList.find(t => t.tool.id === tool.id)!.open = true;
    } else {
      toolList = [...toolList, { tool, open: true }];
    }
  }

  onMount(() => {
    addTool(tools[1]);
  });

  $: $localLang, updateTexts();
</script>

<svelte:window on:keydown={keyDown} />

<ul class="timer-options-container border-r border-r-gray-700 pt-2">
  <li>
    <Tooltip position="right" text={$localLang.TIMER.manageSessions}>
      <Button
        aria-label={$localLang.TIMER.manageSessions}
        color="none"
        class={BUTTON_CLASS + " text-yellow-400"}
        on:click={editSessions}
        on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
      >
        <TuneIcon width="100%" height="100%" />
      </Button>
    </Tooltip>
  </li>

  {#each options.filter((_, p) => (!battle ? true : p === 3 || p === 5)) as option, i}
    <li>
      <Tooltip class="cursor-pointer" position="right" text={option.text} hasKeybinding>
        <Button
          aria-label={option.text}
          color="none"
          class={BUTTON_CLASS}
          on:click={option.handler}
          on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
        >
          <svelte:component
            this={option.icon}
            width="100%"
            height="100%"
            class="pointer-events-none"
          />
        </Button>
      </Tooltip>
    </li>
  {/each}

  {#if $session?.settings?.input === "GAN Cube"}
    <li>
      <Tooltip position="right" text="GAN Cube">
        <Button
          aria-label={"GAN Cube"}
          color="none"
          class="{BUTTON_CLASS} {$bluetoothStatus ? 'text-blue-500' : 'text-gray-400'}"
          on:click={showBluetoothData}
          on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
        >
          <svelte:component
            this={$bluetoothStatus ? BluetoothOnIcon : BluetoothOffIcon}
            width="100%"
            height="100%"
          />
        </Button>
      </Tooltip>
    </li>
  {/if}

  <li class="menu">
    <Button
      aria-label={$localLang.HOME.tools}
      color="none"
      class={BUTTON_CLASS + " text-orange-400"}
      on:keydown={e => (e.code === "Space" ? e.preventDefault() : null)}
    >
      <ToolsIcon width="100%" height="100%" />
    </Button>

    <Dropdown
      bind:open={showToolsMenu}
      placement="right"
      class="max-h-[20rem] w-max overflow-y-scroll"
    >
      {#each tools as tool}
        <DropdownItem defaultClass={DD_CLASS} on:click={() => addTool(tool)}>
          <svelte:component this={tool.icon} {...tool.iconParams} size="1.2rem" />
          {tool.text}
        </DropdownItem>
      {/each}
    </Dropdown>
  </li>

  <ul class="tool-container" class:open={toolList.some(t => t.open)}>
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
  </ul>
</ul>

<Modal
  bind:open={show}
  size="xs"
  outsideclose
  title={$localLang.TIMER.modal[type || "settings"]}
  bodyClass="space-y-2"
>
  {#if type === "edit-scramble"}
    <TextArea
      on:keyup={modalKeyupHandler}
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
          color="none"
          aria-label={$localLang.TIMER.scramble}
          tabindex="0"
          class="
          col-span-3 cursor-pointer hover:text-blue-400 my-2 justify-start p-0 rounded-none
          text-ellipsis overflow-hidden whitespace-nowrap
        "
          on:click={() => select(s)}>{s.scramble}</Button
        >
        <span class="col-span-1 flex items-center justify-center">{timer(s.time, true, true)}</span>
      {/each}
    </div>
  {/if}

  {#if type === "settings"}
    {#if !(timerOnly || $session.settings.sessionType === "multi-step")}
      <section class="flex gap-4 items-center">
        {$localLang.TIMER.inputMethod}: <Select
          bind:value={modalData.settings.input}
          items={$timerInput}
          transform={e => e}
        />
      </section>
    {/if}

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
              color="none"
              style={`background-color: ${STEP_COLORS[p]}`}>{st}</Button
            >
          {/each}
        </div>
      </Popover>
    {/if}

    {#if modalData.settings.input === "ExternalTimer"}
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
                on:click={() => selectExternalTimer(id)}
              >
                {id === $deviceID ? $localLang.TIMER.disconnect : $localLang.TIMER.connect}
              </Button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

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

    {#if modalData.settings.input === "Keyboard" || modalData.settings.input === "ExternalTimer"}
      <section class="flex flex-wrap gap-4 items-center">
        <Checkbox
          bind:checked={modalData.settings.hasInspection}
          class="w-5 h-5"
          label={$localLang.TIMER.inspection +
            (modalData.settings.hasInspection ? ` (${modalData.settings.inspection})s` : "")}
        />

        {#if modalData.settings.hasInspection}
          <Range
            class="dark:w-52 mx-auto"
            bind:value={modalData.settings.inspection}
            min={5}
            max={60}
            step="5"
          />
        {/if}
      </section>

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

    {#if modalData.settings.input === "GAN Cube" || modalData.settings.input === "QY-Timer"}
      <section class="bg-white bg-opacity-10 p-2 shadow-md rounded-md">
        <div class="flex justify-center gap-2">
          <Button color="purple" on:click={() => !isSearching && searchBluetooth()}>
            {#if isSearching}
              <Spinner size="4" color="white" />
            {:else}
              {$localLang.global.search}
            {/if}
          </Button>

          {#if isSearching}
            <Button color="alternative" on:click={cancelSearch}>
              {$localLang.global.cancel}
            </Button>
          {/if}
        </div>

        <ul class="mt-4">
          {#each $bluetoothList as { deviceId, deviceName } (deviceId)}
            <li class="flex items-center justify-between pl-4 bg-white bg-opacity-10 rounded-md">
              {deviceName}
              <Button
                color={deviceId === $deviceID ? "red" : "green"}
                loading={isConnecting}
                on:click={() => connectBluetooth(deviceId)}
              >
                {deviceId === $deviceID ? $localLang.TIMER.disconnect : $localLang.TIMER.connect}
              </Button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if modalData.settings.input === "GAN Cube"}
      <section>
        <Checkbox
          bind:checked={modalData.settings.showBackFace}
          on:change={e => ($session = $session)}
          class="w-5 h-5"
          label={"Show back face"}
        />
      </section>
    {/if}

    {#if modalData.settings.input != "Manual" && !timerOnly}
      <section class="mt-2">
        <Checkbox
          bind:checked={modalData.settings.scrambleAfterCancel}
          class="w-5 h-5 my-2"
          label={$localLang.TIMER.refreshScramble}
        />
      </section>
    {/if}

    {#if !timerOnly}
      <section>
        <Checkbox
          bind:checked={modalData.settings.genImage}
          class="w-5 h-5 my-2"
          label={$localLang.TIMER.genImage}
        />
        <!-- <i class="text-sm text-yellow-500">({ $localLang.TIMER.canHurtPerformance })</i> -->
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

  <svelte:fragment slot="footer">
    <div class="flex w-full justify-center gap-2">
      <Button
        ariaLabel={$localLang.global.cancel}
        color="alternative"
        on:click={() => (show = false)}
      >
        {$localLang.global.cancel}
      </Button>
      {#if type === "edit-scramble" || type === "settings"}
        <Button
          color="purple"
          ariaLabel={$localLang.global.save}
          on:click={() => {
            closeHandler(type === "settings" ? true : modalData.trim());
            show = false;
          }}
        >
          {$localLang.global.save}
        </Button>
      {/if}
    </div>
  </svelte:fragment>
</Modal>

<style lang="postcss">
  .timer-options-container {
    grid-area: options;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.25rem;
    position: relative;
  }

  .timer-options-container li.menu {
    position: relative;
  }

  .timer-options-container li.menu::after {
    --dims: 0.4rem;
    content: "";
    position: absolute;
    width: var(--dims);
    height: var(--dims);
    right: 0;
    top: 50%;
    background-color: white;
    clip-path: polygon(0% 0%, 100% 50%, 0% 100%);
    translate: 100% -50%;
  }

  .tool-container {
    @apply absolute top-0 grid gap-2 w-min z-10 shadow-lg;
    left: calc(100% + 0.5rem);
    max-width: min(calc(100vw - 3rem), 30rem);
  }

  .tool-container.open {
    grid-template-columns: repeat(auto-fit, minmax(2.5rem, 1fr));
  }
</style>