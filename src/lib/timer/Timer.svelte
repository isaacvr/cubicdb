<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { derived, get, writable, type Writable } from "svelte/store";
  import { setTimerContext } from "./context/timerContext";
  import { useSessionManager } from "./utilities/useSessionManager";
  import { useFilterManager } from "./utilities/useFilterManager";
  import { useSolveManager } from "./utilities/useSolveManager";
  import { useInitialization } from "./utilities/useInitialization";
  import { useKeyboardHandler } from "./utilities/useKeyboardHandler";

  import { getLanguage } from "@lang/index";
  import { globalLang } from "@stores/language.service";
  import type { SCRAMBLE_MENU } from "@constants";
  import type { Solve, InputContext, Penalty } from "@interfaces";
  import { TimerState } from "@interfaces";

  import TimerTab from "$lib/timer/TimerTab/TimerTab.svelte";
  import HistoryTab from "$lib/timer/HistoryTab/HistoryTab.svelte";
  import StatsTab from "$lib/timer/StatsTab/StatsTab.svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import TimerOptions from "./TimerTab/TimerOptions.svelte";
  import { ChartLineIcon, LogsIcon, TimerIcon } from "lucide-svelte";

  import { dataService } from "$lib/data-services/data.service";
  import { solveController } from "$lib/controllers/SolveController";
  import { sessionController } from "$lib/controllers/SessionController";
  import { TimerController } from "$lib/controllers/TimerController";
  import { pScramble } from "@cstimer/scramble";
  import { page } from "$app/state";
  import { createTimerRuntime } from "./TimerCompositionRoot.svelte";
  import { getTimerApplicationContext } from "./context/timerApplicationContext";
  import {
    LEGACY_TIMER_DEVICE_SELECTIONS,
    TIMER_DEVICE_IDS,
  } from "./devices/TimerDeviceDescriptor";
  import {
    SCRAMBLE_REQUEST_SOURCES,
    type ScrambleRequestSource,
  } from "$lib/events/timer/ScrambleEventTypes";
  import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
  import { createScrambleRequestInput } from "./scramble/createScrambleRequestInput";

  interface TimerProps {
    battle?: boolean;
    useScramble?: string;
    useMode?: string;
    useLen?: number;
    useProb?: number;
    genScramble?: boolean;
    enableKeyboard?: Writable<boolean>;
    timerOnly?: boolean;
    scrambleOnly?: boolean;
    cleanOnScramble?: boolean;
  }

  let {
    battle = false,
    useScramble = "",
    useMode = "",
    useLen = 0,
    useProb = -1,
    genScramble = true,
    enableKeyboard: keyboardEnabled = writable(true),
    timerOnly = false,
    scrambleOnly = false,
    cleanOnScramble: _cleanOnScramble = false,
  }: TimerProps = $props();

  // MENU from language
  let MENU: SCRAMBLE_MENU[] = [];
  let localLang = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MENU = l.MENU;
    return l;
  });

  // Core initialization
  const timerController = new TimerController();
  const sessionStore = timerController.session;
  const modeStore = timerController.mode;
  const probabilityStore = timerController.prob;
  const timerApplication = getTimerApplicationContext();
  const eventTimerRuntime = createTimerRuntime({
    application: timerApplication,
    ownerId: `timer:${page.params.sessionId ?? "primary"}`,
    flags: { keyboard: true, scramble: true },
    onRunStopped: (elapsedMs, penalty) => timerController.addSolve(elapsedMs, penalty),
  });
  let requestedDeviceId: string | null = null;
  let managedKeyboardActive = $derived(
    eventTimerRuntime.state.activeDeviceId === TIMER_DEVICE_IDS.KEYBOARD
  );
  const iconSize = "1.2rem";
  let historyTabComponent: any = $state(null);

  // Utilities (Interface Adapters)
  const sessionMgr = useSessionManager(timerController, sessionController, dataService, MENU);
  const filterMgr = useFilterManager(timerController, sessionController, MENU, pScramble);
  const solveMgr = useSolveManager(timerController);

  const initMgr = useInitialization(
    timerController,
    sessionController,
    solveController,
    dataService,
    MENU,
    page
  );

  // Create keyboard handler inside effect to capture reactive values
  let keyboardMgr = $state({ handleKeydown: (_: KeyboardEvent) => {} });

  $effect(() => {
    const handler = useKeyboardHandler(timerController, keyboardEnabled);
    keyboardMgr = handler;
  });

  $effect(() => {
    const currentSession = $sessionStore;
    eventTimerRuntime.state.session = currentSession;
    timerController.timerState.set(eventTimerRuntime.state.timerState);
    timerController.time.set(eventTimerRuntime.state.time);
    timerController.ready.set(eventTimerRuntime.state.ready);
    timerController.decimals.set(eventTimerRuntime.state.decimals);

    const input = currentSession?.settings.input;
    const wantsManagedKeyboard = input === LEGACY_TIMER_DEVICE_SELECTIONS.KEYBOARD
      || input === TIMER_DEVICE_IDS.KEYBOARD;
    if (wantsManagedKeyboard && requestedDeviceId !== TIMER_DEVICE_IDS.KEYBOARD) {
      requestedDeviceId = TIMER_DEVICE_IDS.KEYBOARD;
      void eventTimerRuntime.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD);
    } else if (!wantsManagedKeyboard && requestedDeviceId === TIMER_DEVICE_IDS.KEYBOARD) {
      requestedDeviceId = null;
      void eventTimerRuntime.releaseActiveDevice(TIMER_DEVICE_IDS.KEYBOARD);
    }
  });

  function keyboardKeyDownHandler(event: KeyboardEvent) {
    if (managedKeyboardActive) return;
    keyboardMgr.handleKeydown(event);
  }

  function keyboardKeyUpHandler(event: KeyboardEvent) {
    if (managedKeyboardActive) return;
  }

  onDestroy(() => void eventTimerRuntime.destroy());

  // Modal state
  // let newSessionName = $state("");
  // let newSessionType: SessionType = $state("mixed");
  // let newSessionSteps = $state(2);
  // let newSessionGroup = $state(0);
  // let newSessionMode = $state(0);
  // let stepNames: string[] = $state(["", ""]);

  // Create context and set it for children
  let selected = writable(0);

  const timerContext = setTimerContext({
    timerController,
    selected,
    enableKeyboard: keyboardEnabled,
    selectedSession: sessionMgr.selectedSession,
    newSession: sessionMgr.newSession,
    handleUpdateSession: sessionMgr.handleUpdateSession,
    selectedGroup: filterMgr.selectedGroup,
    selectedMode: filterMgr.selectedMode,
    selectedFilter: filterMgr.selectedFilter,
    selectSolve: (s: Solve) => {
      const result = solveMgr.selectSolve(s);
      selected.set(result);
      return result;
    },
    selectSolveById: (id: string, n: number) => {
      const result = solveMgr.selectSolveById(id, n);
      selected.set(result);
      return result;
    },
    updateStatistics: solveMgr.updateStatistics,
    setSolves: solveMgr.setSolves,
    handleUpdateSolve: solveMgr.handleUpdateSolve,
    handleRemoveSolves: solveMgr.handleRemoveSolves,
    editSessions: () => {},
    editSolve: (s: Solve) => {
      timerController.tab.set(1);
      historyTabComponent?.editSolve(s);
    },
    initScrambler: (
      scr?: string,
      _mode?: string,
      _prob?: number | number[],
      nativeEvent?: NativeTimestampSource,
      source: ScrambleRequestSource = SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED
    ) => {
      if (eventTimerRuntime.flags.scramble) {
        const selectedMode = get(modeStore);
        if (!selectedMode) return;
        const input = createScrambleRequestInput({
          selectedMode,
          selectedProbability: get(probabilityStore),
          modeOverride: useMode || _mode || undefined,
          lengthOverride: useLen || undefined,
          probabilityOverride: useProb !== -1
            ? useProb
            : _prob !== undefined && _prob !== -1
              ? _prob
              : undefined,
          providedScramble: useScramble || scr || undefined,
          source,
        });
        void eventTimerRuntime.requestScramble(input, nativeEvent);
        return;
      }
      timerController.initScrambler(
        MENU,
        { useLen, useMode, useScramble, useProb, genScramble },
        scr,
        _mode,
        _prob
      );
    },
  });

  let lastScrambleConfiguration = "";

  $effect(() => {
    const currentSession = $sessionStore;
    const selectedMode = $modeStore;
    const selectedProbability = $probabilityStore;
    if (!eventTimerRuntime.flags.scramble || !currentSession || !selectedMode) return;

    const configuration = JSON.stringify([
      currentSession._id,
      selectedMode[1],
      selectedMode[2],
      selectedProbability,
      useMode,
      useLen,
      useProb,
      useScramble,
    ]);
    if (configuration === lastScrambleConfiguration) return;
    lastScrambleConfiguration = configuration;
    untrack(() => timerContext.initScrambler(
      useScramble || undefined,
      useMode || undefined,
      useProb !== -1 ? useProb : undefined,
      undefined,
      SCRAMBLE_REQUEST_SOURCES.SESSION_SCRAMBLE_SETTINGS_CHANGED
    ));
  });

  $effect(() => {
    if (!eventTimerRuntime.flags.scramble) return;
    timerController.scramble.set(eventTimerRuntime.state.scramble);
  });

  // Setup keyboard handling
  timerController.enableKeyboard = keyboardEnabled;

  // Event handlers for input
  function addSolve(t?: number, p?: Penalty) {
    timerController.addSolve(t, p);
  }

  function reset() {
    timerController.reset();
  }

  function createNewSolve() {
    solveController.createSolve();
  }

  // async function newSession() {
  //   let ns = await sessionMgr.newSession(
  //     newSessionName,
  //     newSessionType,
  //     newSessionGroup,
  //     newSessionMode,
  //     newSessionSteps,
  //     stepNames
  //   );

  //   if (ns) {
  //     ns.tName = ns.name;
  //     timerController.session.set(ns);
  //     initMgr.updateSessionsIcons();
  //     initMgr.initInputHandler(ns.settings.input || "");

  //     if (!ns.settings.sessionType) {
  //       ns.settings.sessionType = ns.settings.sessionType || "mixed";
  //       await sessionController
  //         .applySettings(ns, { sessionType: ns.settings.sessionType } as any)
  //         .catch(() => {});
  //     }

  //     await sessionMgr.selectedSession();
  //     newSessionName = "";
  //     creatingSession = false;
  //   }
  // }

  // function closeAddSession() {
  //   creatingSession = false;
  // }

  onMount(() => {
    if (timerOnly && scrambleOnly) {
      timerOnly = scrambleOnly = false;
    }

    if (!(battle || timerOnly || scrambleOnly)) {
      initMgr.setupOnMount();
    }
  });

  // Keyboard enablement
  $effect(() => {
    $keyboardEnabled = !scrambleOnly;
  });

  // Session ID change
  $effect(() => {
    if (page.params.sessionId) {
      untrack(() => {
        const sessions = get(sessionController.sessions);
        if (sessions.length === 0) return;
        initMgr.updateCurrentSession();
      });
    }
  });

  // Timer state tracking
  $effect(() => {
    const timerState = get(timerController.timerState);
    timerController.isRunning.set(
      timerState === TimerState.INSPECTION || timerState === TimerState.RUNNING
    );
  });

  // Input context for TimerTab
  let inputContext: InputContext = $state({
    timerController,
    keyboardEnabled,
    addSolve,
    initScrambler: timerContext.initScrambler,
    reset,
    createNewSolve,
    handleRemoveSolves: timerContext.handleRemoveSolves,
    handleUpdateSolve: timerContext.handleUpdateSolve,
    editSolve: timerContext.editSolve,
  });
</script>

<svelte:window onkeydown={keyboardKeyDownHandler} onkeyup={keyboardKeyUpHandler} />

<div class="timer-layout grid gap-2 w-full h-full p-1 overflow-hidden">
  <div class="actions flex items-center justify-between gap-2">
    <div role="tablist" class="join gap-1 bg-base-100 p-1 mr-auto">
      <Button
        onclick={() => timerController.tab.set(0)}
        size="sm"
        role="tab"
        class={"tab px-4 text-sm py-1.5 " +
          (get(timerController.tab) === 0 ? "bg-primary" : "shadow-transparent border-transparent")}
      >
        <TimerIcon size={iconSize} />
        {$localLang.TIMER.timerTab}
      </Button>

      <Button
        onclick={() => timerController.tab.set(1)}
        size="sm"
        role="tab"
        class={"tab px-4 text-sm py-1.5 " +
          (get(timerController.tab) === 1 ? "bg-primary" : "shadow-transparent border-transparent")}
      >
        <LogsIcon size={iconSize} />
        {$localLang.TIMER.historyTab}
      </Button>

      <Button
        onclick={() => timerController.tab.set(2)}
        size="sm"
        role="tab"
        class={"tab px-4 text-sm py-1.5 " +
          (get(timerController.tab) === 2 ? "bg-primary" : "shadow-transparent border-transparent")}
      >
        <ChartLineIcon size={iconSize} />
        {$localLang.TIMER.statsTab}
      </Button>
    </div>

    <TimerOptions
      context={timerContext}
      {timerOnly}
      initInputHandler={initMgr.initInputHandler}
      options={{
        seed: true,
        tools: true,
        hints: true,
        sessionSettings: true,
      }}
    />
  </div>

  <div class="content overflow-hidden relative">
    <TimerTab {inputContext} {timerController} context={timerContext} {managedKeyboardActive} />
    <HistoryTab {timerController} context={timerContext} bind:this={historyTabComponent} />
    <StatsTab {timerController} context={timerContext} />
  </div>
</div>

<style>
  .timer-layout {
    grid-template-rows: 2rem minmax(0, 1fr);
  }

  .content {
    display: grid;
    grid-template-areas: "tabs";
  }
</style>
