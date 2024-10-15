<script lang="ts">
  import { AverageSetting, type Game, type Language, type Solve } from "@interfaces";
  import Select from "@material/Select.svelte";
  import Timer from "@pages/Timer/TimerLayout.svelte";
  import { infinitePenalty, isMo3, timer } from "@helpers/timer";
  import * as all from "@cstimer/scramble";
  import { onDestroy, onMount } from "svelte";
  import Tooltip from "@material/Tooltip.svelte";
  import Checkbox from "@material/Checkbox.svelte";
  import { getAverage } from "@helpers/statistics";
  import { derived, writable, type Readable, type Writable } from "svelte/store";
  import type { SCRAMBLE_MENU } from "@constants";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { copyToClipboard, randomUUID } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import { AblyHandler } from "./adaptors/AblyHandler";
  import { setSeed } from "@cstimer/lib/mathlib";
  import { Button, Card, Input } from "flowbite-svelte";
  import EyeIcon from "@icons/Eye.svelte";
  import CloseIcon from "@icons/Close.svelte";
  import CopyIcon from "@icons/ContentCopy.svelte";
  import ResultView from "./components/ResultView.svelte";

  const notification = NotificationService.getInstance();

  let MODES: SCRAMBLE_MENU[1] = [];

  let localLang: Readable<Language> = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MODES = l.MENU[0][1];
    return l;
  });

  $localLang;

  type STATE = "idle" | "create" | "join" | "waiting" | "play" | "error" | "gameover";
  const TITLE: Map<STATE, string> = new Map([
    ["idle", "Cube battle!"],
    ["create", "Create a battle"],
    ["join", "Join a battle"],
    ["waiting", "Connecting..."],
    ["play", "Battle!"],
    ["error", "Error :("],
    ["gameover", "Game Over"],
  ]);

  let game: Writable<Game> = writable({
    players: [],
    observers: [],
    round: 0,
    started: false,
    total: 0,
    mode: "",
    owner: "",
  });

  let context = {
    isOwner: writable(false),
    clientID: writable(""),
    game,
    isConnected: writable(false),
  };

  let state: STATE = "idle";
  // let socket: Socket;
  let socket = new AblyHandler(context);
  let checked = false;
  let ending = false;

  let username = "";
  let gameID = "";
  let scramble = "";
  let mode = "333";
  let isCreator = false;
  let isObserver = false;
  let nextRoundAvailable = false;
  let timeToNextRound = 0;
  let round = -1;
  let locked = false;
  let eventList: string[] = [];
  let disconnectedKey = "";
  let enableKeyboard = writable(!(locked || isObserver || ending || !socket.connected));

  function log(...args: any[]) {
    eventList.push(args.map(e => JSON.stringify(e, null, 2)).join(" "));
    eventList = eventList;
  }

  function toState(s: STATE, keepData?: boolean) {
    state = s;
    if (s === "idle" && !keepData) {
      setCO(false, false);
      gameID = "";
      mode = "333";
      round = -1;
      locked = false;
    }
  }

  function tryCreate() {
    username = username.trim();

    log("tryCreate", username, mode, socket.connected);

    if (username && mode && socket.connected) {
      // socket.create(username, userID, mode);
      return true;
    }

    notification.addNotification({
      header: "Network error",
      text: "Please, check your connection.",
      timeout: 3000,
    });

    return false;
  }

  function tryJoin() {
    username = username.trim();

    log(checked ? "Trying to observe" : "Trying to join");

    // if (username && /^[0-9a-f]{8}$/.test(gameID) && socket.connected) {
    //   (checked ? socket.look : socket.join).apply(socket, [gameID, username, userID]);
    //   return true;
    // }

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
    if (s.group === -1) {
      s.group = round;
    }

    socket.time(infinitePenalty(s) ? Infinity : s.time, s.group || round);
  }

  function computeStats() {
    let pl = $game.players;
    let solves = isMo3($game.mode) ? 3 : 5;

    for (let i = 0, maxi = pl.length; i < maxi; i += 1) {
      let times = pl[i][1].times.map(t => (t === "DNF" ? Infinity : +t));

      pl[i][1].times[5] = getAverage(solves, times, AverageSetting.SEQUENTIAL)[4] || Infinity;
      pl[i][1].times[6] = Math.min(...times.slice(0, solves));
      pl[i][1].times[7] = Math.max(...times.slice(0, solves));
    }

    $game.players.sort((a, b) => a[1].times[5] - b[1].times[5]);
  }

  function exit() {
    if (socket.connected) {
      socket.exit();
    }

    toState("idle");
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
    log("DISCONNECTED");

    if (state != "play") {
      toState("idle", true);
    } else {
      disconnectedKey = randomUUID();

      notification.addNotification({
        header: "Disconnected",
        text: "Reconnecting...",
        fixed: true,
        key: disconnectedKey,
        actions: [{ text: $localLang.global.accept, callback: () => {} }],
      });
    }
  }

  function setTimer(cb: Function) {
    timeToNextRound = 5;

    let itv = setInterval(() => {
      timeToNextRound -= 1;

      if (timeToNextRound <= 0) {
        nextRoundAvailable = false;
        clearInterval(itv);
        cb && cb();
      }
    }, 1000);
  }

  onMount(() => {
    connect();

    // userID = randomUUID();

    console["error"] = function (...args: any) {
      log(...args);
    };

    // Socket.IO config
    socket.on("connect", () => {
      log("CONNECTED");

      notification.removeNotification(disconnectedKey);

      if (state === "play") {
        socket.reconnect(round);
      }
    });

    socket.on("CREATED", id => {
      log("CREATED", id);
      gameID = id;
      round = -1;
      toState("play");
      setCO(true, false);
    });

    socket.on("JOINED", () => {
      log("JOINED");
      round = -1;
      toState("play");
      setCO(false, false);
    });

    socket.on("LOOKING", () => {
      log("LOOKING");
      toState("play");
      setCO(false, true);
    });

    socket.on("GAME_OVER", () => {
      log("GAME_OVER");
      toState("gameover");
      ending = false;
    });

    socket.on("EXIT", () => {
      log("EXIT");
      toState("idle");
    });

    socket.on("GAME_DATA", (g: Game) => {
      log("GAME_DATA", g);
      $game = g;
      mode = $game.mode;
      computeStats();
      // setCO(g.owner === userID, isObserver);
    });

    socket.on("SCRAMBLE", (scr: string) => {
      log("SCRAMBLE", scr);
      scramble = scr;
    });

    socket.on("TIMEOUT", () => {
      log("TIMEOUT");
      ending = true;
      setTimer(() => isCreator && socket.gameOver());
    });

    socket.on("NEXT_ROUND", () => {
      console.trace();
      try {
        log("NEXT_ROUND");
        locked = false;
        round += 1;

        // Use round and gameID as the seed
        setSeed(round + 5, gameID);

        let sMode = MODES.find(m => m[1] === mode) as any;
        log("gen: ", mode, sMode, round + 5, gameID);
        scramble = (all.pScramble.scramblers.get(mode) as any)
          .apply(null, [mode, Math.abs(sMode[2]), undefined])
          .replace(/\\n/g, "<br>")
          .trim();
      } catch (e) {
        log("ERROR: ", e);
      }
    });

    socket.on("NEXT_ROUND_AVAILABLE", () => {
      log("NEXT_ROUND_AVAILABLE");
      nextRoundAvailable = true;
      setTimer(() => isCreator && socket.nextRound());
    });

    socket.on("REMATCH", (g: Game) => {
      log("REMATCH");

      if (state === "gameover") {
        toState("play");
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

    socket.on("ERROR", (err: keyof typeof errorMap) => {
      log("ERROR", err);
      let text = "";

      switch (state) {
        case "waiting": {
          text = errorMap[err] || "Unknown error";
          toState("join");
          break;
        }
        case "play": {
          exit();
          break;
        }
      }

      text &&
        notification.addNotification({
          header: "Error",
          text,
          timeout: 3000,
        });
    });

    socket.on("disconnect", disconnect);
  });

  function toClipboard() {
    copyToClipboard(gameID)
      .then(_ => console.log("COPIED"))
      .catch(() => {});
  }

  onDestroy(() => {
    socket.exit();
    socket.disconnect();
  });

  $: enableKeyboard.set(!(locked || isObserver || ending || !socket.connected));
</script>

<svelte:body on:keydown={ev => ev.code === "Space" && ev.preventDefault()} />

<Card
  class="mt-4 max-w-4xl w-[calc(100%-2rem)] mx-auto mb-8 flex flex-col items-center gap-4 relative"
>
  <h1 class="text-gray-300 text-3xl text-center">{TITLE.get(state)}</h1>

  <!-- IDLE -->
  {#if state === "idle"}
    <div class="flex items-center justify-center gap-4">
      <Button on:click={() => toState("create")} color="green">Create</Button>
      <Button on:click={() => toState("join")} color="blue">Join</Button>
      <Button on:click={() => (eventList.length = 0)} color="purple">Clear</Button>
    </div>
  {/if}

  <!-- CREATE -->
  {#if state === "create"}
    <div class="max-w-xs justify-center mx-auto grid gap-4 grid-cols-3">
      <span class="col-span-1 flex justify-end items-center">Name:</span>
      <div class="col-span-2"><Input bind:value={username} autofocus={true} /></div>

      <span class="col-span-1 flex justify-end items-center">Mode:</span>
      <div class="col-span-2">
        <Select
          bind:value={mode}
          class="w-full"
          items={MODES}
          label={m => m[0]}
          transform={m => m[1]}
          hasIcon={m => m[1]}
        />
      </div>
    </div>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={() => toState("idle")} color="red">Back</Button>
      <Button on:click={() => tryCreate() && toState("waiting")} color="blue">Create</Button>
    </div>
  {/if}

  <!-- JOIN -->
  {#if state === "join"}
    <div class="max-w-xs justify-center mx-auto grid gap-4 grid-cols-3">
      <span class="col-span-1 flex justify-end items-center">Name:</span>
      <div class="col-span-2"><Input bind:value={username} focus={true} /></div>

      <span class="col-span-1 flex justify-end items-center">Game ID:</span>
      <div class="col-span-2">
        <Input bind:value={gameID} on:UENTER={() => tryJoin() && toState("waiting")} />
      </div>

      <span class="col-span-3 flex justify-center gap-2">
        <Checkbox {checked} on:change={e => (checked = e.detail.value)} label="Join as observer" />
      </span>
    </div>
    <div class="flex items-center justify-center gap-4 my-6">
      <Button on:click={() => toState("idle")} color="red">Back</Button>
      <Button on:click={() => tryJoin() && toState("waiting")} color="blue">Join</Button>
    </div>
  {/if}

  <!-- WAITING -->
  {#if state === "waiting"}
    <h2 class="text-gray-300 text-2xl text-center">Waiting...</h2>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={() => toState("idle")} color="red">Back</Button>
    </div>
  {/if}

  <!-- PLAY -->
  {#if state === "play"}
    <div class="text-gray-300 text-xl flex items-center justify-center gap-2">
      Game ID:
      <span class="bg-violet-700 text-gray-300 px-2 py-1 rounded-md">{gameID}</span>
      <Button color="none" class="h-8 w-8 p-0 me-3 rounded-full" on:click={toClipboard}>
        <CopyIcon size="1.2rem" />
      </Button>
    </div>

    <ul id="actions" class="absolute top-2 right-2 flex items-center gap-2">
      <li class="bg-gray-500 text-gray-300">
        <button
          on:click={() => {
            socket.disconnect();

            setTimeout(() => socket.connect(), 10000);
          }}>D</button
        >
      </li>
      <li class="bg-gray-500 text-gray-300">
        <Tooltip position="top" text="Observers">
          <div class="flex items-center gap-1">
            <EyeIcon size="1.2rem" />
            {$game.observers.length}
          </div>
        </Tooltip>
      </li>
      <button class="bg-red-700 text-gray-300" on:click={exit}>
        <Tooltip position="top" text="Exit">
          <div class="flex items-center"><CloseIcon size="1.2rem" /></div>
        </Tooltip>
      </button>
    </ul>

    {#if isCreator}
      {#if !$game.started && $game.players.length > 1}
        <Button on:click={start} color="green" class="my-8 mx-auto">Start!</Button>
      {:else}
        <span class="flex justify-center text-yellow-300">Share the game ID with your friends!</span
        >
      {/if}
    {/if}

    {#if $game.started}
      {#if nextRoundAvailable}
        <span class="flex justify-center text-green-300 text-2xl">
          Next round in {timeToNextRound}
        </span>
      {/if}

      {#if ending}
        <span class="flex justify-center text-yellow-300 text-2xl">
          Ending game in {timeToNextRound}
        </span>
      {/if}

      <div class="rounded-md relative w-full" class:disconnected={!socket.connected}>
        <Timer
          on:solve={updateSolve}
          battle={true}
          useScramble={scramble || "R U R' U'"}
          useMode={mode}
          genScramble={false}
          cleanOnScramble={true}
          {enableKeyboard}
        />
      </div>
    {/if}

    {#if !ending}
      <ResultView game={$game} />
    {/if}
  {/if}

  <!-- GAMEOVER -->
  {#if state === "gameover"}
    <ResultView game={$game} />

    <div class="flex items-center justify-center gap-4 w-full">
      {#if isCreator}
        <Button on:click={rematch} color="purple" class="my-8">Rematch</Button>
      {/if}

      <Button on:click={exit} color="red" class="my-8">Exit</Button>
    </div>
  {/if}

  <!-- ERROR -->
  {#if state === "error"}
    <h2 class="text-gray-300 text-2xl text-center">Error</h2>

    <div class="flex items-center justify-center gap-4">
      <Button on:click={() => toState("idle")} color="red">Back</Button>
    </div>
  {/if}

  <!-- EVENT_LIST -->
  <ul class="w-full grid text-white items-center justify-center">
    <li class="text-xl text-violet-400 font-bold">Event list</li>
    {#each eventList as ev}
      <li>{ev}</li>
    {/each}
  </ul>
</Card>

<style lang="postcss">
  #actions li {
    @apply w-14 h-8 flex items-center justify-center cursor-pointer rounded-md shadow-md;
  }

  .disconnected {
    @apply opacity-40 pointer-events-none;
  }
</style>
