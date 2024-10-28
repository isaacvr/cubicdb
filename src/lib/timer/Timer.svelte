<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { derived, writable, type Readable } from "svelte/store";

  /// Modules
  import * as all from "@cstimer/scramble";
  import JSConfetti from "js-confetti";

  /// Data
  import {
    isNNN,
    SessionDefaultSettings,
    type SCRAMBLE_MENU,
    AON,
    ICONS,
    STEP_COLORS,
    MISC,
  } from "@constants";

  /// Components
  import TabGroup from "@material/TabGroup.svelte";
  import Tab from "@material/Tab.svelte";
  import Select from "@material/Select.svelte";
  import TimerTab from "$lib/timer/TimerTab/TimerTab.svelte";
  import SessionsTab from "$lib/timer/SessionsTab/SessionsTab.svelte";
  import StatsTab from "$lib/timer/StatsTab/StatsTab.svelte";
  import TimerSessionIcon from "$lib/timer/TimerSessionIcon.svelte";

  /// Types
  import {
    TimerState,
    type Solve,
    type Session,
    type Statistics,
    type TimerContext,
    type PuzzleOptions,
    type Language,
    type BluetoothDeviceData,
    SESSION_TYPE,
    type SessionType,
  } from "@interfaces";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { ScrambleParser } from "@classes/scramble-parser";
  import { INITIAL_STATISTICS, getUpdatedStatistics } from "@helpers/statistics";
  import { infinitePenalty, timer } from "@helpers/timer";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { NotificationService } from "@stores/notification.service";
  import { prettyScramble } from "@helpers/strings";
  import { binSearch, newArr } from "@helpers/object";
  import type { HTMLImgAttributes } from "svelte/elements";

  // ICONS
  import TimerIcon from "@icons/Timer.svelte";
  import ListIcon from "@icons/FormatListBulleted.svelte";
  import ChartIcon from "@icons/ChartLineVariant.svelte";
  import PlusIcon from "@icons/Plus.svelte";
  import CheckIcon from "@icons/Check.svelte";
  import CloseIcon from "@icons/Close.svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import { Button, Input, Modal } from "flowbite-svelte";
  import WcaCategory from "@components/wca/WCACategory.svelte";
  import { dataService } from "$lib/data-services/data.service";
  import { scrambleToPuzzle } from "@helpers/scrambleToPuzzle";

  let MENU: SCRAMBLE_MENU[] = getLanguage($globalLang).MENU;

  export let battle = false;
  export let useScramble = "";
  export let useMode: string = "";
  export let useLen: number = 0;
  export let useProb: number = -1;
  export let genScramble = true;
  export let enableKeyboard = writable(true);
  export let timerOnly = false;
  export let scrambleOnly = false;
  export let cleanOnScramble = false;

  let groups: string[] = MENU.map(e => e[0]);

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
  let modes: { 0: string; 1: string; 2: number }[] = MENU[0][1];
  let filters: string[] = [];
  let sessions: Session[] = [];
  let tabs: TabGroup;
  let showDeleteSession = false;
  let dispatch = createEventDispatcher();
  let sessionsTab: SessionsTab;
  let mounted = false;

  /// MODAL
  let openEdit = false;
  let creatingSession = false;
  let newSessionName = "";
  let newSessionType: SessionType = "mixed";
  let newSessionSteps = 2;
  let newSessionGroup = 0;
  let newSessionMode = 0;
  let stepNames: string[] = ["", ""];
  let sSession: Session;

  /// CONTEXT
  let state = writable<TimerState>(TimerState.CLEAN);
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
  let mode = writable<{ 0: string; 1: string; 2: number }>(modes[0]);
  let preview = writable<HTMLImgAttributes[]>([]);
  let prob = writable<number>();
  let isRunning = writable(false);
  let selected = writable(0);
  let decimals = writable(true);
  let bluetoothList = writable<BluetoothDeviceData[]>([]);
  let bluetoothStatus = writable(false);
  let STATS_WINDOW = writable<(number | null)[][]>($AON.map(_ => []));

  let lastPreview = 0;

  let confetti: JSConfetti;

  $: $isRunning = $state === TimerState.INSPECTION || $state === TimerState.RUNNING;

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += s.selected ? 1 : -1;
    $solves = $solves;
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

        $tab === 0 && tabs.nextTab();
        $tab === 2 && tabs.prevTab();
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
    if (sessions.indexOf($session) < 0) {
      $session = sessions[0];
    }
    closeAddSession();
    openEdit = false;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (!enableKeyboard) return;

    if (!battle && ($state === TimerState.CLEAN || $state === TimerState.STOPPED)) {
      if (e.key === "ArrowRight") {
        tabs.nextTab();
      } else if (e.key === "ArrowLeft") {
        tabs.prevTab();
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
    //     let scr = (all.pScramble.scramblers.get(md) || (() => '')).apply(null, [
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

      $scramble = "";

      let md = useMode || _mode || $mode[1];
      let len = useLen || ($mode[1] === "r3ni" ? $prob : $mode[2]);
      let s = useScramble || scr;
      let pb = useProb != -1 ? useProb : _prob != -1 && typeof _prob === "number" ? _prob : $prob;

      if (!genScramble) {
        $scramble = scr || useScramble;
      } else {
        $scramble = s
          ? s
          : (all.pScramble.scramblers.get(md) || (() => ""))
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

      // $scramble = "BL";

      // let cfop = new CFOP(Puzzle.fromSequence($scramble, { type: 'rubik' }).toFacelet());
      // cfop.getAnalysis();

      // console.log("MODE: ", md);
      if (all.pScramble.options.has(md) && $session?.settings?.genImage) {
        // console.log("HAS", md);
        updateImage(md);
      } else {
        setPreview([], Date.now());
      }
    }, 10);
  }

  function selectedFilter(rescramble = true, saveFilter = false) {
    if (saveFilter && ($session.settings.sessionType === "mixed" || $mode[1] === "r3ni")) {
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
    filters = all.pScramble.filters.get($mode[1]) || [];
    updateProb && ($prob = -1);
    selectedFilter(rescramble);
  }

  function selectedGroup(rescramble = true) {
    if (typeof $group === "undefined") return;

    modes = MENU[$group][1];
    $mode = modes[0];

    if ($mode[1] === "r3ni") {
      $prob = 2;
    }

    selectedMode(rescramble, false);
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

    console.log("MODE: ", $mode);

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
      sessions = [...sessions, ns];
      $session = ns;

      updateSessionsIcons();

      if (!$session.settings.sessionType) {
        $session.settings.sessionType = $session.settings.sessionType || "mixed";
        $dataService.session.updateSession($session);
      }

      selectedSession();
      sortSessions();
    });

    closeAddSession();
  }

  function deleteSessionHandler(remove?: boolean) {
    if (remove) {
      $dataService.session.removeSession(sSession).then(ss => {
        sessions = sessions.filter(s1 => s1._id != ss._id);

        if (sessions.length === 0) {
          newSessionName = "Session 1";
          newSession();
          return;
        }

        if (ss._id === $session._id) {
          $session = sessions[0];
          selectedSession();
        }

        updateSessionsIcons();
        sortSessions();
      });
    }

    showDeleteSession = false;
  }

  function handleUpdateSession(session: Session) {
    let updatedSession = sessions.find(s => s._id === session._id);
    if (updatedSession) {
      updatedSession.name = session.name;
      updatedSession.settings = session.settings;
    }
    sortSessions();
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
    $tab === 0 && tabs.nextTab();
    $tab === 2 && tabs.prevTab();
    sessionsTab.editSolve(s);
  }

  function sortSessions() {
    sessions.sort((s1, s2) => (s1.name.toLowerCase() < s2.name.toLowerCase() ? -1 : 1));
    sessions = sessions;
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
    for (let i = 0, maxi = sessions.length; i < maxi; i += 1) {
      if (sessions[i].settings?.sessionType != "mixed") {
        for (let j = 0, maxj = ICONS.length; j < maxj; j += 1) {
          if (Array.isArray(ICONS[j].scrambler)) {
            if (
              (ICONS[j].scrambler as string[]).some(
                s => sessions[i].settings && s === sessions[i].settings.mode
              )
            ) {
              sessions[i].icon = ICONS[j];
              break;
            }
          } else if (sessions[i].settings && ICONS[j].scrambler === sessions[i].settings.mode) {
            sessions[i].icon = ICONS[j];
            break;
          }
        }
      }
    }
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

        $dataService.session.getSessions().then(_sessions => {
          sessions = _sessions.map(s => {
            s.tName = s.name;
            return s;
          });

          if (sessions.length === 0) {
            newSessionName = "Session 1";
            newSession();
            return;
          }

          let ss = $dataService.config.timer.session;
          let currentSession = sessions.find(s => s._id.toString() === ss);
          $session = currentSession || sessions[0];

          updateSessionsIcons();
          selectedSession();
          sortSessions();
        });
      });
    }
  });

  let context: TimerContext = {
    state,
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
  };

  $: {
    (useScramble || useMode || useProb != -1) && initScrambler(useScramble, useMode, useProb);
  }
  $: {
    $enableKeyboard = !scrambleOnly;
  }
</script>

<svelte:window on:keyup={handleKeyUp} />

<main
  class={"w-full " +
    (scrambleOnly || timerOnly || battle ? "h-full" : "h-[calc(100svh-3rem)] pt-14")}
>
  {#if timerOnly || scrambleOnly}
    <TimerTab {timerOnly} {scrambleOnly} {context} {battle} />
  {:else if battle}
    <TimerTab
      {cleanOnScramble}
      {context}
      {battle}
      on:solve={s => dispatch("solve", s.detail)}
      on:update={s => dispatch("solve", s.detail)}
    />
  {:else}
    <div
      class="fixed mt-1 w-max -translate-x-1/2 left-1/2 z-50 grid grid-flow-col
      gap-2 top-14 items-center justify-center"
    >
      <Select
        placeholder={$localLang.TIMER.selectSession}
        value={$session}
        items={sessions}
        label={s => (s || {}).name}
        transform={e => e}
        onChange={g => {
          $session = g;
          setTimeout(selectedSession, 10);
        }}
        hasIcon={e => e.settings.sessionType || "mixed"}
        iconComponent={TimerSessionIcon}
      />

      {#if $tab === 0 && ($session.settings.sessionType || "mixed") === "mixed"}
        <Select
          placeholder={$localLang.TIMER.selectGroup}
          value={groups[$group]}
          items={groups}
          transform={e => e}
          onChange={(g, p) => {
            $group = p || 0;
            selectedGroup();
          }}
        />

        <Select
          placeholder={$localLang.TIMER.selectMode}
          value={$mode}
          items={modes}
          label={e => e[0]}
          transform={e => e}
          onChange={g => {
            $mode = g;
            selectedMode(true, true);
          }}
          hasIcon={groups[$group] === "WCA" ? v => v[1] : null}
        />
      {/if}

      {#if $tab === 0 && filters.length > 0}
        <Select
          placeholder={$localLang.TIMER.selectFilter}
          value={$prob}
          items={["", ...filters]}
          label={e => e.toUpperCase()}
          transform={(i, p) => (p || 0) - 1}
          onChange={(i, p) => {
            $prob = p - 1;
            selectedFilter(true, true);
          }}
        />
      {:else if $tab === 0 && $mode[1] === "r3ni"}
        <Select
          placeholder={$localLang.TIMER.selectFilter}
          value={$prob}
          items={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]}
          label={e => e.toString()}
          transform={e => e}
          onChange={e => {
            $prob = e;
            selectedFilter(true, true);
          }}
        />
      {/if}
    </div>

    <TabGroup
      bind:this={tabs}
      class="h-full"
      footerClass="bg-backgroundLevel2"
      onChange={t => ($tab = t || 0)}
    >
      <Tab name="" icon={TimerIcon} ariaLabel={$localLang.TIMER.timerTab}>
        <TimerTab {context} />
      </Tab>
      <Tab name="" icon={ListIcon} ariaLabel={$localLang.TIMER.sessionsTab}>
        <SessionsTab bind:this={sessionsTab} {context} />
      </Tab>
      <Tab name="" icon={ChartIcon} ariaLabel={$localLang.TIMER.chartsTab}>
        <StatsTab {context} />
      </Tab>
    </TabGroup>
  {/if}

  {#if !timerOnly}
    <Modal
      bind:open={openEdit}
      on:close={handleClose}
      outsideclose
      title={$localLang.TIMER.manageSessions}
      size="md"
      class="max-w-2xl grid bg-backgroundLevel2 tx-text"
      color="none"
    >
      {#if creatingSession}
        <div class="flex flex-col items-center min-h-[12rem] gap-4">
          <Select
            items={SESSION_TYPE}
            label={e => $localLang.TIMER.sessionTypeMap[e]}
            transform={e => e}
            bind:value={newSessionType}
            class="mx-auto"
            hasIcon={e => e}
            iconComponent={TimerSessionIcon}
            placement="right"
          />

          <i class="note tx-text">{$localLang.TIMER.sessionTypeDescription[newSessionType]}</i>

          {#if newSessionType != "mixed"}
            <div class="flex flex-wrap gap-2 justify-center">
              <Select
                class="min-w-[8rem]"
                placeholder={$localLang.TIMER.selectGroup}
                bind:value={newSessionGroup}
                items={groups}
                transform={(_, p) => p}
                placement="right"
              />

              <Select
                class="min-w-[8rem]"
                placeholder={$localLang.TIMER.selectMode}
                bind:value={newSessionMode}
                items={MENU[newSessionGroup][1]}
                label={e => e[0]}
                transform={(_, p) => p}
                placement="right"
                hasIcon={e => e[1]}
              />
            </div>
          {/if}

          <div class="flex flex-wrap gap-2 justify-center">
            <div class="flex items-center justify-center gap-2">
              <span class="tx-text">{$localLang.global.name}</span>

              <Input
                focus={creatingSession}
                class="bg-backgroundLevel2 tx-text flex-1 max-w-[20ch]"
                bind:value={newSessionName}
                on:keyup={handleInputKeyUp}
              />
            </div>

            {#if newSessionType === "multi-step"}
              <div class="flex items-center justify-center gap-2">
                <span class="tx-text">{$localLang.global.steps}</span>

                <Input
                  class="bg-backgroundLevel2 tx-text flex-1 max-w-[10ch]"
                  inpClass="text-center"
                  type="number"
                  min={2}
                  max={10}
                  bind:value={newSessionSteps}
                  on:keyup={handleInputKeyUp}
                  on:change={_ =>
                    (stepNames = [...stepNames, ...newArr(newSessionSteps).fill("")].slice(
                      0,
                      newSessionSteps
                    ))}
                />
              </div>
            {/if}
          </div>

          {#if newSessionType === "multi-step"}
            <div class="flex flex-col gap-2 justify-center">
              <h2 class="text-xl tx-text text-center">{$localLang.TIMER.stepNames}</h2>

              <ul class="flex flex-wrap justify-center items-center gap-2">
                {#each stepNames as sn, p (p)}
                  <li class="w-20">
                    <Input
                      style={`border-color: ${STEP_COLORS[p]}; border-width: .15rem;`}
                      placeholder={$localLang.global.step + " " + (p + 1)}
                      bind:value={sn}
                    />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {:else}
        <div
          class="grid gap-2 m-2 mt-4"
          style="grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));"
        >
          {#each sessions as s}
            <button
              class={"grid h-max border rounded-md relative " +
                (s.settings.sessionType === "mixed"
                  ? "border-purple-400"
                  : s.settings.sessionType === "single"
                    ? "border-green-400"
                    : "border-sky-500") +
                (s.icon ? " pl-8" : "")}
              on:click={() => {
                sessions.forEach(s1 => (s1.editing = false));
                s.editing = true;
              }}
            >
              {#if s.icon}
                <span
                  class="absolute p-[.05rem] rounded-sm
                  left-[.5rem] top-1/2 -translate-y-1/2"
                >
                  <WcaCategory icon={s.icon.icon} size="1rem" buttonClass="!p-[.1rem]" />
                </span>
              {/if}

              <Input
                class={"!bg-transparent text-center text-ellipsis w-full rounded-none flex-1 tx-text " +
                  (!s.editing ? " border-none " : "") +
                  (s.icon ? " text-left pl-1 " : "")}
                bind:value={s.tName}
                focus={s.editing}
                on:keydown={e => {
                  switch (e.code) {
                    case "Enter": {
                      s.editing = false;
                      renameSession(s);
                      break;
                    }
                    case "Escape": {
                      s.editing = false;
                      e.stopPropagation();
                      // @ts-ignore
                      e.target.blur();
                      break;
                    }
                  }
                }}
              />
              <div class="flex items-center justify-center">
                {#if s.editing && !creatingSession}
                  <button
                    tabindex="0"
                    class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                    on:click|stopPropagation={ev => renameSession(s)}
                  >
                    <CheckIcon size="1.2rem" />
                  </button>
                  <button
                    tabindex="0"
                    class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                    on:click|stopPropagation={() => (s.editing = false)}
                  >
                    <CloseIcon size="1.2rem" />
                  </button>
                  <button
                    tabindex="0"
                    class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                    on:click|stopPropagation={() => {
                      sSession = s;
                      showDeleteSession = true;
                    }}
                  >
                    <DeleteIcon size="1.2rem" />
                  </button>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <svelte:fragment slot="footer">
        {#if creatingSession}
          <div class="flex justify-center gap-2 mx-auto">
            <Button color="alternative" on:click={closeAddSession}
              >{$localLang.global.cancel}</Button
            >
            <Button on:click={newSession}>
              {$localLang.global.save}
            </Button>
          </div>
        {:else}
          <Button
            type="button"
            ariaLabel={$localLang.TIMER.addNewSession}
            on:click={openAddSession}
            class="mx-auto flex bg-primary-700 tx-text"
          >
            <PlusIcon />
            {$localLang.TIMER.addNewSession}
          </Button>
        {/if}
      </svelte:fragment>
    </Modal>
  {/if}

  <Modal
    class="bg-backgroundLevel3 tx-text"
    color="none"
    bind:open={showDeleteSession}
    size="xs"
    autoclose
    outsideclose
  >
    <h1 class="tx-text mb-4 text-lg">{$localLang.TIMER.removeSession}</h1>
    <div class="flex justify-evenly">
      <Button color="alternative" class="bg-cancelButton" ariaLabel={$localLang.global.cancel}>
        {$localLang.global.cancel}
      </Button>

      <Button
        color="red"
        ariaLabel={$localLang.global.delete}
        on:click={() => deleteSessionHandler(true)}
      >
        {$localLang.global.delete}
      </Button>
    </div>
  </Modal>
</main>
