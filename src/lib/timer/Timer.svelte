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
  import type { Solve, InputContext } from "@interfaces";
  import { Penalty, TimerState } from "@interfaces";

  import TimerTab from "$lib/timer/TimerTab/TimerTab.svelte";
  import HistoryTab from "$lib/timer/HistoryTab/HistoryTab.svelte";
  import StatsTab from "$lib/timer/StatsTab/StatsTab.svelte";
  import SegmentedTabs from "$lib/cubicdbKit/SegmentedTabs.svelte";
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
  import { setTimerRuntimeContext } from "./context/timerRuntimeContext";
  import { TIMER_DEVICE_IDS } from "./devices/TimerDeviceDescriptor";
  import { resolveTimerDeviceSelection } from "./devices/TimerDeviceSelection";
  import {
    SCRAMBLE_REQUEST_SOURCES,
    type ScrambleRequestSource,
  } from "$lib/events/timer/ScrambleEventTypes";
  import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
  import { createScrambleRequestInput } from "./scramble/createScrambleRequestInput";
  import { resolveScrambleModeSelection } from "./scramble/resolveScrambleModeSelection";
  import { adjustMillis } from "@helpers/timer";
  import { randomUUID } from "@helpers/strings";
  import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
  import TimerKeyboardEventBoundary from "./handlers/TimerKeyboardEventBoundary.svelte";
  import {
    shouldCancelTimerInputOnTabChange,
    shouldProcessTimerKeyboardInput,
  } from "./TimerInputScope";

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
  let MENU: SCRAMBLE_MENU[] = getLanguage(get(globalLang)).MENU;
  let localLang = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MENU = l.MENU;
    return l;
  });

  // Core initialization
  const timerController = new TimerController();
  const sessionStore = timerController.session;
  const groupStore = timerController.group;
  const modeStore = timerController.mode;
  const probabilityStore = timerController.prob;
  const tabStore = timerController.tab;
  const timerApplication = getTimerApplicationContext();

  function createSolveDraft(
    elapsedMs?: number,
    penalty: Penalty = Penalty.NONE,
    steps: number[] = []
  ): Partial<Solve> {
    const selectedMode = resolveScrambleModeSelection({
      selectedMode: get(modeStore),
      selectedGroup: get(groupStore),
      menu: MENU,
    });
    const fallbackMode = get(modeStore);

    return {
      group: get(groupStore),
      mode: selectedMode?.[1] ?? fallbackMode?.[1],
      len: selectedMode?.[2] ?? fallbackMode?.[2],
      prob: get(probabilityStore),
      session: get(sessionStore)._id,
      penalty,
      time: adjustMillis(elapsedMs ?? get(timerController.time), false),
      scramble: get(timerController.scramble),
      steps,
      _id: randomUUID(),
    };
  }

  function shouldPersistSolves() {
    return !(battle || timerOnly || scrambleOnly);
  }

  const eventTimerRuntime = createTimerRuntime({
    application: timerApplication,
    ownerId: `timer:${page.params.sessionId ?? "primary"}`,
    flags: { keyboard: true, scramble: true },
    getScrambleRequest: source => {
      const selectedMode = resolveScrambleModeSelection({
        selectedMode: get(modeStore),
        selectedGroup: get(timerController.group),
        menu: MENU,
      });
      if (!selectedMode) return null;
      return createScrambleRequestInput({
        selectedMode,
        selectedProbability: get(probabilityStore),
        modeOverride: useMode || undefined,
        lengthOverride: useLen || undefined,
        probabilityOverride: useProb !== -1 ? useProb : undefined,
        providedScramble: useScramble || undefined,
        source,
      });
    },
    getSolveRequest: (elapsedMs, penalty, steps) => {
      if (!shouldPersistSolves()) {
        timerController.addSolve(elapsedMs, penalty);
        return null;
      }
      return createSolveDraft(elapsedMs, penalty, steps);
    },
  });
  setTimerRuntimeContext(eventTimerRuntime);
  let requestedDeviceId: string | null = null;
  let managedKeyboardActive = $derived(
    eventTimerRuntime.state.activeDeviceId === TIMER_DEVICE_IDS.KEYBOARD
  );
  let timerKeyboardInputActive = $derived(shouldProcessTimerKeyboardInput($tabStore));
  let historyTabComponent: any = $state(null);
  let previousInputTab = get(tabStore);

  // Utilities (Interface Adapters)
  const sessionMgr = useSessionManager(timerController, sessionController, dataService, MENU);
  const filterMgr = useFilterManager(timerController, sessionController, MENU, pScramble);
  const solveMgr = useSolveManager(timerController);

  const solveProjectionSubscriptions = [
    eventTimerRuntime.bus.subscribe(
      TIMER_EVENTS.SOLVE_ADDED,
      `${eventTimerRuntime.ownerId}:timer:solve-added-projection`,
      event => {
        if (event.payload.ownerId !== eventTimerRuntime.ownerId) return;
        solveMgr.handleAddSolve(event.payload.solve);
      }
    ),
    eventTimerRuntime.bus.subscribe(
      TIMER_EVENTS.SOLVE_UPDATED,
      `${eventTimerRuntime.ownerId}:timer:solve-updated-projection`,
      event => {
        if (event.payload.ownerId !== eventTimerRuntime.ownerId) return;
        solveMgr.handleUpdateSolve(event.payload.solve);
      }
    ),
    eventTimerRuntime.bus.subscribe(
      TIMER_EVENTS.SOLVES_REMOVED,
      `${eventTimerRuntime.ownerId}:timer:solves-removed-projection`,
      event => {
        if (event.payload.ownerId !== eventTimerRuntime.ownerId) return;
        solveMgr.handleRemoveSolves(event.payload.solves);
      }
    ),
  ];

  const initMgr = useInitialization(
    timerController,
    sessionController,
    solveController,
    dataService,
    MENU,
    page,
    {
      loadSolves: () =>
        eventTimerRuntime.requestSolvesList({
          sessionId: page.params.sessionId,
        }),
    }
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
    const normalizedInput = resolveTimerDeviceSelection(input, timerApplication.catalog.devices);
    const wantsManagedKeyboard = normalizedInput === TIMER_DEVICE_IDS.KEYBOARD;
    if (wantsManagedKeyboard && requestedDeviceId !== TIMER_DEVICE_IDS.KEYBOARD) {
      requestedDeviceId = TIMER_DEVICE_IDS.KEYBOARD;
      void eventTimerRuntime.requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD);
    } else if (!wantsManagedKeyboard && requestedDeviceId === TIMER_DEVICE_IDS.KEYBOARD) {
      requestedDeviceId = null;
      void eventTimerRuntime.releaseActiveDevice(TIMER_DEVICE_IDS.KEYBOARD);
    }
  });

  function keyboardKeyDownHandler(event: KeyboardEvent) {
    keyboardMgr.handleKeydown(event);
    if (!timerKeyboardInputActive) return;
    if (managedKeyboardActive) return;
  }

  function keyboardKeyUpHandler(event: KeyboardEvent) {
    if (!timerKeyboardInputActive) return;
    if (managedKeyboardActive) return;
  }

  onDestroy(() => {
    for (const subscription of solveProjectionSubscriptions) subscription.unsubscribe();
    void eventTimerRuntime.destroy();
  });

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
    requestUpdateSolve: (solve: Solve, nativeEvent?: NativeTimestampSource) => {
      if (!shouldPersistSolves()) {
        solveMgr.handleUpdateSolve(solve);
        return;
      }
      void eventTimerRuntime.requestSolveUpdate(solve, nativeEvent);
    },
    requestRemoveSolves: (solves: Solve[], nativeEvent?: NativeTimestampSource) => {
      if (!shouldPersistSolves()) {
        solveMgr.handleRemoveSolves(solves);
        return;
      }
      void eventTimerRuntime.requestSolvesRemove(solves, nativeEvent);
    },
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
        const selectedMode = resolveScrambleModeSelection({
          selectedMode: get(modeStore),
          selectedGroup: get(timerController.group),
          menu: MENU,
        });
        if (!selectedMode) return;
        const input = createScrambleRequestInput({
          selectedMode,
          selectedProbability: get(probabilityStore),
          modeOverride: useMode || _mode || undefined,
          lengthOverride: useLen || undefined,
          probabilityOverride:
            useProb !== -1 ? useProb : _prob !== undefined && _prob !== -1 ? _prob : undefined,
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
    const selectedMode = resolveScrambleModeSelection({
      selectedMode: $modeStore,
      selectedGroup: $groupStore,
      menu: MENU,
    });
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
    untrack(() =>
      timerContext.initScrambler(
        useScramble || undefined,
        useMode || undefined,
        useProb !== -1 ? useProb : undefined,
        undefined,
        SCRAMBLE_REQUEST_SOURCES.SESSION_SCRAMBLE_SETTINGS_CHANGED
      )
    );
  });

  $effect(() => {
    if (!eventTimerRuntime.flags.scramble) return;
    timerController.scramble.set(eventTimerRuntime.state.scramble);
  });

  $effect(() => {
    if (!eventTimerRuntime.flags.scramble) return;
    timerController.preview.set(
      eventTimerRuntime.state.scramblePreview.map(src => ({ src, alt: "", title: "" }))
    );
  });

  // Setup keyboard handling
  timerController.enableKeyboard = keyboardEnabled;

  // Event handlers for input
  function addSolve(t?: number, p?: Penalty) {
    if (!shouldPersistSolves()) {
      timerController.addSolve(t, p);
      return;
    }
    void eventTimerRuntime.requestSolveAdd(createSolveDraft(t, p ?? Penalty.NONE));
  }

  function reset() {
    timerController.reset();
  }

  function createNewSolve() {
    solveController.createSolve();
  }

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

  $effect(() => {
    const nextTab = $tabStore;
    const timerState = eventTimerRuntime.state.timerState;
    if (shouldCancelTimerInputOnTabChange(previousInputTab, nextTab, timerState)) {
      eventTimerRuntime.cancelActiveInput(performance.now());
    }
    previousInputTab = nextTab;
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
<TimerKeyboardEventBoundary enabled={timerKeyboardInputActive} />

<div class="timer-layout cdb-app-background grid gap-2 w-full h-full overflow-hidden">
  <div class="actions flex items-center justify-between gap-2">
    <SegmentedTabs
      class="mr-auto"
      selected={String($tabStore)}
      items={[
        { id: "0", label: $localLang.TIMER.timerTab, icon: TimerIcon },
        { id: "1", label: $localLang.TIMER.historyTab, icon: LogsIcon },
        { id: "2", label: $localLang.TIMER.statsTab, icon: ChartLineIcon },
      ]}
      onSelect={item => timerController.tab.set(Number(item.id))}
    />

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
    grid-template-rows: 2.5rem minmax(0, 1fr);
    padding: 0.4375rem;
  }

  .content {
    display: grid;
    grid-template-areas: "tabs";
  }
</style>
