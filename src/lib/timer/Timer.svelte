<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { derived, writable, type Readable, type Writable } from "svelte/store";

  /// Modules
  import { pScramble } from "@cstimer/scramble";
  import JSConfetti from "js-confetti";

  /// Data
  import { isNNN, SessionDefaultSettings, type SCRAMBLE_MENU, AON, ICONS } from "@constants";

  /// Components
  import TabGroup from "@material/TabGroup.svelte";
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
    type Language,
    type BluetoothDeviceData,
    type SessionType,
    type PuzzleType,
    type TimerInputHandler,
    type InputContext,
  } from "@interfaces";
  import { ScrambleParser } from "@classes/scramble-parser";
  import { INITIAL_STATISTICS, getUpdatedStatistics } from "@helpers/statistics";
  import { infinitePenalty, timer } from "@helpers/timer";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { NotificationService } from "@stores/notification.service";
  import { prettyScramble } from "@helpers/strings";
  import { binSearch } from "@helpers/object";
  import type { HTMLImgAttributes } from "svelte/elements";

  // ICONS
  import { dataService } from "$lib/data-services/data.service";
  import { scrambleToPuzzle } from "@helpers/scrambleToPuzzle";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { ChartLineIcon, LogsIcon, TimerIcon } from "lucide-svelte";
  import { page } from "$app/state";
  import { sessions } from "@stores/sessions.store";
  import TimerOptions from "./TimerTab/TimerOptions.svelte";
  import { between } from "@helpers/math";
  import { ManualInput } from "./adaptors/Manual";
  import { StackmatInput } from "./adaptors/Stackmat";
  import { GANInput } from "./adaptors/GAN";
  import { QiYiSmartTimerInput } from "./adaptors/QY-Timer";
  import { KeyboardInput } from "./adaptors/Keyboard";
  import { VirtualInput } from "./adaptors/Virtual";

  let BASE_MENU = getLanguage($globalLang).MENU;
  let MENU: SCRAMBLE_MENU[] = $state(BASE_MENU);

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
    enableKeyboard = writable(true),
    timerOnly = false,
    scrambleOnly = false,
    cleanOnScramble = false,
  }: TimerProps = $props();

  let groups: string[] = $state(BASE_MENU.map(e => e[0]));

  let localLang: Readable<Language> = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MENU = l.MENU;
    groups = MENU.map(e => e[0]);
    selectedGroup(false);
    return l;
  });

  /// SERVICES
  const notService = NotificationService.getInstance();

  /// GENERAL
  let modes: { 0: string; 1: string; 2: number }[] = $state(BASE_MENU[0][1]);
  let filters: string[] = $state([]);
  let showDeleteSession = $state(false);
  let sessionsTab: HistoryTab | null = $state(null);
  let mounted = false;
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
  let sSession: Session | null = null;

  /// CONTEXT
  let timerState = writable<TimerState>(TimerState.CLEAN);
  let ready = writable(false);
  let tab = writable(0);
  let solves = writable<Solve[]>([]);
  let allSolves = writable<Solve[]>([]);
  let session = writable<Session>({
    _id: "",
    name: "Default",
    settings: Object.assign({}, SessionDefaultSettings),
    editing: false,
    tName: "",
  });
  let Ao5 = writable<number[]>();
  let stats = writable<Statistics>(INITIAL_STATISTICS);
  let scramble = writable("");
  let group = writable<number>();
  let mode = writable<{ 0: string; 1: string; 2: number }>(BASE_MENU[0][1][0]);
  let preview = writable<HTMLImgAttributes[]>([]);
  let prob = writable<number>();
  let isRunning = writable(false);
  let selected = writable(0);
  let decimals = writable(true);
  let bluetoothList = writable<BluetoothDeviceData[]>([]);
  let bluetoothStatus = writable(false);
  let STATS_WINDOW = writable<(number | null)[][]>($AON.map(_ => []));
  let puzzleType = writable<PuzzleType>("rubik");
  let puzzleOrder = writable(3);
  let deviceID: Writable<string> = writable("default");
  let deviceList: string[][] = [];
  
  let lastPreview = 0;

  let confetti: JSConfetti;

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += s.selected ? 1 : -1;
  }

  function selectSolveById(id: string, n: number) {
    $solves.forEach(s => (s.selected = false));
    $selected = 0;

    for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      if ($solves[i]._id === id) {
        for (let j = 0; j < n && i + j < maxi; j += 1) {
          if ($solves[i + j].selected) continue;

          $solves[i + j].selected = true;
          $selected += 1;
        }

        $tab = 1;
        break;
      }
    }
  }

  async function updateStatistics(inc?: boolean) {
    let st = getUpdatedStatistics($stats, $solves, $session, $AON, inc);
    $stats = st.stats;
    $STATS_WINDOW = st.window;

    let bestList = [];

    for (let e of Object.entries($stats)) {
      if (e[1].better) {
        bestList.push({
          name: e[0] === "best" ? $localLang.TIMER.best : e[0],
          prev: e[1].prev || 0,
          now: e[1].best || 0,
        });
      }
    }

    if (bestList.length && $session.settings.recordCelebration) {
      $dataService.emit("new-record");

      notService.addNotification({
        header: $localLang.TIMER.congrats,
        text: "",
        html: bestList
          .map(
            o =>
              `${o.name}: ${timer(o.now, true)} (${$localLang.TIMER.from} ${timer(o.prev, true)})`
          )
          .join("<br>"),
        timeout: 5000,
      });

      confetti.addConfetti({
        confettiNumber: 100,
        confettiColors: ["#009d54", "#3d81f6", "#ffeb3b"],
      });
    }
  }

  function updateSolves() {
    $solves = $allSolves.filter(s => s.session === ($session || {})._id);

    // Calc next Ao5
    let arr = $solves
      .slice(0, 4)
      .filter(s => !infinitePenalty(s))
      .map(s => s.time);
    let sum = arr.reduce((ac, e) => ac + e, 0);
    arr.sort();

    $Ao5 = arr.length === 4 ? [(sum - arr[3]) / 3, (sum - arr[0]) / 3].sort((a, b) => a - b) : [];
  }

  function sortSolves() {
    $allSolves = $allSolves.sort((a, b) => b.date - a.date);
    updateSolves();
  }

  function setSolves(rescramble: boolean = true) {
    sortSolves();
    updateStatistics(true);
    rescramble && setTimeout(initScrambler, 10);
  }

  function editSessions() {
    openEdit = true;
  }

  function openAddSession() {
    creatingSession = true;
    newSessionName = "";
  }

  function closeAddSession() {
    creatingSession = false;
  }

  function handleClose() {
    if ($sessions.indexOf($session) < 0) {
      $session = $sessions[0];
    }
    closeAddSession();
    openEdit = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!enableKeyboard) return;

    if (!battle && ($timerState === TimerState.CLEAN || $timerState === TimerState.STOPPED)) {
      if (e.key === "ArrowRight") {
        $tab = between($tab + 1, 0, 2);
      } else if (e.key === "ArrowLeft") {
        $tab = between($tab - 1, 0, 2);
      }
    }
  }

  function handleInputKeyUp(e: KeyboardEvent) {
    if (!enableKeyboard) return;

    if (e.key === "Enter") {
      newSession();
    } else if (e.key === "Escape") {
      closeAddSession();
    }
    e.stopPropagation();
  }

  function setPreview(img: string[], date: number) {
    if (date > lastPreview) {
      $preview = img.map(src => ({ src, alt: "", title: "" }));
      lastPreview = date;
    }
  }

  async function updateImage(md: string) {
    let cb = scrambleToPuzzle($scramble, md);
    let date = Date.now();
    setPreview(await pGenerateCubeBundle(cb, 500), date);
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

  export function initScrambler(scr?: string, _mode?: string, _prob?: number) {
    setTimeout(async () => {
      if (!mounted) return;

      if (!$mode) {
        $mode = MENU[$group || 0][1][0];
      }

      let md = useMode || _mode || $mode[1];
      let len = useLen || ($mode[1] === "r3" || $mode[1] === "r3ni" ? $prob : $mode[2]);
      let s = useScramble || scr;
      let pb = useProb != -1 ? useProb : _prob != -1 && typeof _prob === "number" ? _prob : $prob;

      if (!genScramble) {
        $scramble = scr || useScramble;
      } else {
        $scramble = s
          ? s
          : (pScramble.scramblers.get(md) || (() => ""))
              .apply(null, [md, Math.abs(len), pb < 0 ? undefined : pb])
              .replace(/\\n/g, "<br>")
              .trim();
      }

      if (isNNN(md)) {
        $scramble = ScrambleParser.parseNNNString($scramble);
      }

      $scramble = prettyScramble($scramble);

      // emit scramble for iCarry and other stuffs
      $dataService.scramble($scramble);

      // console.log("SCRAMBLE: ", $scramble);

      // $scramble = "U' B2 D L2 B2 D L2 R2 F2 D' F2 B' R' D L' U2 B' D2 B";

      // let cfop = new CFOP(Puzzle.fromSequence($scramble, { type: 'rubik' }).toFacelet());
      // cfop.getAnalysis();

      // console.log("MODE: ", md);

      let opts = pScramble.options.get(md);

      if (opts) {
        if (!Array.isArray(opts)) {
          $puzzleType = opts.type;
          $puzzleOrder = opts.order ? opts.order[0] : 3;
        }
      }

      if (opts && $session?.settings?.genImage) {
        // console.log("HAS", md);

        updateImage(md);
      } else {
        setPreview([], Date.now());
      }
    }, 10);
  }

  function selectedFilter(rescramble = true, saveFilter = false) {
    if (
      saveFilter &&
      ($session.settings.sessionType === "mixed" || $mode[1] === "r3" || $mode[1] === "r3ni")
    ) {
      $session.settings.prob = $prob;
      $dataService.session.updateSession($session).then().catch();
    }

    rescramble && initScrambler();
  }

  function selectedMode(rescramble = true, saveMode = false, updateProb = true) {
    if (saveMode && $session.settings.sessionType === "mixed") {
      $session.settings.mode = $mode[1];
      $dataService.session.updateSession($session).then().catch();
    }
    filters = pScramble.filters.get($mode[1]) || [];
    updateProb && ($prob = -1);
    selectedFilter(rescramble);
  }

  function selectedGroup(rescramble = true, saveGroup = false) {
    if (typeof $group === "undefined") return;

    modes = MENU[$group][1];
    $mode = modes[0];

    if ($mode[1] === "r3ni" || $mode[1] === "r3") {
      $prob = $mode[1] === "r3ni" ? 2 : 5;
    }

    selectedMode(rescramble, saveGroup);
  }

  function selectedSession() {
    const config = $dataService.config;

    config.timer.session = $session._id;
    config.saveConfig();

    let targetMode = $session.settings.mode || "333";
    let fnd = false;

    for (let i = 0, maxi = MENU.length; i < maxi; i += 1) {
      let md = MENU[i][1].find(m => m[1] === targetMode);

      if (md) {
        $mode = md;
        $group = i;
        modes = MENU[$group][1];

        if (typeof $session.settings.prob === "undefined") {
          selectedMode(false, false);
        } else {
          $prob = $session.settings.prob;
          selectedMode(false, false, false);
        }

        fnd = true;
        break;
      }
    }

    if (!fnd) {
      $mode = MENU[0][1][0];
    }

    // console.log("MODE: ", $mode);

    $stats = INITIAL_STATISTICS;
    setSolves();
  }

  function newSession() {
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

    $dataService.session.addSession({ _id: "", name, settings }).then(ns => {
      ns.tName = ns.name;
      $session = ns;

      updateSessionsIcons();

      if (!$session.settings.sessionType) {
        $session.settings.sessionType = $session.settings.sessionType || "mixed";
        $dataService.session.updateSession($session);
      }

      selectedSession();
    });

    closeAddSession();
  }

  function deleteSessionHandler(remove?: boolean) {
    if (remove && sSession) {
      $dataService.session.removeSession(sSession).then(ss => {
        if ($sessions.length === 0) {
          newSessionName = "Session 1";
          newSession();
          return;
        }

        if (ss._id === $session._id) {
          $session = $sessions[0];
          selectedSession();
        }

        updateSessionsIcons();
      });
    }

    showDeleteSession = false;
  }

  function handleUpdateSession(session: Session) {
    let updatedSession = $sessions.find(s => s._id === session._id);
    if (updatedSession) {
      updatedSession.name = session.name;
      updatedSession.settings = session.settings;
    }
  }

  function renameSession(s: Session) {
    s.editing = false;

    if (s.tName?.trim() === "") {
      return;
    }

    $dataService.session
      .updateSession({ _id: s._id, name: s.tName?.trim() || "Session -", settings: s.settings })
      .then(handleUpdateSession);
  }

  function editSolve(s: Solve) {
    $tab = 1;
    sessionsTab?.editSolve(s);
  }

  function handleUpdateSolve(updatedSolve: Solve) {
    for (let i = 0, maxi = $allSolves.length; i < maxi; i += 1) {
      if ($allSolves[i]._id === updatedSolve._id) {
        $allSolves[i].comments = updatedSolve.comments;
        $allSolves[i].penalty = updatedSolve.penalty;
        $allSolves[i].time = updatedSolve.time;
        break;
      }
    }
    $stats = INITIAL_STATISTICS;
    setSolves(false);
  }

  function handleRemoveSolves(ids: Solve[]) {
    let sl = $solves.length;

    for (let i = 0, maxi = ids.length; i < maxi; i += 1) {
      let pos1 = binSearch<Solve>(ids[i], $solves, (a: Solve, b: Solve) => b.date - a.date);
      let pos2 = binSearch<Solve>(ids[i], $allSolves, (a: Solve, b: Solve) => b.date - a.date);

      pos1 > -1 && $solves.splice(pos1, 1);
      pos2 > -1 && $allSolves.splice(pos2, 1);
    }

    if ($solves.length != sl) {
      $stats = INITIAL_STATISTICS;
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
    $sessions.forEach(s => (s.tName = s.name.toLowerCase()));
    setTimeout(() => $sessions.sort((a, b) => a.tName?.localeCompare(b.tName || "") || 0), 1000);

    let ss = page.params.sessionId;
    let currentSession = $sessions.find(s => s._id === ss);
    $session = currentSession || $sessions[0];

    updateSessionsIcons();
    selectedSession();
  }

  onMount(() => {
    mounted = true;

    testPrediction();
    confetti = new JSConfetti();

    if (timerOnly && scrambleOnly) {
      timerOnly = scrambleOnly = false;
    }

    if (!(battle || timerOnly || scrambleOnly)) {
      $dataService.solve.getSolves().then(sv => {
        $allSolves = sv;

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
    $isRunning = $timerState === TimerState.INSPECTION || $timerState === TimerState.RUNNING;
  });

  $effect(() => {
    (useScramble || useMode || useProb != -1) && initScrambler(useScramble, useMode, useProb);
  });

  $effect(() => {
    $enableKeyboard = !scrambleOnly;
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
    timerState,
    ready,
    tab,
    solves,
    allSolves,
    session,
    Ao5,
    stats,
    scramble,
    decimals,
    group,
    mode,
    preview,
    prob,
    isRunning,
    selected,
    bluetoothList,
    bluetoothStatus,
    enableKeyboard,
    STATS_WINDOW,
    puzzleType,
    puzzleOrder,
    setSolves,
    sortSolves,
    updateSolves,
    handleUpdateSession,
    handleUpdateSolve,
    updateStatistics,
    initScrambler,
    selectedGroup,
    selectSolve,
    selectSolveById,
    editSolve,
    handleRemoveSolves,
    editSessions,
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
      {enableKeyboard}
      {timerOnly}
      {deviceID}
      {deviceList}
    />
  </div>

  <div class="content overflow-hidden relative">
    <TimerTab bind:context {deviceID} {deviceList} />
    <HistoryTab bind:context />
    <StatsTab bind:context />
  </div>
</div>

<style>
  .content {
    display: grid;
    grid-template-areas: "tabs";
  }
</style>
