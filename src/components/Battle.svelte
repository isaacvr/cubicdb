<script lang="ts">
  import { io, Socket } from 'socket.io-client';
  import { AverageSetting, type Game, type Language, type Solve } from "@interfaces";
  import Button from "@material/Button.svelte";
  import Input from "@material/Input.svelte";
  import Select from "@material/Select.svelte";
  import Timer from '@components/timer/Timer.svelte';
  import { infinitePenalty, timer } from '@helpers/timer';
  import * as all from '@cstimer/scramble';
  import { onDestroy, onMount } from 'svelte';
  import Tooltip from '@material/Tooltip.svelte';
  import EyeIcon from '@icons/Eye.svelte';
  import CloseIcon from '@icons/Close.svelte';
  import Checkbox from './material/Checkbox.svelte';
  import { getAverage } from '@helpers/statistics';
  import { derived, type Readable } from 'svelte/store';
  import type { SCRAMBLE_MENU } from '@constants';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';

  let MENU: SCRAMBLE_MENU[] = [];
  let groups: string[] = [];
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => {
    let l = getLanguage( $lang );
    MENU = l.MENU;
    groups = MENU.map(e => e[0]);
    return l;
  });

  type STATE = 'idle' | 'create' | 'join' | 'waiting' | 'play' | 'error' | 'gameover';
  const TITLE: Map<STATE, string> = new Map([
    [ 'idle', 'Cube battle!' ],
    [ 'create', 'Create a battle' ],
    [ 'join', 'Join a battle' ],
    [ 'waiting', 'Connecting...' ],
    [ 'play', 'Battle!' ],
    [ 'error', 'Error :(' ],
    [ 'gameover', 'Game Over' ],
  ]);

  let state: STATE = 'idle';
  let MODES = MENU[0][1];
  let socket: Socket;
  let checked = false;
  let ending = false;
  let socketServer = 'ws://192.168.17.93:8080/';

  let username = '';
  let gameID = '';
  let scramble = '';
  let game: Game = { players: [], observers: [], round: 0, started: false, total: 0 };
  let mode = '';
  let isCreator = false;
  let isObserver = false;
  let errorMsg = '';
  let round = -1;
  let locked = false;
  let eventList: string[] = [];

  function log(...args: any[]) {
    eventList.push( args.map(e => JSON.stringify(e, null, 2)).join(" ") );
    eventList = eventList;
  }

  function toState(s: STATE) {
    state = s;

    if ( s === 'idle' ) {
      setCO(false, false),
      gameID = '';
      mode = '333';
      round = -1;
      locked = false;
    }
  }

  function tryCreate() {
    username = username.trim();

    log('tryCreate', username, mode, socket.connected);

    if ( username && mode && socket.connected ) {
      socket.emit('CREATE', username);
      return true;
    }

    return false;
  }

  function tryJoin() {
    username = username.trim();

    log(checked ? 'Trying to observe' : 'Trying to join')

    if ( username && /^[0-9a-f]{8}$/.test(gameID) && socket.connected ) {
      socket.emit(checked ? 'LOOK' : 'JOIN', gameID, username);
      return true;
    }

    return false;
  }

  function setCO(cr: boolean, ob: boolean) {
    isCreator = cr;
    isObserver = ob;
  }

  function updateSolve(ev: CustomEvent) {
    locked = true;
    let s = ev.detail as Solve;
    
    log("SOLVE: ", s, infinitePenalty(s) ? Infinity : s.time, round);
    
    // Group field will be used to store the round
    if ( s.group === -1 ) {
      s.group = round;
    }

    socket.emit('TIME', infinitePenalty(s) ? Infinity : s.time, s.group);
  }

  function computeStats() {
    let pl = game.players;

    for (let i = 0, maxi = pl.length; i < maxi; i += 1) {
      let times = pl[i][1].times.map(t => t === null ? Infinity : t);

      pl[i][1].times[5] = getAverage(5, times, AverageSetting.SEQUENTIAL)[4] || Infinity;
      pl[i][1].times[6] = Math.min( ...times.slice(0, 5) );
      pl[i][1].times[7] = Math.max( ...times.slice(0, 5) );
    }

    game.players.sort((a, b) => a[1].times[5] - b[1].times[5]);
  }

  function exit() {
    if ( socket.connected ) {
      socket.emit('EXIT');
    }
  }

  function connect() {
    if ( socket?.connected ) {
      socket.disconnect();
    }

    socket = io(socketServer);
  }

  onMount(() => {
    connect();
    console['error'] = function(...args: any) {
      log(...args);
    }

    // Socket.IO config
    socket.on('connect', () => {
      log("CONNECTED");
    });

    socket.on('CREATED', (id) => {
      log("CREATED", id);
      gameID = id;
      toState('play'); setCO(true, false);
    });

    socket.on('JOINED',     () => { log('JOINED');    toState('play'); setCO(false, false); });
    socket.on('LOOKING',    () => { log('LOOKING');   toState('play'); setCO(false, true); });
    socket.on('GAME_OVER',  () => { log('GAME_OVER'); toState('gameover'); computeStats(); ending = false; });
    socket.on('EXIT',       () => { log('EXIT');      toState('idle'); });
    socket.on('GAME_DATA',  (g: Game) => { log('GAME_DATA', g); game = g; });
    socket.on('SCRAMBLE',   (scr: string) => { log('SCRAMBLE', scr); scramble = scr; });
    socket.on('TIMEOUT',    () => { log('TIMEOUT'); ending = true; });
    socket.on('NEXT_ROUND', () => {
      try {
        log('NEXT_ROUND');
        locked = false;
        round += 1;
        
        if ( isCreator ) {
          let sMode = MODES.find(m => m[1] === mode) as any;

          log('gen: ', mode, sMode);

          socket.emit('SCRAMBLE', (all.pScramble.scramblers.get(mode) as any).apply(null, [
            mode, Math.abs(sMode[2]), undefined]).replace(/\\n/g, '<br>').trim());
        }
      } catch(e) {
        log('ERROR: ', e);
      }
    });
    socket.on('REMATCH',    (g: Game) => { log('REMATCH'); toState('play')});

    // ERRORS
    socket.on('JOIN_ERROR', (err) => { log('JOIN_ERROR', err); errorMsg = err; toState('error') });
    socket.on('LOOK_ERROR', (err) => { log('LOOK_ERROR', err); errorMsg = err; toState('error') });
    socket.on('TIME_ERROR', (err) => { log('TIME_ERROR', err); errorMsg = err; toState('error') });

    socket.on('disconnect', () => { log('DISCONNECTED'); toState('idle') });
  });

  onDestroy(() => {
    socket.disconnect();
  });

</script>

<div class="container-mini bg-white bg-opacity-10 m-4 p-4 rounded-md pb-6 text-gray-400 relative">
  <h1 class="text-gray-300 text-3xl text-center mb-6">{ TITLE.get( state ) }</h1>

  {#if state === 'idle'}
    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('create') } class="bg-green-700 text-gray-300"> Create </Button>
      <Button on:click={ () => toState('join') } class="bg-blue-700 text-gray-300"> Join </Button>
    </div>
  {/if}

  {#if state === 'create'}
    <div class="max-w-xs justify-center mx-auto grid gap-4 grid-cols-3 mb-6">
      <span class="col-span-1 flex justify-end items-center">Name:</span>
      <div class="col-span-2"><Input bind:value={ username } size={50} focus={ true }/></div>
      
      <span class="col-span-1 flex justify-end items-center">Mode:</span>
      <div class="col-span-2">
        <Select bind:value={ mode } class="w-full" items={ MODES } label={ m => m[0] } transform={ m => m[1] }/>
      </div>
    </div>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
      <Button on:click={ () => tryCreate() && toState('waiting') } class="bg-blue-700 text-gray-300"> Create </Button>
    </div>
  {/if}

  {#if state === 'join'}
    <div class="max-w-xs justify-center mx-auto grid gap-4 grid-cols-3 mb-6">
      <span class="col-span-1 flex justify-end items-center">Name:</span>
      <div class="col-span-2"><Input bind:value={ username } size={50} focus={ true }/></div>

      <span class="col-span-1 flex justify-end items-center">Game ID:</span>
      <div class="col-span-2"><Input bind:value={ gameID } size={50}/></div>

      <span class="col-span-3 flex justify-center gap-2">
        <Checkbox { checked } on:change={ (e) => checked = e.detail.value }/> Join as observer
      </span>
    </div>
    <div class="flex items-center justify-center gap-4 my-6">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
      <Button on:click={ () => tryJoin() && toState('waiting') } class="bg-blue-700 text-gray-300"> Join </Button>
    </div>
  {/if}

  {#if state === 'waiting'}
    <h2 class="text-gray-300 text-2xl text-center mb-6">Waiting...</h2>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
    </div>
  {/if}

  {#if state === 'play'}
    <h2 class="text-gray-300 text-xl text-center mb-6">Game ID:
      <span class="bg-violet-700 text-gray-300 px-2 py-1 rounded-md">{ gameID }</span>
    </h2>

    <ul id="actions" class="absolute top-2 right-2 flex items-center gap-2">
      <li class="bg-gray-500 text-gray-300">
        <Tooltip position="top" text="Observers">
          <div class="flex items-center gap-1"><EyeIcon size="1.2rem" /> { game.observers.length }</div>
        </Tooltip>
      </li>
      <li class="bg-red-700 text-gray-300" on:click={ exit }>
        <Tooltip position="top" text="Exit">
          <div class="flex items-center"><CloseIcon size="1.2rem" /></div>
        </Tooltip>
      </li>
    </ul>

    {#if isCreator}
      {#if !game.started && game.players.length > 1}
        <Button
          on:click={ () => socket.emit('START') }
          class="bg-violet-700 text-gray-300 my-8 mx-auto"> Start! </Button>
      {:else}
        <span class="flex justify-center text-yellow-300">Share the game ID with your friends!</span>
      {/if}
    {/if}

    {#if game.started}
      <div class="h-96 rounded-md relative">
        <Timer
          on:solve={ updateSolve }
          battle={true}
          useScramble={ scramble }
          useMode={ mode }
          genScramble={ false }
          enableKeyboard={ !(locked || isObserver || ending) }
        />
      </div>
    {/if}

    {#if ending}
      <span class="flex justify-center text-yellow-300">Ending game...</span>
    {/if}
    <ul id="players">
      <li class="header"></li>
      <li class="header">Player</li>
      <li class="header">T1</li>
      <li class="header">T2</li>
      <li class="header">T3</li>
      <li class="header">T4</li>
      <li class="header">T5</li>

      {#each game.players as p, i}
        <li class="text-gray-300">{i + 1}</li>
        <li>{ p[1].name }</li>
        {#each [0, 1, 2, 3, 4] as t}
          <li>{ p[1].times[t] === null ? 'DNF' : p[1].times[t] ? timer(p[1].times[t], true) : '-' }</li>
        {/each}
      {/each}
    </ul>
  {/if}

  {#if state === 'gameover'}
    <ul id="players-gameover">
      <li class="header"></li>
      <li class="header">Player</li>
      <li class="header">T1</li>
      <li class="header">T2</li>
      <li class="header">T3</li>
      <li class="header">T4</li>
      <li class="header">T5</li>
      <li class="header">Ao5</li>
      <li class="header">Best</li>
      <li class="header">Worst</li>

      {#each game.players as p, i}
        <li class="header">{i + 1}</li>
        <li>{ p[1].name }</li>
        {#each [0, 1, 2, 3, 4] as t}
          <li>{ p[1].times[t] === null ? 'DNF' : p[1].times[t] ? timer(p[1].times[t], true) : '-' }</li>
        {/each}
        <li class="text-blue-400">{ timer(p[1].times[5], true) } </li>
        <li class="text-green-600">{ timer(p[1].times[6], true) } </li>
        <li class="text-orange-600">{ timer(p[1].times[7], true) } </li>
      {/each}
    </ul>

    <div class="flex items-center justify-center gap-4 w-full">
      {#if isCreator}
        <Button
          on:click={ () => socket.emit('REMATCH') }
          class="bg-violet-700 text-gray-300 my-8"> Rematch </Button>
      {/if}

      <Button
        on:click={ () => socket.emit('EXIT') }
        class="bg-red-700 text-gray-300 my-8"> Exit </Button>
    </div>
  {/if}

  {#if state === 'error'}
    <h2 class="text-gray-300 text-2xl text-center mb-6">Error</h2>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
    </div>
  {/if}

  <ul class="w-full text-white grid mt-8 items-center justify-center">
    <li class="text-xl text-violet-400 font-bold">Event list</li>
    {#each eventList as ev}
      <li>{ ev }</li>
    {/each}
  </ul>
</div>

<style lang="postcss">
  #players {
    @apply grid grid-cols-7 max-w-lg my-4 mx-auto;
  }

  #players .header {
    @apply text-gray-300 font-bold text-xl;
  }
  
  #players-gameover {
    @apply grid grid-cols-10 max-w-2xl my-4 mx-auto;
  }

  #players-gameover .header {
    @apply text-gray-300 font-bold text-xl;
  }

  #actions li {
    @apply w-14 h-8 flex items-center justify-center cursor-pointer rounded-md shadow-md;
  }
</style>