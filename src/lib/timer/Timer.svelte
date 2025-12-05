<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { derived, get, writable, type Readable, type Writable } from "svelte/store";

  /// Modules
  import { getScramble, pScramble } from "@cstimer/scramble";
  import JSConfetti from "js-confetti";

  /// Data
  import { isNNN, SessionDefaultSettings, type SCRAMBLE_MENU, AON, ICONS } from "@constants";

  /// Components
  import TimerTab from "$lib/timer/TimerTab/TimerTab.svelte";
  import HistoryTab from "$lib/timer/HistoryTab/HistoryTab.svelte";
  import StatsTab from "$lib/timer/StatsTab/StatsTab.svelte";

  /// Types
  import {
    TimerState,
    type Solve,
    type Session,
    type Statistics,
    type TimerContext,
    type BluetoothDeviceData,
    type SessionType,
    type PuzzleType,
    type InputContext,
    Penalty,
  } from "@interfaces";
  import { ScrambleParser } from "@classes/scramble-parser";
  import { INITIAL_STATISTICS, getUpdatedStatistics, statsReplaceId } from "@helpers/statistics";
  import { adjustMillis, infinitePenalty, timer } from "@helpers/timer";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { NotificationService } from "@stores/notification.service";
  import { prettyScramble, randomUUID } from "@helpers/strings";
  import { binSearch } from "@helpers/object";

  // ICONS
  import { dataService } from "$lib/data-services/data.service";
  import { SolveController, solveController } from "$lib/controllers/SolveController";
  import { sessionController } from "$lib/controllers/SessionController";
  import { scrambleToPuzzle } from "@helpers/scrambleToPuzzle";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { ChartLineIcon, LogsIcon, TimerIcon } from "lucide-svelte";
  import { page } from "$app/state";
  const sessions = sessionController.sessions;
  import { SelectSession } from "$lib/core/usecases/SelectSession";
  import TimerOptions from "./TimerTab/TimerOptions.svelte";
  import { between } from "@helpers/math";
  import type { Language } from "$lib/interfaces/language.types";
  import { rndEl } from "@cstimer/lib/mathlib";
  import { devices } from "@stores/devices.store";
  import { TimerController } from "$lib/controllers/TimerController";

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
  }: TimerProps = $props();

  let MENU: SCRAMBLE_MENU[] = [];

  let localLang: Readable<Language> = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MENU = l.MENU;
    selectedGroup(false);
    return l;
  });

  /// GENERAL
  const timerController = new TimerController();
  const { tab, filters } = timerController;
  timerController.enableKeyboard = keyboardEnabled;
  // let tab = timerController.tab;
  let modes: { 0: string; 1: string; 2: number }[] = $state([]);
  // let filters: Writable<string[]> = writable<string[]>([]);
  let sessionsTab: HistoryTab | null = $state(null);
  const iconSize = "1.2rem";

  /// MODAL
  let openEdit = $state(false);
  let creatingSession = $state(false);
  let newSessionName = $state("");
  let newSessionType: SessionType = $state("mixed");
  let newSessionSteps = $state(2);
  let newSessionGroup = $state(0);
  let newSessionMode = $state(0);
  let stepNames: string[] = $state(["", ""]);

  let selected = writable(0);

  function addSolve(t?: number, p?: Penalty) {
    timerController.addSolve(t, p);
  }

  function reset() {
    timerController.reset();
  }

  function createNewSolve() {
    solveController.createSolve();
  }

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += s.selected ? 1 : -1;
  }

  function selectSolveById(id: string, n: number) {
    $selected = timerController.selectedSolveById(id, n);
  }

  function setSolves(rescramble: boolean = true) {
    timerController.sortSolves();
    timerController.updateStatistics(true);
    rescramble && setTimeout(initScrambler, 10);
  }

  function editSessions() {
    openEdit = true;
  }

  function closeAddSession() {
    creatingSession = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!keyboardEnabled) return;

    const timerState = get(timerController.timerState);

    if (!battle && (timerState === TimerState.CLEAN || timerState === TimerState.STOPPED)) {
      if (e.key === "ArrowRight") {
        timerController.nextTab();
      } else if (e.key === "ArrowLeft") {
        timerController.prevTab();
      }
    }
  }

  // For testing only!!
  function testPrediction() {
    // let modes = [ "222so", "skbso", "pyrso", "333", "444wca", "555wca", "666wca", "777wca" ];
    // let lens = [ 0, 0, 10, 0, 40, 60, 80, 100 ];
    // for (let i = 0, maxi = modes.length; i < maxi; i += 1) {
    //   let md = modes[i];
    //   let len = lens[i];
    //   for (let j = 0; j < 50; j += 1) {
    //     let scr = (pScramble.scramblers.get(md) || (() => '')).apply(null, [
    //       md, Math.abs(len)
    //     ]).replace(/\\n/g, '<br>').trim();
    //     let pred = identifyPuzzle(scr);
    //     if ( md != pred.mode ) {
    //       console.log(`F => CORRECT = "${md}"\nPRED = "${pred.mode}"\nSCR = "${scr}"\nLEN = ${scr.split(/\s+/).length}`);
    //       throw new Error('F');
    //     }
    //   }
    // }
  }

  export function initScrambler(scr?: string, _mode?: string, _prob?: number | number[]) {
    timerController.initScrambler(
      MENU,
      { useLen, useMode, useScramble, useProb, genScramble },
      scr,
      _mode,
      _prob
    );
  }

  async function selectedFilter(rescramble = true, saveFilter = false) {
    let sessionStore = timerController.session;
    let session = get(sessionStore);
    let mode = get(timerController.mode);
    let prob = get(timerController.prob);

    if (
      saveFilter &&
      (session.settings.sessionType === "mixed" || mode[1] === "r3" || mode[1] === "r3ni")
    ) {
      const updated = await sessionController
        .applySettings(session, { prob } as any)
        .catch(() => null);
      if (updated) sessionStore.set(updated);
    }

    rescramble && initScrambler();
  }

  async function selectedMode(rescramble = true, saveMode = false, updateProb = true) {
    let sessionStore = timerController.session;
    let session = get(sessionStore);
    let mode = get(timerController.mode);

    if (saveMode && session.settings.sessionType === "mixed") {
      const updated = await sessionController
        .applySettings(session, { mode: mode[1] } as any)
        .catch(() => null);
      if (updated) sessionStore.set(updated);
    }
    $filters = pScramble.filters.get(mode[1]) || [];
    updateProb && timerController.prob.set(-1);
    selectedFilter(rescramble);
  }

  function selectedGroup(rescramble = true, saveGroup = false) {
    let group = get(timerController.group);
    let mode = get(timerController.mode);

    if (typeof group === "undefined") return;

    modes = MENU[group][1];
    timerController.mode.set(modes[0]);
    mode = modes[0];

    if (mode[1] === "r3ni" || mode[1] === "r3") {
      timerController.prob.set(mode[1] === "r3ni" ? 2 : 5);
    }

    selectedMode(rescramble, saveGroup);
  }

  function selectedSession() {
    const { mode, group, prob, stats, session } = timerController;
    const config = $dataService.config;
    let _session = get(session);
    let _group = get(group);

    config.timer.session = _session._id;
    config.saveConfig();

    let targetMode = _session.settings.mode || "333";
    let fnd = false;

    for (let i = 0, maxi = MENU.length; i < maxi; i += 1) {
      let md = MENU[i][1].find(m => m[1] === targetMode);

      if (md) {
        mode.set(md);
        group.set(i);
        modes = MENU[_group][1];

        if (typeof _session.settings.prob === "undefined") {
          selectedMode(false, false);
        } else {
          prob.set(_session.settings.prob);
          selectedMode(false, false, false);
        }

        fnd = true;
        break;
      }
    }

    if (!fnd) {
      mode.set(MENU[0][1][0]);
    }

    // console.log("MODE: ", $mode);

    stats.set(INITIAL_STATISTICS);
    setSolves();
  }

  function newSession() {
    const { session } = timerController;
    let name = newSessionName.trim();

    if (!name) return;

    let settings = Object.assign({}, SessionDefaultSettings);

    settings.sessionType = newSessionType;

    if (newSessionType === "single" || newSessionType === "multi-step") {
      settings.mode = MENU[newSessionGroup][1][newSessionMode][1];
    }

    if (newSessionType === "multi-step") {
      settings.steps = newSessionSteps;
      settings.stepNames = stepNames;
    }

    sessionController
      .addSession({ _id: "", name, settings } as any)
      .then(async ns => {
        ns.tName = ns.name;
        session.set(ns);

        updateSessionsIcons();
        initInputHandler(ns.settings.input || "");

        if (!ns.settings.sessionType) {
          ns.settings.sessionType = ns.settings.sessionType || "mixed";

          await sessionController
            .applySettings(ns, { sessionType: ns.settings.sessionType } as any)
            .catch(() => {});
        }

        selectedSession();
      })
      .catch(() => {});

    closeAddSession();
  }

  // function deleteSessionHandler(remove?: boolean) {
  //   if (remove && sSession) {
  //     $dataService.session.removeSession(sSession).then(ss => {
  //       if ($sessions.length === 0) {
  //         newSessionName = "Session 1";
  //         newSession();
  //         return;
  //       }

  //       if (ss._id === $session._id) {
  //         $session = $sessions[0];
  //         selectedSession();
  //       }

  //       updateSessionsIcons();
  //     });
  //   }

  //   showDeleteSession = false;
  // }

  function handleUpdateSession(session: Session) {
    let updatedSession = $sessions.find(s => s._id === session._id);
    if (updatedSession) {
      updatedSession.name = session.name;
      updatedSession.settings = session.settings;
    }
  }

  // function renameSession(s: Session) {
  //   s.editing = false;

  //   if (s.tName?.trim() === "") {
  //     return;
  //   }

  //   $dataService.session
  //     .updateSession({ _id: s._id, name: s.tName?.trim() || "Session -", settings: s.settings })
  //     .then(handleUpdateSession);
  // }

  function editSolve(s: Solve) {
    timerController.tab.set(1);
    sessionsTab?.editSolve(s);
  }

  function handleUpdateSolve(updatedSolve: Solve) {
    let allSolves = get(timerController.allSolves);
    for (let i = 0, maxi = allSolves.length; i < maxi; i += 1) {
      if (allSolves[i]._id === updatedSolve._id) {
        allSolves[i].comments = updatedSolve.comments;
        allSolves[i].penalty = updatedSolve.penalty;
        allSolves[i].time = updatedSolve.time;
        break;
      }
    }
    timerController.stats.set(INITIAL_STATISTICS);
    setSolves(false);
  }

  function handleRemoveSolves(ids: Solve[]) {
    const { solves, allSolves, stats } = timerController;
    let solvesV = get(solves);
    let allSolvesV = get(allSolves);
    let sl = solvesV.length;

    for (let i = 0, maxi = ids.length; i < maxi; i += 1) {
      let pos1 = binSearch<Solve>(ids[i], solvesV, (a: Solve, b: Solve) => b.date - a.date);
      let pos2 = binSearch<Solve>(ids[i], allSolvesV, (a: Solve, b: Solve) => b.date - a.date);

      pos1 > -1 && solvesV.splice(pos1, 1);
      pos2 > -1 && allSolvesV.splice(pos2, 1);
    }

    // solves.set(solvesV);
    // allSolves.set(allSolvesV);

    if (solvesV.length != sl) {
      stats.set(INITIAL_STATISTICS);
      setSolves();
    }
  }

  function updateSessionsIcons() {
    for (let i = 0, maxi = $sessions.length; i < maxi; i += 1) {
      if ($sessions[i].settings?.sessionType != "mixed") {
        for (let j = 0, maxj = ICONS.length; j < maxj; j += 1) {
          if (Array.isArray(ICONS[j].scrambler)) {
            if (
              (ICONS[j].scrambler as string[]).some(
                s => $sessions[i].settings && s === $sessions[i].settings.mode
              )
            ) {
              $sessions[i].icon = ICONS[j];
              break;
            }
          } else if ($sessions[i].settings && ICONS[j].scrambler === $sessions[i].settings.mode) {
            $sessions[i].icon = ICONS[j];
            break;
          }
        }
      }
    }
  }

  function updateCurrentSession() {
    const { session, group, mode, prob } = timerController;
    $sessions.forEach(s => (s.tName = s.name.toLowerCase()));
    setTimeout(() => $sessions.sort((a, b) => a.tName?.localeCompare(b.tName || "") || 0), 1000);

    let ss = page.params.sessionId;
    let currentSession = $sessions.find(s => s._id === ss);
    session.set(currentSession || $sessions[0]);

    // select mode/group/prob using the use-case
    const selector = new SelectSession();
    const res = selector.execute(get(session), MENU as any);

    group.set(res.groupIndex);
    mode.set(res.mode as any);
    if (typeof res.prob !== "undefined") prob.set(res.prob);

    initInputHandler(get(session).settings.input || "");

    updateSessionsIcons();
    selectedSession();
  }

  async function initInputHandler(id: string) {
    const { device, session } = timerController;
    device.set($devices.find(d => d.id === id) || $devices[0]);
    $devices.forEach(d => (d.enabled = false));
    get(device).init(inputContext);
    const updated = await sessionController
      .applySettings(get(session), { input: get(device).id } as any)
      .catch(() => null);
    if (updated) session.set(updated);
  }

  onMount(() => {
    testPrediction();

    if (timerOnly && scrambleOnly) {
      timerOnly = scrambleOnly = false;
    }

    if (!(battle || timerOnly || scrambleOnly)) {
      // Use controller to load solves; controller uses the GetSolves use-case + adapter
      solveController.loadSolves().then(sv => {
        timerController.allSolves.set(sv);

        $sessions.forEach(s => (s.tName = s.name));

        if ($sessions.length === 0) {
          newSessionName = "Session 1";
          newSession();
          return;
        }

        updateCurrentSession();
      });
    }
  });

  $effect(() => {
    let timerState = get(timerController.timerState);
    timerController.isRunning.set(
      timerState === TimerState.INSPECTION || timerState === TimerState.RUNNING
    );
  });

  $effect(() => {
    (useScramble || useMode || useProb != -1) && initScrambler(useScramble, useMode, useProb);
  });

  $effect(() => {
    $keyboardEnabled = !scrambleOnly;
  });

  $effect(() => {
    if (page.params.sessionId) {
      untrack(() => {
        if ($sessions.length === 0) return;

        updateCurrentSession();
      });
    }
  });

  let context: TimerContext = $state({
    timerController,
    selected,
    enableKeyboard: keyboardEnabled,
    setSolves,
    handleUpdateSession,
    handleUpdateSolve,
    initScrambler,
    selectedGroup,
    selectedMode,
    selectedFilter,
    selectSolve,
    selectSolveById,
    editSolve,
    handleRemoveSolves,
    editSessions,
  });

  let inputContext: InputContext = $state({
    timerController,
    keyboardEnabled,
    addSolve,
    initScrambler,
    reset,
    createNewSolve,
    handleRemoveSolves,
    handleUpdateSolve,
    editSolve,
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="grid grid-rows-[2rem,1fr] gap-2 w-full h-full p-1 overflow-hidden">
  <div class="actions flex items-center justify-between gap-2">
    <div role="tablist" class="join gap-1 bg-base-100 p-1 mr-auto">
      <Button
        onclick={() => ($tab = 0)}
        size="sm"
        role="tab"
        class={"tab px-4 text-sm py-1.5 " +
          ($tab === 0 ? "bg-primary" : "shadow-transparent border-transparent")}
      >
        <TimerIcon size={iconSize} />
        {$localLang.TIMER.timerTab}
      </Button>

      <Button
        onclick={() => ($tab = 1)}
        size="sm"
        role="tab"
        class={"tab px-4 text-sm py-1.5 " +
          ($tab === 1 ? "bg-primary" : "shadow-transparent border-transparent")}
      >
        <LogsIcon size={iconSize} />
        {$localLang.TIMER.historyTab}
      </Button>

      <Button
        onclick={() => ($tab = 2)}
        size="sm"
        role="tab"
        class={"tab px-4 text-sm py-1.5 " +
          ($tab === 2 ? "bg-primary" : "shadow-transparent border-transparent")}
      >
        <ChartLineIcon size={iconSize} />
        {$localLang.TIMER.statsTab}
      </Button>
    </div>

    <TimerOptions
      {context}
      enableKeyboard={keyboardEnabled}
      {timerOnly}
      {initInputHandler}
      options={{
        seed: true,
        tools: true,
        hints: true,
        sessionSettings: true,
      }}
    />
  </div>

  <div class="content overflow-hidden relative">
    <TimerTab bind:context {inputContext} {timerController} />
    <HistoryTab bind:context {timerController} />
    <StatsTab bind:context {timerController} />
  </div>
</div>

<style>
  .content {
    display: grid;
    grid-template-areas: "tabs";
  }
</style>
