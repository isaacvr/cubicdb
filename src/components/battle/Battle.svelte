<script lang="ts">
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
  import Checkbox from '../material/Checkbox.svelte';
  import { getAverage } from '@helpers/statistics';
  import { derived, type Readable } from 'svelte/store';
  import type { SCRAMBLE_MENU } from '@constants';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { randomUUID } from '@helpers/strings';
  import { NotificationService } from '@stores/notification.service';
  import { SocketIOHandler } from './SocketIOHandler';
  import { AblyHandler } from "./AblyHandler";

  const notification = NotificationService.getInstance();

  let MODES: SCRAMBLE_MENU[1] = [];
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => {
    let l = getLanguage( $lang );
    MODES = l.MENU[0][1];
    return l;
  });

  $localLang;

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
  // let socket: Socket;
  let socket = new AblyHandler();
  // let socket = new SocketIOHandler('ws://cubedb-battle-server.netlify.app:3000/');
  // let socket = new SocketIOHandler('ws://192.168.67.93:3000/');
  // let socket = new SocketIOHandler('ws://localhost:3000/');
  let checked = false;
  let ending = false;

  let username = '';
  let userID = '';
  let gameID = '';
  let scramble = '';
  let game: Game = { players: [], observers: [], round: 0, started: false, total: 0 };
  let mode = '333';
  let isCreator = false;
  let isObserver = false;
  let nextRoundAvailable = false;
  let timeToNextRound = 0;
  let round = -1;
  let locked = false;
  let eventList: string[] = [];
  let disconnectedKey = '';

  function log(...args: any[]) {
    eventList.push( args.map(e => JSON.stringify(e, null, 2)).join(" ") );
    eventList = eventList;
  }

  function toState(s: STATE, keepData?: boolean) {
    state = s;

    if ( s === 'idle' && !keepData ) {
      setCO(false, false);
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
      socket.create(username, userID);
      return true;
    }

    notification.addNotification({
      header: 'Network error',
      text: 'Please, check your connection.',
      timeout: 3000,
      key: randomUUID(),
    });

    return false;
  }

  function tryJoin() {
    username = username.trim();

    log(checked ? 'Trying to observe' : 'Trying to join')

    if ( username && /^[0-9a-f]{8}$/.test(gameID) && socket.connected ) {
      (checked ? socket.look : socket.join).apply(socket, [gameID, username, userID]);
      return true;
    }

    notification.addNotification({
      header: 'Network error',
      text: 'Please, check your connection.',
      timeout: 3000,
      key: randomUUID(),
    });

    return false;
  }

  function setCO(cr: boolean, ob: boolean) {
    isCreator = cr;
    isObserver = ob;
  }

  function updateSolve(ev: CustomEvent) {
    locked = true;
    let s = ev.detail as Solve;
    
    log("SOLVE: ", gameID, infinitePenalty(s) ? Infinity : s.time, round);
    
    // Group field will be used to store the round
    if ( s.group === -1 ) {
      s.group = round;
    }

    socket.time(infinitePenalty(s) ? Infinity : s.time, s.group || round);
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
      socket.exit();
    }

    toState('idle');
  }

  function rematch() {
    socket.rematch();
  }

  function start() {
    socket.start();
  }

  function connect() {
    socket.connect();
  }

  function disconnect() {
    log('DISCONNECTED');

    if ( state != 'play' ) {
      toState('idle', true);
    } else {
      disconnectedKey = randomUUID();

      notification.addNotification({
        header: 'Disconnected',
        text: 'Reconnecting...',
        fixed: true,
        key: disconnectedKey,
        actions: [{ text: $localLang.global.accept, callback: () => {} }]
      });
    }

  }

  function setTimer(cb: Function) {
    timeToNextRound = 5;

    let itv = setInterval(() => {
      timeToNextRound -= 1;

      if ( timeToNextRound < 0 ) {
        nextRoundAvailable = false;
        clearInterval(itv);
        cb && cb();
      }
    }, 1000);
  }

  onMount(() => {
    connect();

    userID = randomUUID();

    console['error'] = function(...args: any) {
      log(...args);
    }

    // Socket.IO config
    socket.on('connect', () => {
      log("CONNECTED");

      notification.removeNotification(disconnectedKey);

      if ( state === 'play' ) {
        socket.reconnect(round);
      }
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
    socket.on('GAME_DATA',  (g: Game) => { log('GAME_DATA', g); game = g; setCO(g.players[0][0] === userID, isObserver) });
    socket.on('SCRAMBLE',   (scr: string) => { log('SCRAMBLE', scr); scramble = scr; });
    
    socket.on('TIMEOUT',    () => {
      log('TIMEOUT'); ending = true;
      setTimer(() => isCreator && socket.gameOver());
    });

    socket.on('NEXT_ROUND', () => {
      try {
        log('NEXT_ROUND');
        locked = false;
        round += 1;
        
        if ( isCreator ) {
          let sMode = MODES.find(m => m[1] === mode) as any;
          log('gen: ', mode, sMode);
          socket.scramble((all.pScramble.scramblers.get(mode) as any).apply(null, [
            mode, Math.abs(sMode[2]), undefined]).replace(/\\n/g, '<br>').trim());
        }
      } catch(e) {
        log('ERROR: ', e);
      }
    });
    
    socket.on('NEXT_ROUND_AVAILABLE', () => {
      log('NEXT_ROUND_AVAILABLE');
      nextRoundAvailable = true;
      setTimer(() => isCreator && socket.nextRound());
    });

    socket.on('REMATCH',    (g: Game) => {
      log('REMATCH');

      if ( state === 'gameover' ) {
        toState('play');
        round = -1;
      }
    });

    // ERRORS
    let errorMap = {
      "no-exists": "Game does not exists.",
      "max-observers": "Game reached the limit of observers.",
      "max-players": "Game reached the limit of players.",
      "invalid-time": "Invalid time.",
      "invalid-round": "Invalid round.",
      "invalid-user": "Invalid user.",
    } as const;

    socket.on('ERROR', (err: keyof typeof errorMap) => {
      log('ERROR', err);
      let text = '';

      switch( state ) {
        case 'waiting': {
          text = errorMap[ err ] || 'Unknown error';
          toState('join');
          break;
        }
        case 'play': {
          exit();
          break;
        }
      }

      text && notification.addNotification({
        header: 'Error',
        text,
        key: randomUUID(),
        fixed: false,
        timeout: 3000
      });
    });

    socket.on('disconnect', disconnect);
  });

  onDestroy(() => {
    socket.exit();
    socket.disconnect();
  });

</script>

<svelte:body on:keydown={(ev) => ev.code === 'Space' && ev.preventDefault()} />

<div class="container-mini bg-white bg-opacity-10 m-4 p-4 rounded-md pb-6 text-gray-400 relative">
  <h1 class="text-gray-300 text-3xl text-center mb-6">{ TITLE.get( state ) }</h1>

  <!-- IDLE -->
  {#if state === 'idle'}
    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('create') } class="bg-green-700 text-gray-300"> Create </Button>
      <Button on:click={ () => toState('join') } class="bg-blue-700 text-gray-300"> Join </Button>
      <Button on:click={ () => eventList.length = 0 } class="bg-purple-700 text-gray-300"> Clear </Button>
    </div>
  {/if}

  <!-- CREATE -->
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

  <!-- JOIN -->
  {#if state === 'join'}
    <div class="max-w-xs justify-center mx-auto grid gap-4 grid-cols-3 mb-6">
      <span class="col-span-1 flex justify-end items-center">Name:</span>
      <div class="col-span-2"><Input bind:value={ username } size={50} focus={ true }/></div>

      <span class="col-span-1 flex justify-end items-center">Game ID:</span>
      <div class="col-span-2">
        <Input type="number" size={50}
          on:input={ (e) => gameID = e.detail.target.value.toString() }
          on:UENTER={ () => tryJoin() && toState('waiting') }
        />
      </div>

      <span class="col-span-3 flex justify-center gap-2">
        <Checkbox { checked } on:change={ (e) => checked = e.detail.value } label="Join as observer"/>
      </span>
    </div>
    <div class="flex items-center justify-center gap-4 my-6">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
      <Button on:click={ () => tryJoin() && toState('waiting') } class="bg-blue-700 text-gray-300"> Join </Button>
    </div>
  {/if}

  <!-- WAITING -->
  {#if state === 'waiting'}
    <h2 class="text-gray-300 text-2xl text-center mb-6">Waiting...</h2>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
    </div>
  {/if}

  <!-- PLAY -->
  {#if state === 'play'}
    <h2 class="text-gray-300 text-xl text-center mb-6">Game ID:
      <span class="bg-violet-700 text-gray-300 px-2 py-1 rounded-md">{ gameID }</span>
    </h2>

    <ul id="actions" class="absolute top-2 right-2 flex items-center gap-2">
      <li class="bg-gray-500 text-gray-300">
        <button on:click={ () => {
          socket.disconnect();

          setTimeout(() => socket.connect(), 10000);
        }}>D</button>
      </li>
      <li class="bg-gray-500 text-gray-300">
        <Tooltip position="top" text="Observers">
          <div class="flex items-center gap-1"><EyeIcon size="1.2rem" /> { game.observers.length }</div>
        </Tooltip>
      </li>
      <button class="bg-red-700 text-gray-300" on:click={ exit }>
        <Tooltip position="top" text="Exit">
          <div class="flex items-center"><CloseIcon size="1.2rem" /></div>
        </Tooltip>
      </button>
    </ul>

    {#if isCreator}
      {#if !game.started && game.players.length > 1}
        <Button
          on:click={ start }
          class="bg-violet-700 text-gray-300 my-8 mx-auto"> Start! </Button>
      {:else}
        <span class="flex justify-center text-yellow-300">Share the game ID with your friends!</span>
      {/if}
    {/if}

    {#if game.started}
      {#if nextRoundAvailable}
        <span class="flex justify-center text-green-300 text-2xl">
          Next round in { timeToNextRound }
        </span>
      {/if}

      {#if ending}
        <span class="flex justify-center text-yellow-300 text-2xl">Ending game in { timeToNextRound }</span>
      {/if}

      <div class="h-96 rounded-md relative" class:disconnected={ !socket.connected }>
        <Timer
          on:solve={ updateSolve }
          battle={true}
          useScramble={ scramble }
          useMode={ mode }
          genScramble={ false }
          cleanOnScramble={ true }
          enableKeyboard={ !(locked || isObserver || ending || !socket.connected) }
        />
      </div>
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
        <li class={ p[1].connected ? '' : 'line-through' }>{ p[1].name }</li>
        {#each [0, 1, 2, 3, 4] as t}
          <li>{ p[1].times[t] === null ? 'DNF' : p[1].times[t] ? timer(p[1].times[t], true) : '-' }</li>
        {/each}
      {/each}
    </ul>
  {/if}

  <!-- GAMEOVER -->
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
          on:click={ rematch }
          class="bg-violet-700 text-gray-300 my-8"> Rematch </Button>
      {/if}

      <Button
        on:click={ exit }
        class="bg-red-700 text-gray-300 my-8"> Exit </Button>
    </div>
  {/if}

  <!-- ERROR -->
  {#if state === 'error'}
    <h2 class="text-gray-300 text-2xl text-center mb-6">Error</h2>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={ () => toState('idle') } class="bg-red-700 text-gray-300"> Back </Button>
    </div>
  {/if}

  <!-- EVENT_LIST -->
  <ul class="w-full grid text-white mt-8 items-center justify-center">
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

  .disconnected {
    @apply opacity-40 pointer-events-none;
  }
</style>