<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { generateCubeBundle } from '@helpers/cube-draw';
  import { derived, writable, type Readable, type Unsubscriber } from 'svelte/store';
  
  /// Modules
  import * as all from '@cstimer/scramble';
  import { solve_cross, solve_xcross } from '@cstimer/tools/cross';
  import JSConfetti from 'js-confetti';
  
  /// Data
  import { isNNN, SessionDefaultSettings, type SCRAMBLE_MENU } from '@constants';
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
  import { getUpdatedStatistics } from '@helpers/statistics';
  import { timer } from '@helpers/timer';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { NotificationService } from '@stores/notification.service';
  
  export let battle = false;
  export let useScramble = '';
  export let useMode = '';
  export let useProb: number = -1;
  export let genScramble = true;
  export let enableKeyboard = true;
  export let timerOnly = false;
  export let scrambleOnly = false;

  let MENU: SCRAMBLE_MENU[] = [];
  let groups: string[] = [];
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => {
    let l = getLanguage( $lang );
    MENU = l.MENU;
    groups = MENU.map(e => e[0]);
    selectedGroup(false);

    let allModes = MENU.reduce((acc: string[], e) => [ ...acc, ...e[1].map(e1 => e1[1]) ], []);

    // console.log("Empty modes: ", allModes.filter( m => !all.pScramble.scramblers.has(m) ));

    return l;
  });

  const INITIAL_STATISTICS: Statistics = {
    best: { value: 0, better: false, prev: Infinity },
    worst: { value: 0, better: false },
    count: { value: 0, better: false },
    time: { value: 0, better: false },
    avg: { value: 0, better: false },
    dev: { value: 0, better: false },
    Mo3: { value: -1, better: false },
    Ao5: { value: -1, better: false },
    Ao12: { value: -1, better: false },
    Ao50: { value: -1, better: false },
    Ao100: { value: -1, better: false },
    Ao200: { value: -1, better: false },
    Ao500: { value: -1, better: false },
    Ao1k: { value: -1, better: false },
    Ao2k: { value: -1, better: false },

    NP:    { value: 0, better: false },
    P2:    { value: 0, better: false },
    DNS:   { value: 0, better: false },
    DNF:   { value: 0, better: false },
    counter: { value: 0, better: false },
  };

  /// SERVICES
  const dataService = DataService.getInstance();
  const notService = NotificationService.getInstance();

  /// GENERAL
  let modes: { 0: string, 1: string, 2: number }[] = [];
  let filters: string[] = [];
  let sessions: Session[] = [];  
  let subs: Unsubscriber[] = [];
  let tabs: TabGroup;
  let dispatch = createEventDispatcher();
  let sessionsTab: SessionsTab;
  
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
    $stats = getUpdatedStatistics($stats, $solves, $session, inc);

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
        key: crypto.randomUUID(),
      });

      confetti.addConfetti({
        confettiNumber: 100,
        confettiColors: [ '#009d54', '#3d81f6', '#ffeb3b' ]
      });
    }

  }

  function updateSolves() {
    $solves = $allSolves.filter(s => s.session === ($session || {})._id);
    let arr = [];

    for (let i = 0, j = 0, maxi = $solves.length; i < maxi && j < 4; i += 1) {
      if ( $solves[i].penalty != Penalty.DNF ) {
        arr.push( $solves[i].time );
        j += 1;
      }
    }

    if ( arr.length === 4 ) {
      arr.sort();
      let sum = arr.reduce((ac, e) => ac + e, 0);
      $Ao5 = [ ( sum - arr[3] ) / 3, ( sum - arr[0] ) / 3 ].sort((a, b) => a - b);
    } else {
      $Ao5 = [];
    }
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
    } as PuzzleOptions);

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
    if ( !$mode ) {
      $mode = MENU[ $group || 0 ][1][0];
    }

    let md = useMode || _mode || $mode[1];
    let s = useScramble || scr;
    let pb = useProb || _prob || $prob;
    
    if ( !genScramble ) {
      $scramble = scr || useScramble;
    } else {
      $scramble = (s) ? s : (all.pScramble.scramblers.get(md) as any).apply(null, [
        md, Math.abs($mode[2]), pb < 0 ? undefined : pb
      ]).replace(/\\n/g, '<br>').trim();
    }

    if ( isNNN(md) ) {
      $scramble = ScrambleParser.parseNNNString($scramble);
    }

    const dialogModes = ["333", "333fm" ,"333oh" ,"333o" ,"easyc" ,"333ft"];

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

  onMount(() => {
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
                s._id = d._id;
                updateSolves();
              }
              break;
            }
            case 'remove-solves': {
              let ids = <Solve[]> data.data;
              for (let i = $allSolves.length - 1; i >= 0; i -= 1) {
                ids.indexOf($allSolves[i]._id) > -1 && $allSolves.splice(i, 1);
              }
              setSolves();
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
              sessions = sessions;
              break;
            }
            case 'add-session': {
              let ns = <Session> data.data;
              ns.tName = ns.name;
              sessions = [ ...sessions, ns ];
              $session = ns;
              selectedSession();
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
    bluetoothList,
    sortSolves, updateStatistics, initScrambler, selectedGroup,
    setConfigFromSolve, selectSolve, selectSolveById, editSolve
  };

  $: (useScramble || useMode) ? initScrambler(useScramble, useMode) : initScrambler();
  $: enableKeyboard = !scrambleOnly;

</script>

<svelte:window on:keyup={ handleKeyUp }></svelte:window>

<main class={"w-full " + (scrambleOnly || timerOnly ? 'h-auto' : 'h-full')}>
  {#if timerOnly || scrambleOnly }
    <TimerTab { timerOnly } { scrambleOnly } { context } { battle } { enableKeyboard } />
  {:else if battle}
    <TimerTab
      { context } { battle } { enableKeyboard }
      on:solve={ (s) => dispatch("solve", s.detail) }
      on:update={ (s) => dispatch("solve", s.detail) }
    />
  {:else}
    <div class="fixed w-max -translate-x-1/2 left-1/2 z-10 grid grid-flow-col
      gap-2 top-12 items-center justify-center text-gray-400">
      <Tooltip text={ $localLang.TIMER.manageSessions }>
        <span on:click={ editSessions } class="cursor-pointer"><TuneIcon width="1.2rem" height="1.2rem"/> </span>
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
    <Modal show={ openEdit } onClose={ handleClose }>
      <Button ariaLabel={ $localLang.TIMER.addNewSession }
        on:click={ openAddSession }>
        <PlusIcon /> { $localLang.TIMER.addNewSession }
      </Button>
      
      <div class="grid">
        {#if creatingSession}
          <div class="flex">
            <Input
              focus={ creatingSession }
              class="bg-gray-600 text-gray-200 flex-1"  
              bind:value={ newSessionName } on:keyup={ (e) => handleInputKeyUp(e) }/>
            <div class="flex mx-2 flex-grow-0 w-10 items-center justify-center">
              <span tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ newSession }>
                <CheckIcon width="100%" height="100%"/>
              </span>
              <span tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ closeAddSession }>
                <CloseIcon width="100%" height="100%"/>
              </span>
            </div>
          </div>
        {/if}

        {#each sessions as s}
          <div class="flex">
            <Input
              disabled={ !s.editing }
              class="bg-transparent text-gray-400 flex-1 { !s.editing ? 'border-transparent' : '' }"  
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
            <div class="flex mx-2 flex-grow-0 w-10 items-center justify-center">
              {#if !s.editing && !creatingSession}
                <span tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={() => {
                  sessions.forEach(s1 => s1.editing = false);
                  s.editing = true;
                }}>
                  <PencilIcon width="100%" height="100%"/>
                </span>
                <span tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={() => deleteSession(s)}>
                  <DeleteIcon width="100%" height="100%"/>
                </span>
              {/if}

              {#if s.editing && !creatingSession}
                <span tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ () => renameSession(s) }>
                  <CheckIcon width="100%" height="100%"/>
                </span>
                <span tabindex="0" class="text-gray-400 w-8 h-8 cursor-pointer" on:click={() => s.editing = false}>
                  <CloseIcon width="100%" height="100%"/>
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Modal>
  {/if}
</main>