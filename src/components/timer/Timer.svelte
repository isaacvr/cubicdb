<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { generateCubeBundle } from '@helpers/cube-draw';
  import { derived, writable, type Readable, type Unsubscriber, readable } from 'svelte/store';
  
  /// Modules
  import * as all from '@cstimer/scramble';
  import { solve_cross, solve_xcross } from '@cstimer/tools/cross';
  import JSConfetti from 'js-confetti';
  
  /// Data
  import { isNNN, SessionDefaultSettings, type SCRAMBLE_MENU, AON } from '@constants';
  import { DataService } from '@stores/data.service';
  
  /// Components
  import TabGroup from '@material/TabGroup.svelte';
  import Tab from '@material/Tab.svelte';
  import TimerTab from './TimerTab.svelte';
  import SessionsTab from './SessionsTab.svelte';
  import StatsTab from './StatsTab.svelte';
  import Tooltip from '@components/material/Tooltip.svelte';
  import Modal from '@components/Modal.svelte';
  import Button from '@components/material/Button.svelte';
  import Input from '@components/material/Input.svelte';
  import Select from '@components/material/Select.svelte';

  /// Icons
  import TimerIcon from '@icons/Timer.svelte';
  import ListIcon from '@icons/FormatListBulleted.svelte';
  import ChartIcon from '@icons/ChartLineVariant.svelte';
  import TuneIcon from '@icons/Tune.svelte';
  import PlusIcon from '@icons/Plus.svelte';
  import CheckIcon from '@icons/Check.svelte';
  import CloseIcon from '@icons/Close.svelte';
  import PencilIcon from '@icons/Pencil.svelte';
  import DeleteIcon from '@icons/Delete.svelte';
  
  /// Types
  import { TimerState, type Solve, type Session, Penalty, type Statistics, type TimerContext, type PuzzleOptions, type Language, type BluetoothDeviceData } from '@interfaces';
  import { Puzzle } from '@classes/puzzle/puzzle';
  import { PX_IMAGE } from '@constants';
  import { ScrambleParser } from '@classes/scramble-parser';
  import { INITIAL_STATISTICS, getUpdatedStatistics, statsReplaceId } from '@helpers/statistics';
  import { infinitePenalty, timer } from '@helpers/timer';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { NotificationService } from '@stores/notification.service';
  import { randomUUID } from '@helpers/strings';
  import { binSearch } from '@helpers/object';

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
  let subs: Unsubscriber[] = [];
  let tabs: TabGroup;
  let dispatch = createEventDispatcher();
  let sessionsTab: SessionsTab;
  let mounted = false;
  
  /// MODAL
  let openEdit = false;
  let creatingSession = false;
  let newSessionName = "";
  
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
  let AoX = writable<number>(100);
  let stats = writable<Statistics>(INITIAL_STATISTICS);
  let scramble = writable<string>();
  let group = writable<number>();
  let mode = writable<{ 0: string, 1: string, 2: number }>();
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
          name: e[0],
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
    $solves.length > 0 && setConfigFromSolve($solves[0], rescramble);
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

  function handleInputKeyUp(ce: any) {
    if ( !enableKeyboard ) return;
   
    const e = ce.detail;

    if ( e.key === 'Enter' ) {
      newSession();
    } else if ( e.key === 'Escape' ) {
      closeAddSession();
    }
    e.stopPropagation();
  }

  function updateImage(md: string) {
    let cb = Puzzle.fromSequence( $scramble, {
      ...all.pScramble.options.get(md),
      rounded: true,
      headless: true
    } as PuzzleOptions, false, false);

    generateCubeBundle([cb], 500).then(gen => {
      let subsc = gen.subscribe((c: any) => {
        if (c === '__initial__') return;

        if ( c === null ) {
          subsc();
        } else {
          $preview = c;
        }
      });
    });
  }

  export function initScrambler(scr?: string, _mode ?: string, _prob ?: number) {
    if ( !mounted ) return;

    if ( !$mode ) {
      $mode = MENU[ $group || 0 ][1][0];
    }

    let md = useMode || _mode || $mode[1];
    let len = useLen || $mode[2];
    let s = useScramble || scr;
    let pb = useProb || _prob || $prob;
    
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

    const dialogModes = ["333", "333fm" ,"333oh" ,"333o" ,"easyc" ,"333ft", "edges", "corners", "2gen", "2genl"];

    if ( dialogModes.indexOf(md) > -1 ) {
      $cross = solve_cross($scramble).map(e => e.map(e1 => e1.trim()).join(' '))[0];
      $xcross = solve_xcross($scramble, 0).map(e => e.trim()).join(' ');
      // $hintDialog = true;
    } else {
      $cross = "";
      $xcross = "";
      $hint = false;
      // $hintDialog = false;
    }

    if ( all.pScramble.options.has(md) && $session?.settings?.genImage ) {
      updateImage(md);
    } else {
      $preview = PX_IMAGE;
    }
  }

  function selectedFilter(rescramble = true) {
    rescramble && initScrambler();
  }

  function selectedMode(rescramble = true) {
    filters = all.pScramble.filters.get($mode[1]) || [];
    $prob = -1;
    selectedFilter(rescramble);
  }

  function selectedGroup(rescramble = true) {
    if ( !MENU.length || !$group ) return;

    modes = MENU[ $group ][1];
    $mode = modes[0];
    selectedMode(rescramble);
  }

  function selectedSession() {
    localStorage.setItem('session', $session._id);
    restartStats();
    setSolves();
  }

  function newSession() {
    let name = newSessionName.trim();

    if ( name != '' ) {
      dataService.addSession({ _id: '', name, settings: Object.assign({}, SessionDefaultSettings) });
      closeAddSession();
    }
  }

  function deleteSession(s: Session) {
    if ( confirm('Do you really want to remove this session? You will loose all the solves in the session.') ) {
      dataService.removeSession(s);
    }
  }

  function renameSession(s: Session) {
    s.editing = false;

    if ( s.tName?.trim() === '' ) {
      return;
    }

    dataService.updateSession({ _id: s._id, name: s.tName?.trim() || "Session -", settings: s.settings });
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

  onMount(() => {
    mounted = true;

    if ( timerOnly && scrambleOnly ) {
      timerOnly = scrambleOnly = false;
    }

    if ( !(battle || timerOnly || scrambleOnly) ) {
      subs = [
        dataService.solveSub.subscribe((data) => {
          if ( !data || !data.data ) {
            return;
          }
          switch(data.type) {
            case 'get-solves': {
              $allSolves = <Solve[]> data.data;
              setSolves();
              break;
            }
            case 'add-solve': {
              let d = (data.data as Solve[])[0];
              let s = $allSolves.find(s => s.date === d.date);

              if (s) {
                statsReplaceId($stats, s._id, d._id);
                s._id = d._id;
                updateSolves();
              }
              break;
            }
            case 'remove-solves': {
              let ids = <Solve[]> data.data;
              let ss = $solves;
              let sl = ss.length;

              let as = $allSolves;

              for(let i = 0, maxi = ids.length; i < maxi; i += 1) {
                let pos1 = binSearch<Solve>(ids[i], ss, (a: Solve, b: Solve) => b.date - a.date);
                let pos2 = binSearch<Solve>(ids[i], as, (a: Solve, b: Solve) => b.date - a.date);

                if ( pos1 > -1 ) {
                  ss.splice(pos1, 1);
                }
                
                if ( pos2 > -1 ) {
                  as.splice(pos2, 1);
                }
              }
              
              if ( ss.length != sl ) {
                $stats = INITIAL_STATISTICS;
                setSolves();
              }

              break;
            }
            case 'update-solve': {
              let updatedSolve = <Solve> data.data;
              if ( updatedSolve ) {
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
              break;
            }
          }
        }),
        dataService.sessSub.subscribe((data) => {
          if ( !data || !data.data ) return;

          switch ( data.type ) {
            case 'get-sessions': {
              sessions = (<Session[]> data.data).map(s => { s.tName = s.name; return s; });

              if ( sessions.length === 0 ) {
                newSessionName = 'Session 1';
                newSession();
                return;
              }

              let ss = localStorage.getItem('session');
              let currentSession = sessions.find(s => s._id === ss);
              $session = currentSession || sessions[0];
              selectedSession();
              sortSessions();
              break;
            }
            case 'rename-session':
            case 'update-session': {
              let session = <Session> data.data;
              let updatedSession = sessions.find(s => s._id === session._id);
              if ( updatedSession ) {
                updatedSession.name = session.name;
                updatedSession.settings = session.settings;
              }
              sortSessions();
              break;
            }
            case 'add-session': {
              let ns = <Session> data.data;
              ns.tName = ns.name;
              sessions = [ ...sessions, ns ];
              $session = ns;
              selectedSession();
              sortSessions();
              break;
            }
            case 'remove-session': {
              let s = <Session> data.data;
              sessions = sessions.filter(s1 => s1._id != s._id);

              if ( sessions.length === 0 ) {
                newSessionName = 'Session 1';
                newSession();
                return;
              }

              if ( s._id === $session._id ) {
                $session = sessions[0];
              }
              sortSessions();
              break;
            }
          }
        }),
        dataService.bluetoothSub.subscribe((data) => {
          if ( !data ) return;

          switch(data.type) {
            case 'device-list': {
              let list = data.data as BluetoothDeviceData[];
              $bluetoothList = list.map(dv => ({
                deviceId: dv.deviceId,
                deviceName: ( dv.deviceName.endsWith(`(${dv.deviceId})`) ) ? dv.deviceId : dv.deviceName,
                connected: false
              }));
              break;
            }
          }
        }),
      ];

      dataService.getSessions();
      dataService.getSolves();
    }
  });

  onDestroy(() => {
    subs.forEach(s => s());
  });

  let context: TimerContext = {
    state, ready, tab, solves, allSolves, session, Ao5, AoX, stats, scramble, decimals,
    group, mode, hintDialog, hint, cross, xcross, preview, prob, isRunning, selected,
    bluetoothList, bluetoothStatus, STATS_WINDOW,
    sortSolves, updateStatistics, initScrambler, selectedGroup,
    setConfigFromSolve, selectSolve, selectSolveById, editSolve
  };

  $: (useScramble || useMode || useProb) ? initScrambler(useScramble, useMode, useProb) : initScrambler();
  $: enableKeyboard = !scrambleOnly;

</script>

<svelte:window on:keyup={ handleKeyUp }></svelte:window>

<main class={"w-full " + (scrambleOnly || timerOnly ? 'h-auto' : 'h-full')}>
  {#if timerOnly || scrambleOnly }
    <TimerTab { timerOnly } { scrambleOnly } { context } { battle } { enableKeyboard } />
  {:else if battle}
    <TimerTab { cleanOnScramble } { context } { battle } { enableKeyboard }
      on:solve={ (s) => dispatch("solve", s.detail) }
      on:update={ (s) => dispatch("solve", s.detail) }
    />
  {:else}
    <div class="fixed w-max -translate-x-1/2 left-1/2 z-10 grid grid-flow-col
      gap-2 top-12 items-center justify-center text-gray-400">
      <Tooltip text={ $localLang.TIMER.manageSessions }>
        <button on:click={ editSessions } class="cursor-pointer"><TuneIcon width="1.2rem" height="1.2rem"/> </button>
      </Tooltip>
      
      <Select class="min-w-[8rem]"
        placeholder={ $localLang.TIMER.selectSession }
        value={ $session } items={ sessions } label={ (s) => (s || {}).name } transform={ e => e }
        onChange={ (g) => { $session = g; selectedSession(); } }
      />

      {#if $tab === 0}
        <Select class="min-w-[8rem]"
          placeholder={ $localLang.TIMER.selectGroup }
          value={ groups[$group] } items={ groups } transform={ e => e }
          onChange={ (g, p) => { $group = p || 0; selectedGroup(); } }
        />

        <Select class="min-w-[8rem]"
          placeholder={[ $localLang.TIMER.selectMode ]}
          value={ $mode } items={ modes } label={ e => e[0] } transform={ e => e }
          onChange={ (g) => { $mode = g; selectedMode(); } }
          />
      {/if}

      {#if filters.length > 0 && $tab === 0}
        <Select class="min-w-[8rem]"
          placeholder={ $localLang.TIMER.selectFilter }
          value={ $prob } items={ filters } label={ e => e.toUpperCase() } transform={ (i, p) => p }
          onChange={ (i, p) => { $prob = p || 0; selectedFilter(); } }
        />
      {/if}
      
      {#if $tab === 2}
        <Input min={3} max={1000}
          class="hidden-markers bg-gray-700 rounded-md"
          type="number" bind:value={ $AoX } on:keyup={ e => e.detail.stopPropagation() }/>
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
    <Modal show={ openEdit } onClose={ handleClose } class="w-[min(40rem,100%)]">
      <Button ariaLabel={ $localLang.TIMER.addNewSession }
        on:click={ openAddSession } class="mx-auto bg-blue-700 hover:bg-blue-600 text-gray-300">
        <PlusIcon /> { $localLang.TIMER.addNewSession }
      </Button>

      <div class="grid gap-2 m-2 mt-4 max-h-[min(80vh,25rem)] overflow-scroll"
        style="grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));">
        {#if creatingSession}
          <div class="flex">
            <Input
              focus={ creatingSession }
              class="bg-gray-600 text-gray-200 flex-1"  
              bind:value={ newSessionName } on:keyup={ (e) => handleInputKeyUp(e) }/>
            <div class="flex mx-2 flex-grow-0 w-10 items-center justify-center">
              <button tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ newSession }>
                <CheckIcon width="100%" height="100%"/>
              </button>
              <button tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ closeAddSession }>
                <CloseIcon width="100%" height="100%"/>
              </button>
            </div>
          </div>
        {/if}

        {#each sessions as s}
          <div class="grid border border-gray-400 rounded-md">
            <Input
              disabled={ !s.editing }
              class="bg-transparent text-gray-400 flex-1 { !s.editing ? 'border-transparent' : '' }"
              inpClass="text-center text-ellipsis" 
              bind:value={ s.tName } focus={ s.editing } on:keyup={ (e) => {
                switch ( e.detail.code ) {
                  case 'Enter': {
                    s.editing = false;
                    renameSession(s);
                    break;
                  }
                  case 'Escape': {
                    e.detail.stopPropagation();
                    s.editing = false;
                    break;
                  }
                }
              }}/>
            <div class="flex mx-2 items-center justify-center">
              {#if !s.editing && !creatingSession}
                <button tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer hover:text-blue-500" on:click={() => {
                  sessions.forEach(s1 => s1.editing = false);
                  s.editing = true;
                }}>
                  <PencilIcon size="1.2rem"/>
                </button>
                <button tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer hover:text-blue-500" on:click={() => deleteSession(s)}>
                  <DeleteIcon size="1.2rem"/>
                </button>
              {/if}

              {#if s.editing && !creatingSession}
                <button tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer hover:text-blue-500" on:click={ () => renameSession(s) }>
                  <CheckIcon size="1.2rem"/>
                </button>
                <button tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer hover:text-blue-500" on:click={() => s.editing = false}>
                  <CloseIcon size="1.2rem"/>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Modal>
  {/if}
</main>