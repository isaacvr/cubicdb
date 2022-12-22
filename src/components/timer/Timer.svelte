<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { generateCubeBundle } from '@helpers/cube-draw';
  import { writable } from 'svelte/store';
  
  /// Modules
  import * as all from '@cstimer/scramble';
  import { solve_cross, solve_xcross } from '@cstimer/tools/cross';
  
  /// Data
  import { MENU } from './TimerMenu';
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
  import { TimerState, AverageSetting, type Solve, type Session, Penalty, type Statistics, type TimerContext } from '@interfaces';
  import { Puzzle } from '@classes/puzzle/puzzle';
  

  const INITIAL_STATISTICS: Statistics = {
    best: { value: 0, better: false },
    worst: { value: 0, better: false },
    count: { value: 0, better: false },
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
    __counter: 0,
  };

  /// SERVICES
  const dataService = DataService.getInstance();

  /// GENERAL
  const groups = MENU.map((e, p) => e[0]);
  let modes: { 0: string, 1: string, 2: number }[] = [];
  let filters: string[] = [];
  let sessions: Session[] = [];  
  let subs = [];
  let tabs: TabGroup;
  
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
  let session = writable<Session>(null);
  let Ao5 = writable<number[]>(null);
  let AoX = writable<number>(100);
  let stats = writable<Statistics>(INITIAL_STATISTICS);
  let scramble = writable<string>();
  let group = writable<number>();
  let mode = writable<{ 0: string, 1: string, 2: number }>();
  let hintDialog = writable<boolean>();
  let hint = writable<boolean>();
  let cross = writable<string[]>();
  let xcross = writable<string>();
  let preview = writable<string>("");
  let prob = writable<number>(null);
  // let calcAoX = writable<AverageSetting>(AverageSetting.SEQUENTIAL);
        
  function getAverage(n: number, arr: Solve[], calc: AverageSetting): number[] {
    let res = [];
    let len = arr.length - 1;
    let elems = [];
    let disc = (n === 3) ? 0 : Math.ceil(n * 0.05);
 
    for (let i = 0, maxi = len; i <= maxi; i += 1) {
      if ( arr[len - i].penalty === Penalty.DNF ) {
        res.push(null);
        continue;
      }

      elems.push( arr[len - i].time );
      if ( elems.length < n ) {
        res.push(null);
      } else {
        let e1 = elems.map(e => e).sort((a, b) => a - b);
        let sumd = e1.reduce((s, e, p) => {
          return (p >= disc && p < n - disc) ? s + e : s;
        }, 0);
        
        res.push( sumd / (n - disc * 2) );

        calc === AverageSetting.GROUP && (elems.length = 0);
        calc === AverageSetting.SEQUENTIAL && elems.shift();
      }
    }

    return res;
  }

  function setConfigFromSolve(s: Solve) {
    $group = s.group || 0;
    let menu = MENU[ $group ];
    modes = menu[1];
    $mode = ( typeof s.group != 'undefined' ) ? menu[1].filter(m => m[1] === s.mode)[0] : menu[1][0];
    $prob = s.prob;
  }

  function updateStatistics(inc ?: boolean) {
    let AON = [ 3, 5, 12, 50, 100, 200, 500, 1000, 2000 ];
    let AVG = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    let BEST = AVG.map(_ => 1/0);
    let len = $solves.length;
    let sum = 0, avg = 0, dev = 0;
    let bw = $solves.reduce((ac: number[], e) => {
      if ( e.penalty === Penalty.DNF ) {
        len -= 1;
      } else {
        sum += e.time;
      }
      return ( e.penalty === Penalty.DNF ) ? ac : [ Math.min(ac[0], e.time), Math.max(ac[1], e.time) ];
    }, [Infinity, 0]);

    avg = (len > 0) ? sum / len : null;
    dev = (len > 0) ? Math.sqrt( $solves.reduce((acc, e) => {
      return e.penalty === Penalty.DNF ? acc : (acc + (e.time - avg)**2 / len);
    }, 0) ) : null;
    
    for (let i = 0, maxi = AON.length; i < maxi; i += 1) {
      let avgs = getAverage(AON[i], $solves, $session?.settings?.calcAoX);
      BEST[i] = avgs.reduce((b, e) => (e) ? Math.min(b, e) : b, BEST[i]);
      let lastAvg = avgs.pop();
      AVG[i] = ( lastAvg ) ? lastAvg : -1;
    }

    let ps = Object.assign({}, $stats);

    $stats = {
      best:  { value: bw[0], better: ps.best.value > bw[0] },
      worst: { value: bw[1], better: false },
      avg:   { value: avg, better: false },
      dev:   { value: dev, better: false },
      count: { value: $solves.length, better: false },
      Mo3:   { value: AVG[0], better: AVG[0] <= BEST[0] },
      Ao5:   { value: AVG[1], better: AVG[1] <= BEST[1] },
      Ao12:  { value: AVG[2], better: AVG[2] <= BEST[2] },
      Ao50:  { value: AVG[3], better: AVG[3] <= BEST[3] },
      Ao100: { value: AVG[4], better: AVG[4] <= BEST[4] },
      Ao200: { value: AVG[5], better: AVG[5] <= BEST[5] },
      Ao500: { value: AVG[6], better: AVG[6] <= BEST[6] },
      Ao1k:  { value: AVG[7], better: AVG[7] <= BEST[7] },
      Ao2k:  { value: AVG[8], better: AVG[8] <= BEST[8] },
      __counter: (inc) ? ps.__counter + 1 : ps.__counter,
    };

    if ( $stats.best.better && ps.best.value != Infinity ) {
      // ripple.launch({
      //   centered: true,
      //   color: '#00ff0099'
      // });
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
      $Ao5 = null;
    }
  }

  function sortSolves() {
    $allSolves = $allSolves.sort((a, b) => b.date - a.date);
    updateSolves();
  }

  function setSolves() {
    sortSolves();
    updateStatistics(true);
    $solves.length > 0 && setConfigFromSolve($solves[0]);
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
    if ( $state === TimerState.CLEAN || $state === TimerState.STOPPED ) {
      if ( e.key === 'ArrowRight' ) { tabs.nextTab(); }
      else if ( e.key === 'ArrowLeft' ) { tabs.prevTab(); }
    }
  }

  function handleInputKeyUp(ce: any) {
    const e = ce.detail;
    e.stopPropagation();
    if ( e.key === 'Enter' ) {
      newSession();
    } else if ( e.key === 'Escape' ) {
      closeAddSession();
    }
  }

  function initScrambler(scr?: string, _mode ?: string) {
    $scramble = null;
    $hintDialog = false;

    setTimeout(() => {
      let md = (_mode) ? _mode : $mode[1];

      $scramble = (scr) ? scr : all.pScramble.scramblers.get(md).apply(null, [
        md, Math.abs($mode[2]), $prob < 0 ? undefined : $prob
      ]).replace(/\\n/g, '<br>').trim();

      let modes = ["333", "333fm" ,"333oh" ,"333o" ,"easyc" ,"333ft"];

      if ( modes.indexOf(md) > -1 ) {
        $cross = solve_cross($scramble).map(e => e.map(e1 => e1.trim()).join(' '))[0];
        $xcross = solve_xcross($scramble, 0).map(e => e.trim()).join(' ');
        $hintDialog = true;
      } else {
        $hint = false;
        $hintDialog = false;
      }

      if ( all.pScramble.options.has(md) ) {
        let cb = Puzzle.fromSequence( $scramble, { ...all.pScramble.options.get(md), headless: true } );
        
        let subscr = generateCubeBundle([cb], 500).subscribe((res: string) => {
          if ( res !== null ) {
            $preview = res;
          } else {
            setTimeout(() => subscr());
          }
        });
      }
    }, 10);
  }

  function selectedFilter() {
    initScrambler();
  }

  function selectedMode() {
    filters = all.pScramble.filters.get($mode[1]) || [];
    $prob = -1;
    selectedFilter();
  }

  function selectedGroup() {
    modes = MENU[ $group ][1];
    $mode = modes[0];
    selectedMode();
  }

  function selectedSession() {
    localStorage.setItem('session', $session._id);
    setSolves();
  }

  function newSession() {
    let name = newSessionName.trim();

    if ( name != '' ) {
      dataService.addSession({ _id: null, name, settings: {
        hasInspection: true,
        showElapsedTime: true,
        inspection: 15,
        calcAoX: AverageSetting.SEQUENTIAL,
      } });
      closeAddSession();
      selectedSession();
    }
  }

  function deleteSession(s: Session) {
    if ( confirm('Do you really want to remove this session? You will loose all the solves in the session.') ) {
      dataService.removeSession(s);
    }
  }

  function renameSession(s: Session) {
    s.editing = false;

    if ( s.tName.trim() === '' ) {
      return;
    }
    dataService.updateSession({ _id: s._id, name: s.tName.trim(), settings: s.settings });
  }

  onMount(() => {
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
            let s = $allSolves.find(s => s.date === data.data[0].date);
            s._id = data.data[0]._id;
            updateSolves();
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
                  break;
                }
              }
              setSolves();
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
            let ss = localStorage.getItem('session');
            let currentSession = sessions.find(s => s._id === ss);
            $session = currentSession || sessions[0];
            localStorage.setItem('session', $session._id);
            setSolves();
            localStorage.setItem('session', $session._id); 
            break;
          }
          case 'rename-session':
          case 'update-session': {
            let session = <Session> data.data;
            let updatedSession = sessions.find(s => s._id === session._id);
            updatedSession.name = session.name;
            updatedSession.settings = session.settings;
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
            if ( s._id === $session._id ) {
              $session = sessions[0];
            }
            break;
          }
        }
      }),
    ];

    dataService.getSessions();
    dataService.getSolves();
  });

  onDestroy(() => {
    subs.forEach(s => s());
  });

  let context: TimerContext = {
    state, ready, tab, solves, allSolves, session, Ao5, AoX, stats, scramble,
    group, mode, hintDialog, hint, cross, xcross, preview, prob,
    sortSolves, updateStatistics, initScrambler, selectedGroup, setConfigFromSolve
  };

</script>

<svelte:window on:keyup={ handleKeyUp }></svelte:window>

<main>
  <div class="
    -translate-x-1/2 left-1/2
    fixed z-10 grid grid-flow-col gap-2 w-max top-12 items-center justify-center text-gray-400">
    <Tooltip text="Manage sessions">
      <span on:click={ editSessions } class="cursor-pointer"><TuneIcon width="1.2rem" height="1.2rem"/> </span>
    </Tooltip>
    
    <Select
      placeholder="Select session..."
      value={ $session } items={ sessions } label={ (s) => (s || {}).name } transform={ e => e }
      onChange={ (g) => { $session = g; selectedSession(); } }
    />

    {#if $tab === 0}
      <Select
        placeholder="Select group"
        value={ groups[$group] } items={ groups } transform={ e => e }
        onChange={ (g, p) => { $group = p; selectedGroup(); } }
      />

      <Select
        placeholder={['Select mode']}
        value={ $mode } items={ modes } label={ e => e[0] } transform={ e => e }
        onChange={ (g) => { $mode = g; selectedMode(); } }
        />
    {/if}

    {#if filters.length > 0 && $tab === 0}
      <Select
        placeholder="Select filter"
        value={ $prob } items={ filters } label={ e => e.toUpperCase() }
        onChange={ (p) => { $prob = p; selectedFilter(); } }
      />
    {/if}
    
    {#if $tab === 2}
      <Input min={3} max={100}
        class="hidden-markers bg-gray-700 rounded-md"
        type="number" bind:value={ $AoX } on:keyup={ e => e.detail.stopPropagation() }/>
    {/if}
  </div>

  <TabGroup bind:this={ tabs } class="absolute w-full" onChange={ t => $tab = t }>
    <Tab name="" icon={ TimerIcon }>
      <TimerTab { context }/>
    </Tab>
    <Tab name="" icon={ ListIcon }>
      <SessionsTab { context }/>
    </Tab>
    <Tab name="" icon={ ChartIcon }>
      <StatsTab { context }/>
    </Tab>
  </TabGroup>

  <Modal show={ openEdit } onClose={ handleClose }>
    <Button on:click={ openAddSession }> <PlusIcon /> Add new Session </Button>
    <div class="grid">
      {#if creatingSession}
        <div class="flex">
          <Input
            focus={ creatingSession }
            class="bg-gray-600 text-gray-200 flex-1"  
            bind:value={ newSessionName } on:keyup={ (e) => handleInputKeyUp(e) }/>
          <div class="flex mx-2 flex-grow-0 w-10 items-center justify-center">
            <span class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ newSession }>
              <CheckIcon width="100%" height="100%"/>
            </span>
            <span class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ closeAddSession }>
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
              <span class="text-gray-400 w-8 h-8 cursor-pointer" on:click={() => {
                sessions.forEach(s1 => s1.editing = false);
                s.editing = true;
              }}>
                <PencilIcon width="100%" height="100%"/>
              </span>
              <span class="text-gray-400 w-8 h-8 cursor-pointer" on:click={() => deleteSession(s)}>
                <DeleteIcon width="100%" height="100%"/>
              </span>
            {/if}

            {#if s.editing && !creatingSession}
              <span class="text-gray-400 w-8 h-8 cursor-pointer" on:click={ () => renameSession(s) }>
                <CheckIcon width="100%" height="100%"/>
              </span>
              <span class="text-gray-400 w-8 h-8 cursor-pointer" on:click={() => s.editing = false}>
                <CloseIcon width="100%" height="100%"/>
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </Modal>
</main>