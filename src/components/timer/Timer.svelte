<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { pGenerateCubeBundle } from '@helpers/cube-draw';
  import { derived, writable, type Readable } from 'svelte/store';
  
  /// Modules
  import * as all from '@cstimer/scramble';
  import { solve_cross, solve_xcross } from '@cstimer/tools/cross';
  import JSConfetti from 'js-confetti';
  
  /// Data
  import { isNNN, SessionDefaultSettings, type SCRAMBLE_MENU, AON, ICONS, CubeDBICON, STEP_COLORS } from '@constants';
  import { DataService } from '@stores/data.service';

  /// Components
  import TabGroup from '@material/TabGroup.svelte';
  import Tab from '@material/Tab.svelte';
  import TimerTab from './TimerTab.svelte';
  import SessionsTab from './SessionsTab.svelte';
  import StatsTab from './StatsTab.svelte';
  // import Modal from '@components/Modal.svelte';
  import Select from '@components/material/Select.svelte';

  /// Types
  import { TimerState, type Solve, type Session,  type Statistics, type TimerContext, type PuzzleOptions, type Language, type BluetoothDeviceData, SESSION_TYPE, type SessionType, DIALOG_MODES } from '@interfaces';
  import { Puzzle } from '@classes/puzzle/puzzle';
  import { PX_IMAGE } from '@constants';
  import { ScrambleParser } from '@classes/scramble-parser';
  import { INITIAL_STATISTICS, getUpdatedStatistics } from '@helpers/statistics';
  import { infinitePenalty, timer } from '@helpers/timer';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { NotificationService } from '@stores/notification.service';
  import { randomUUID } from '@helpers/strings';
  import { binSearch } from '@helpers/object';
  
  // ICONS
  import TimerIcon from '@icons/Timer.svelte';
  import ListIcon from '@icons/FormatListBulleted.svelte';
  import ChartIcon from '@icons/ChartLineVariant.svelte';
  import TuneIcon from '@icons/Tune.svelte';
  import PlusIcon from '@icons/Plus.svelte';
  import CheckIcon from '@icons/Check.svelte';
  import CloseIcon from '@icons/Close.svelte';
  import DeleteIcon from '@icons/Delete.svelte';
  import { screen } from '@stores/screen.store';
  import { Button, Input, Modal, Tooltip } from 'flowbite-svelte';
  import WcaCategory from '@components/wca/WCACategory.svelte';
  import { isBetween } from '@helpers/math';
  import { identifyPuzzle } from '../import-export/common';

  let MENU: SCRAMBLE_MENU[] = getLanguage($globalLang).MENU;
  
  export let battle = false;
  export let useScramble = '';
  export let useMode: string = '';
  export let useLen: number = 0;
  export let useProb: number = -1;
  export let genScramble = true;
  export let enableKeyboard = true;
  export let timerOnly = false;
  export let scrambleOnly = false;
  export let cleanOnScramble = false;

  let groups: string[] = MENU.map(e => e[0]);
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => {
    let l = getLanguage( $lang );
    MENU = l.MENU;
    groups = MENU.map(e => e[0]);
    selectedGroup(false);
    return l;
  });

  /// SERVICES
  const dataService = DataService.getInstance();
  const notService = NotificationService.getInstance();

  /// GENERAL
  let modes: { 0: string, 1: string, 2: number }[] = MENU[0][1];
  let filters: string[] = [];
  let sessions: Session[] = [];  
  let tabs: TabGroup;
  // let deleteSessionModal: Modal;
  let deleteSessionModal = false;
  let showDeleteSession = false;
  let dispatch = createEventDispatcher();
  let sessionsTab: SessionsTab;
  let mounted = false;
  
  /// MODAL
  let openEdit = false;
  let creatingSession = false;
  let newSessionName = "";
  let newSessionType: SessionType = 'mixed';
  let newSessionSteps = 2;
  let newSessionGroup = 0;
  let newSessionMode = 0;
  let stepNames: string[] = [ '', '' ];
  let sSession: Session;

  /// CONTEXT
  let state = writable<TimerState>(TimerState.CLEAN);
  let ready = writable<boolean>(false);
  let tab = writable<number>(0);
  let solves = writable<Solve[]>([]);
  let allSolves = writable<Solve[]>([]);
  let session = writable<Session>({
    _id: '',
    name: 'Default',
    settings: Object.assign({}, SessionDefaultSettings),
    editing: false,
    tName: '',
  });
  let Ao5 = writable<number[]>();
  let stats = writable<Statistics>(INITIAL_STATISTICS);
  let scramble = writable<string>();
  let group = writable<number>();
  let mode = writable<{ 0: string, 1: string, 2: number }>(modes[0]);
  let hintDialog = writable<boolean>(true);
  let hint = writable<boolean>();
  let cross = writable<string>();
  let xcross = writable<string>();
  let preview = writable<string>(PX_IMAGE);
  let prob = writable<number>();
  let isRunning = writable<boolean>(false);
  let selected = writable<number>(0);
  let decimals = writable<boolean>(true);
  let bluetoothList = writable<BluetoothDeviceData[]>([]);
  let bluetoothStatus = writable(false);
  let STATS_WINDOW = writable<(number | null)[][]>( $AON.map(_ => []) );

  let lastPreview = 0;

  let confetti = new JSConfetti();
  
  $: $isRunning = $state === TimerState.INSPECTION || $state === TimerState.RUNNING;

  function restartStats() {
    $stats = INITIAL_STATISTICS;
  }

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += (s.selected) ? 1 : -1;
    $solves = $solves;
  }

  function selectSolveById(id: string, n: number) {
    $solves.forEach(s => s.selected = false);
    $selected = 0;

    for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      if ( $solves[i]._id === id ) {
        for (let j = 0; j < n && i + j < maxi; j += 1) {
          if ( $solves[i + j].selected ) continue;

          $solves[i + j].selected = true;
          $selected += 1;
        }

        $tab === 0 && tabs.nextTab();
        $tab === 2 && tabs.prevTab();
        break;
      }
    }
  }

  function setConfigFromSolve(s: Solve, rescramble: boolean = true) {
    $group = s.group || 0;
    let menu = MENU[ $group ];
    modes = menu[1];
    let fModes = modes.filter(m => m[1] === s.mode);
    $mode = fModes.length ? fModes[0] : modes[0];
    $prob = s.prob || -1;
    rescramble && selectedFilter();
  }

  function updateStatistics(inc ?: boolean) {
    let st = getUpdatedStatistics($stats, $solves, $session, $AON, inc);
    $stats = st.stats;
    $STATS_WINDOW = st.window;

    let bestList = [];

    for (let e of Object.entries($stats)) {
      if ( e[1].better ) {
        bestList.push({
          name: e[0] === 'best' ? $localLang.TIMER.best : e[0],
          prev: e[1].prev || 0,
          now: e[1].best || 0,
        })
      }
    }

    if ( bestList.length && $session.settings.recordCelebration ) {
      notService.addNotification({
        header: $localLang.TIMER.congrats,
        text: '',
        html: bestList.map(o => `${o.name}: ${ timer(o.now, true) } (${ $localLang.TIMER.from } ${ timer(o.prev, true) })`).join('<br>'),
        timeout: 5000,
        key: randomUUID(),
        icon: CubeDBICON,
      });

      confetti.addConfetti({
        confettiNumber: 100,
        confettiColors: [ '#009d54', '#3d81f6', '#ffeb3b' ]
      });
    }
  }

  function updateSolves() {
    $solves = $allSolves.filter(s => s.session === ($session || {})._id);
    
    // Calc next Ao5
    let arr = $solves.slice(0, 4).filter( s => !infinitePenalty(s) ).map(s => s.time);
    let sum = arr.reduce((ac, e) => ac + e, 0);
    arr.sort();

    $Ao5 = arr.length === 4 ? [ ( sum - arr[3] ) / 3, ( sum - arr[0] ) / 3 ].sort((a, b) => a - b) : [];
  }

  function sortSolves() {
    $allSolves = $allSolves.sort((a, b) => b.date - a.date);
    updateSolves();
  }

  function setSolves(rescramble: boolean = true) {
    sortSolves();
    updateStatistics(true);
    rescramble && initScrambler();
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
    if ( sessions.indexOf( $session ) < 0 ) {
      $session = sessions[0];
    }
    closeAddSession();
    openEdit = false;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if ( !enableKeyboard ) return;

    if ( !battle && ($state === TimerState.CLEAN || $state === TimerState.STOPPED) ) {
      if ( e.key === 'ArrowRight' ) { tabs.nextTab(); }
      else if ( e.key === 'ArrowLeft' ) { tabs.prevTab(); }
    }
  }

  function handleInputKeyUp(e: KeyboardEvent) {
    if ( !enableKeyboard ) return;
   
    if ( e.key === 'Enter' ) {
      newSession();
    } else if ( e.key === 'Escape' ) {
      closeAddSession();
    }
    e.stopPropagation();
  }

  function setPreview(img: string, date: number, type: any) {
    if ( date > lastPreview ) {
      $preview = img;
      lastPreview = date;
    }
  }

  async function updateImage(md: string) {
    let cb = Puzzle.fromSequence( $scramble, {
      ...all.pScramble.options.get(md),
      rounded: true,
      headless: true
    } as PuzzleOptions, false, false);

    let date = Date.now();
    setPreview((await pGenerateCubeBundle([cb], 500))[0], date, cb.type);
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

  export function initScrambler(scr?: string, _mode ?: string, _prob ?: number) {
    if ( !mounted ) return;

    if ( !$mode ) {
      $mode = MENU[ $group || 0 ][1][0];
    }

    let md = useMode || _mode || $mode[1];
    let len = useLen || $mode[2];
    let s = useScramble || scr;
    let pb = useProb != -1 ? useProb : (_prob != -1 && typeof _prob === 'number') ? _prob : $prob;
    
    if ( !genScramble ) {
      $scramble = scr || useScramble;
    } else {
      $scramble = (s) ? s : (all.pScramble.scramblers.get(md) || (() => '')).apply(null, [
        md, Math.abs(len), pb < 0 ? undefined : pb
      ]).replace(/\\n/g, '<br>').trim();
    }

    if ( isNNN(md) ) {
      $scramble = ScrambleParser.parseNNNString($scramble);
    }

    if ( DIALOG_MODES.indexOf(md) > -1 ) {
      $cross = solve_cross($scramble).map(e => e.map(e1 => e1.trim()).join(' '))[0];
      $xcross = solve_xcross($scramble, 0).map(e => e.trim()).join(' ');
      // $hintDialog = true;
    } else {
      $cross = "";
      $xcross = "";
      $hint = false;
      // $hintDialog = false;
    }

    dataService.scramble($scramble);

    if ( all.pScramble.options.has(md) && $session?.settings?.genImage ) {
      updateImage(md);
    } else {
      setPreview(PX_IMAGE, Date.now(), '-');
    }
  }

  function selectedFilter(rescramble = true) {
    rescramble && initScrambler();
  }

  function selectedMode(rescramble = true, saveMode = false) {
    if ( saveMode ) {
      $session.settings.mode = $mode[1];
      dataService.updateSession($session).then().catch();
    }
    filters = all.pScramble.filters.get($mode[1]) || [];
    $prob = -1;
    selectedFilter(rescramble);
  }

  function selectedGroup(rescramble = true) {
    if ( !isBetween($group + 0.1, 0, MENU.length - 1, true) ) return;

    modes = MENU[ $group ][1];
    $mode = modes[0];
    selectedMode(rescramble);
  }

  function selectedSession() {
    localStorage.setItem('session', $session._id);
    
    // if ( $session.settings.sessionType != 'mixed' ) {
    let targetMode = $session.settings.mode || '333';
    let fnd = false;

    for (let i = 0, maxi = MENU.length; i < maxi; i += 1) {
      let md = MENU[i][1].find(m => m[1] === targetMode);

      if ( md ) {
        $mode = md;
        fnd = true;    
        break;
      }
    }

    if ( !fnd ) {
      $mode = MENU[0][1][0];
    }
    // }

    restartStats();
    setSolves();
  }

  function newSession() {
    let name = newSessionName.trim();

    if ( !name ) return;

    let settings = Object.assign({}, SessionDefaultSettings);
    
    settings.sessionType = newSessionType;

    if ( newSessionType === 'single' || newSessionType === 'multi-step' ) {
      settings.mode = MENU[ newSessionGroup ][1][ newSessionMode ][1];
    }

    if ( newSessionType === 'multi-step' ) {
      settings.steps = newSessionSteps;
      settings.stepNames = stepNames;
    }

    dataService.addSession({ _id: '', name, settings })
      .then((ns) => {
        ns.tName = ns.name;
        sessions = [ ...sessions, ns ];
        $session = ns;

        updateSessionsIcons();
        
        if ( !$session.settings.sessionType ) {
          $session.settings.sessionType = $session.settings.sessionType || 'mixed';
          dataService.updateSession($session);
        }

        selectedSession();
        sortSessions();
      });
    
    closeAddSession();
  }

  function deleteSessionHandler(remove?: boolean) {
    if ( remove ) {
      dataService.removeSession(sSession).then((ss) => {
        sessions = sessions.filter(s1 => s1._id != ss._id);
  
        if ( sessions.length === 0 ) {
          newSessionName = 'Session 1';
          newSession();
          return;
        }
  
        if ( ss._id === $session._id ) {
          $session = sessions[0];
        }

        updateSessionsIcons();
        sortSessions();
      });
    }

    showDeleteSession = false;
  }

  function handleUpdateSession(session: Session) {
    let updatedSession = sessions.find(s => s._id === session._id);
    if ( updatedSession ) {
      updatedSession.name = session.name;
      updatedSession.settings = session.settings;
    }
    sortSessions();
  }

  function renameSession(s: Session) {
    s.editing = false;

    if ( s.tName?.trim() === '' ) {
      return;
    }

    dataService.updateSession({ _id: s._id, name: s.tName?.trim() || "Session -", settings: s.settings })
      .then( handleUpdateSession );
  }

  function editSolve(s: Solve) {
    $tab === 0 && tabs.nextTab();
    $tab === 2 && tabs.prevTab();
    sessionsTab.editSolve(s);
  }

  function sortSessions() {
    sessions.sort((s1, s2) => s1.name.toLowerCase() < s2.name.toLowerCase() ? -1 : 1);
    sessions = sessions;
  }

  function handleUpdateSolve(updatedSolve: Solve) {
    for (let i = 0, maxi = $allSolves.length; i < maxi; i += 1) {
      if ( $allSolves[i]._id === updatedSolve._id ) {
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
    let ss = $solves;
    let sl = ss.length;

    let as = $allSolves;

    for (let i = 0, maxi = ids.length; i < maxi; i += 1) {
      let pos1 = binSearch < Solve > (ids[i], ss, (a: Solve, b: Solve) => b.date - a.date);
      let pos2 = binSearch < Solve > (ids[i], as, (a: Solve, b: Solve) => b.date - a.date);
      
      pos1 > -1 && ss.splice(pos1, 1);
      pos2 > -1 && as.splice(pos2, 1);
    }

    if (ss.length != sl) {
      $stats = INITIAL_STATISTICS;
      setSolves();
    }
  }

  function updateSessionsIcons() {
    for (let i = 0, maxi = sessions.length; i < maxi; i += 1) {
      if ( sessions[i].settings?.sessionType != 'mixed' ) {
        for (let j = 0, maxj = ICONS.length; j < maxj; j += 1) {
          if ( Array.isArray(ICONS[j].scrambler) ) {
            if ( (ICONS[j].scrambler as string[]).some(s => s === sessions[i].settings?.mode ) ) {
              sessions[i].icon = ICONS[j];
              break;
            }
          } else if ( ICONS[j].scrambler === sessions[i].settings?.mode ) {
            sessions[i].icon = ICONS[j];
            break;
          }
        }
      }
    }
  }

  onMount(() => {
    testPrediction();
    mounted = true;

    if ( timerOnly && scrambleOnly ) {
      timerOnly = scrambleOnly = false;
    }

    if ( !(battle || timerOnly || scrambleOnly) ) {
      dataService.getSessions().then((_sessions) => {
        sessions = _sessions.map(s => { s.tName = s.name; return s; });

        if ( sessions.length === 0 ) {
          newSessionName = 'Session 1';
          newSession();
          return;
        }

        let ss = localStorage.getItem('session');
        let currentSession = sessions.find(s => s._id.toString() === ss);
        $session = currentSession || sessions[0];

        updateSessionsIcons();
        selectedSession();
        sortSessions();
      });

      dataService.getSolves().then((sv) => {
        $allSolves = sv;
        setSolves();
      });
    }
  });

  let context: TimerContext = {
    state, ready, tab, solves, allSolves, session, Ao5, stats, scramble, decimals,
    group, mode, hintDialog, hint, cross, xcross, preview, prob, isRunning, selected,
    bluetoothList, bluetoothStatus, STATS_WINDOW,
    setSolves, sortSolves, updateSolves, handleUpdateSession, handleUpdateSolve, updateStatistics,
    initScrambler, selectedGroup, setConfigFromSolve, selectSolve, selectSolveById, editSolve,
    handleRemoveSolves, editSessions
  };

  $: (useScramble || useMode || useProb) ? initScrambler(useScramble, useMode, useProb) : initScrambler();
  $: enableKeyboard = !scrambleOnly;

</script>

<svelte:window on:keyup={ handleKeyUp }></svelte:window>

<main class={"w-full pt-14 " + (scrambleOnly || timerOnly ? 'h-auto' : 'h-[calc(100vh-3rem)]')}>
  {#if timerOnly || scrambleOnly }
    <TimerTab { timerOnly } { scrambleOnly } { context } { battle } { enableKeyboard } />
  {:else if battle}
    <TimerTab { cleanOnScramble } { context } { battle } { enableKeyboard }
      on:solve={ (s) => dispatch("solve", s.detail) }
      on:update={ (s) => dispatch("solve", s.detail) }
    />
  {:else}
    <div class="fixed w-max -translate-x-1/2 left-1/2 z-10 grid grid-flow-col
      gap-2 top-14 items-center justify-center text-gray-400">
      
      {#if !$screen.isMobile}
        <button on:click={ editSessions } class="cursor-pointer"><TuneIcon width="1.2rem" height="1.2rem"/> </button>
        <Tooltip placement="left"> { $localLang.TIMER.manageSessions } </Tooltip>
      {/if}
      
      <Select
        placeholder={ $localLang.TIMER.selectSession }
        value={ $session } items={ sessions } label={ (s) => (s || {}).name } transform={ e => e }
        onChange={ (g) => { $session = g; selectedSession(); } }
      />

      {#if $tab === 0 && ($session.settings.sessionType || 'mixed') === 'mixed'}
        <Select
          placeholder={ $localLang.TIMER.selectGroup }
          value={ groups[$group] } items={ groups } transform={ e => e }
          onChange={ (g, p) => { $group = p || 0; selectedGroup(); } }
        />

        <Select
          placeholder={ $localLang.TIMER.selectMode }
          value={ $mode } items={ modes } label={ e => e[0] } transform={ e => e }
          onChange={ (g) => { $mode = g; selectedMode(true, true); } } hasIcon={ groups[$group] === "WCA" ? (v) => v[1] : null }
        />
      {/if}

      {#if filters.length > 0 && $tab === 0}
        <Select
          placeholder={ $localLang.TIMER.selectFilter }
          value={ $prob } items={ filters } label={ e => e.toUpperCase() } transform={ (i, p) => p }
          onChange={ (i, p) => { $prob = p || 0; selectedFilter(); } }
        />
      {/if}
    </div>

    <TabGroup bind:this={ tabs } class="h-full" onChange={ t => $tab = (t || 0) }>
      <Tab name="" icon={ TimerIcon } ariaLabel={ $localLang.TIMER.timerTab }>
        <TimerTab { context }/>
      </Tab>
      <Tab name="" icon={ ListIcon } ariaLabel={ $localLang.TIMER.sessionsTab }>
        <SessionsTab bind:this={ sessionsTab } { context }/>
      </Tab>
      <Tab name="" icon={ ChartIcon } ariaLabel={ $localLang.TIMER.chartsTab }>
        <StatsTab { context }/>
      </Tab>
    </TabGroup>
  {/if}

  {#if !timerOnly}
    <Modal bind:open={ openEdit } on:close={ handleClose } outsideclose
      title={ $localLang.TIMER.manageSessions } size="md" class="max-w-2xl grid">

      {#if creatingSession}
        <div class="flex flex-col items-center min-h-[12rem] gap-4">
          <Select
            items={ SESSION_TYPE }
            label={ e => $localLang.TIMER.sessionTypeMap[e] }
            transform={ e => e }
            bind:value={ newSessionType }
            class="mx-auto"
          />

          <i class="note text-gray-300">{ $localLang.TIMER.sessionTypeDescription[newSessionType] }</i>

          {#if newSessionType != 'mixed'}
            <div class="flex flex-wrap gap-2 justify-center">
              <Select class="min-w-[8rem]"
                placeholder={ $localLang.TIMER.selectGroup }
                bind:value={ newSessionGroup } items={ groups } transform={ (_, p) => p }
              />
  
              <Select class="min-w-[8rem]"
                placeholder={ $localLang.TIMER.selectMode }
                bind:value={ newSessionMode } items={ MENU[newSessionGroup][1] }
                label={ e => e[0] } transform={ (_, p) => p }
              />
            </div>
          {/if}
          
          <div class="flex flex-wrap gap-2 justify-center">
            <div class="flex items-center justify-center gap-2">
              <span>{ $localLang.global.name }</span>

              <Input
                focus={ creatingSession }
                class="bg-gray-600 text-gray-200 flex-1 max-w-[20ch]"
                bind:value={ newSessionName } on:keyup={ handleInputKeyUp }/>
            </div>

            {#if newSessionType === 'multi-step'}
              <div class="flex items-center justify-center gap-2">
                <span>{ $localLang.global.steps }</span>

                <Input
                  class="bg-gray-600 text-gray-200 flex-1 max-w-[10ch]"
                  inpClass="text-center" type="number" min={2} max={10}
                  bind:value={ newSessionSteps } on:keyup={ handleInputKeyUp }
                  on:change={ _ => stepNames = [ ...stepNames, ...(new Array(newSessionSteps).fill('')) ].slice(0, newSessionSteps) }
                  />
              </div>
            {/if}
          </div>

          {#if newSessionType === 'multi-step'}
            <div class="flex flex-col gap-2 justify-center">
              <h2 class="text-xl text-gray-300 text-center">{ $localLang.TIMER.stepNames }</h2>
              
              <ul class="flex flex-wrap justify-center items-center gap-2">
                {#each stepNames as sn, p (p)}
                  <li class="w-20">
                    <Input style={`border-color: ${STEP_COLORS[p]}; border-width: .15rem;`}
                      placeholder={ $localLang.global.step + ' ' + (p + 1) } bind:value={ sn }/>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {:else}
        <div class="grid gap-2 m-2 mt-4"
          style="grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));">
          {#each sessions as s}
            <button class={"grid h-max border border-gray-400 rounded-md relative " + (s.icon ? 'pl-8' : '')} on:click={() => {
              sessions.forEach(s1 => s1.editing = false);
              s.editing = true;
            }}>
              
              {#if s.icon}
                <span class="absolute bg-purple-700 p-[.05rem] rounded-sm text-white
                  left-[.5rem] top-1/2 -translate-y-1/2">
                  <WcaCategory icon={ s.icon.icon } size="1rem" buttonClass="!p-[.1rem]"/>
                </span>
              {/if}

              <Input
                class="!bg-transparent text-center text-ellipsis w-full rounded-none flex-1 { !s.editing ? 'border-transparent' : '' }"
                bind:value={ s.tName } focus={ s.editing } on:keydown={ (e) => {
                  switch ( e.code ) {
                    case 'Enter': {
                      s.editing = false; renameSession(s);
                      break;
                    }
                    case 'Escape': {
                      s.editing = false; e.stopPropagation();
                      // @ts-ignore
                      e.target.blur();
                      break;
                    }
                  }
                }}/>
              <div class="flex items-center justify-center">
                {#if s.editing && !creatingSession}
                  <button tabindex="0" class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                    on:click|stopPropagation={ (ev) => renameSession(s) }>
                    <CheckIcon size="1.2rem"/>
                  </button>
                  <button tabindex="0" class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                    on:click|stopPropagation={() => s.editing = false}>
                    <CloseIcon size="1.2rem"/>
                  </button>
                  <button tabindex="0" class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500" on:click|stopPropagation={() => {
                    sSession = s;
                    showDeleteSession = true;
                  }}>
                    <DeleteIcon size="1.2rem"/>
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
            <Button color="alternative" on:click={ closeAddSession }>{ $localLang.global.cancel }</Button>
            <Button on:click={ newSession }>
              { $localLang.global.save }
            </Button>
          </div>
        {:else}
          <Button type="button" ariaLabel={ $localLang.TIMER.addNewSession }
            on:click={ openAddSession } class="mx-auto flex">
            <PlusIcon /> { $localLang.TIMER.addNewSession }
          </Button>
        {/if}
      </svelte:fragment>
    </Modal>
  {/if}

  <Modal bind:open={ showDeleteSession } size="xs" autoclose outsideclose>
    <h1 class="text-gray-400 mb-4 text-lg">{ $localLang.TIMER.removeSession }</h1>
    <div class="flex justify-evenly">
      <Button color="alternative" ariaLabel={ $localLang.global.cancel }>
        { $localLang.global.cancel }
      </Button>
      
      <Button color="red" ariaLabel={ $localLang.global.delete }
        on:click={ () => deleteSessionHandler(true) }>
        { $localLang.global.delete }
      </Button>
    </div>
  </Modal>
</main>