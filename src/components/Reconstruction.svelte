<script lang="ts">
  import Simulator from "./Simulator.svelte";
  import Button from "./material/Button.svelte";
  import Slider from "./material/Slider.svelte";
  import TextArea from "./material/TextArea.svelte";
  import PlayIcon from 'svelte-material-icons/Play.svelte';
  import RestartIcon from 'svelte-material-icons/Restart.svelte';
  import PauseIcon from 'svelte-material-icons/Pause.svelte';
  import StepBackIcon from 'svelte-material-icons/ChevronLeft.svelte';
  import StepForwardIcon from 'svelte-material-icons/ChevronRight.svelte';  
  import BackIcon from 'svelte-material-icons/History.svelte';
  import { map, minmax } from "@helpers/math";
  import { onMount, tick } from "svelte";
  import Tooltip from "./material/Tooltip.svelte";
  import Checkbox from "./material/Checkbox.svelte";
  import Select from "./material/Select.svelte";
  import type { PuzzleType } from "@interfaces";
  import { navigate, useLocation } from "svelte-routing";
  import { parseReconstruction } from "@helpers/strings";


  const location = useLocation();

  const iconSize = '1.3rem';
  const PUZZLES: { puzzle: PuzzleType, name: string, order: number }[] = [
    { puzzle: 'rubik', name: "2x2x2", order: 2 },
    { puzzle: 'rubik', name: "3x3x3", order: 3 },
    { puzzle: 'rubik', name: "4x4x4", order: 4 },
    { puzzle: 'rubik', name: "5x5x5", order: 5 },
    { puzzle: 'rubik', name: "6x6x6", order: 6 },
    { puzzle: 'rubik', name: "7x7x7", order: 7 },
    { puzzle: 'rubik', name: "8x8x8", order: 8 },
    { puzzle: 'square1', name: "Square-1", order: -1 },
    { puzzle: 'pyraminx', name: "Pyraminx", order: 3 },
    { puzzle: 'skewb', name: "Skewb", order: -1 },
    // { puzzle: 'megaminx', name: "Megaminx", order: 3 },
  ];

  let puzzle = PUZZLES[0];
  
  let simulator: Simulator;
  let textarea: TextArea;

  let showBackFace = true;
  let title = '';
  let scramble = '';
  let reconstruction = '';
  let backURL = '';
  
  let sequence: string[] = [];
  let sequenceIndex: number[] = [];
  let sequenceAlpha = 0;
  let playing = false;
  let initTime = 0;
  let finalTime = 0;
  let initAlpha = 0;
  let finalAlpha = 0;
  let speed = 1;
  let lastId = -1;
  let mounted = false;
  let limit = -1;
  let dir: 1 | -1 = 1;

  function parse(s: string) {
    let rec = parseReconstruction(s, puzzle.puzzle, puzzle.order);
    finalAlpha = rec.finalAlpha;
    sequence = rec.sequence;
    sequenceIndex = rec.sequenceIndex;
    return rec.result;
  }

  function play() {
    if ( !playing ) return;

    let t = performance.now();
    let a = map(t, initTime, finalTime, map(dir, -1, 1, finalAlpha, initAlpha), map(dir, -1, 1, initAlpha, finalAlpha));

    if ( limit >= 0 ) {
      if ( (a - limit) * dir > 0 ) {
        a = limit;
        playing = false;
      }
    }

    sequenceAlpha = minmax(a, initAlpha, finalAlpha);

    if ( a < initAlpha || a > finalAlpha ) {
      playing = false;
    }

    requestAnimationFrame(play);
  }

  function recomputeTimeBounds(s: number, inv = false) {
    let percent = (sequenceAlpha - initAlpha) / (finalAlpha - initAlpha);
    let total = finalAlpha  * 1000 / s;

    finalTime = performance.now() + total * (1 - (inv ? 1 - percent : percent));
    initTime = finalTime - total;
  }

  function handlePlay() {
    if ( finalAlpha === 0 ) return;

    if ( playing ) {
      playing = false;
    } else {
      if ( sequenceAlpha === finalAlpha ) {
        sequenceAlpha = 0;
      }

      playing = true;
      limit = -1;
      dir = 1;
      recomputeTimeBounds(speed);
      play();
    }
  }

  function handleSequenceAlpha(a: number) {
    if ( !mounted ) return;

    let id = sequenceIndex[~~a];

    if ( lastId != id && id >= initAlpha && id < finalAlpha ) {
      let allMoves = textarea.getContentEdit().querySelectorAll('.move:not(.silent)');
      allMoves.forEach(mv => mv.classList.remove('current'));
      allMoves[id].classList.add('current');
      allMoves[id].scrollIntoView({ block: 'nearest' });
      lastId = id;
    }
  }

  function pause() {
    playing = false;
  }

  function step(d: 1 | -1) {
    limit = d === 1 ? ~~sequenceAlpha + 1 : Math.ceil(sequenceAlpha) - 1;
    dir = d;
    recomputeTimeBounds(speed * 2, d === -1);
    playing = true;
    play();
  }
  
  function handleKeyup(ev: KeyboardEvent) {
    switch( ev.code ) {
      case 'KeyP': {
        ev.ctrlKey && handlePlay();
        break;
      }

      case 'ArrowLeft': {
        ev.ctrlKey && step(-1);
        break;
      }

      case 'ArrowRight': {
        ev.ctrlKey && step(1);
        break;
      }
    }
  }

  async function resetPuzzle() {
    await tick();
    simulator.handleSequence(sequence, scramble);
    textarea.updateInnerText();
  }

  function handleLocation(loc: any) {
    let map = new URL(loc.href).searchParams;
    let p = map.get('puzzle');
    let o = parseInt( map.get('order') || '-1' );
    let s = map.get('scramble') || '';
    let r = map.get('reconstruction') || '';
    
    backURL = (map.get('returnTo') || '').trim();

    for (let i = 0, maxi = PUZZLES.length; i < maxi; i += 1) {
      let pz = PUZZLES[i];

      if ( pz.puzzle === p ) {
        if ( pz.order === -1 || (pz.order > 0 && pz.order === o ) ) {
          puzzle = pz;
          scramble = s;
          reconstruction = r;
          return;
        }
      }
    }

    puzzle = PUZZLES[1];
    scramble = ``;
    reconstruction = ``;
  }

  onMount(() => mounted = true);

  $: recomputeTimeBounds(speed);
  $: handleSequenceAlpha(sequenceAlpha);
  $: handleLocation($location);
</script>

<svelte:window on:keyup={ handleKeyup }/>

<main>
  <section>
    <Simulator contained enableDrag={ false } gui={ false } { sequence }
      bind:selectedPuzzle={ puzzle.puzzle }
      bind:order={ puzzle.order }
      bind:this={ simulator }
      bind:showBackFace
      bind:useScramble={ scramble }
      bind:sequenceAlpha
      enableKeyboard={ false }
    />

    <div class="grid bg-gray-600 h-[4rem] absolute bottom-0 w-full">
      <div class="flex px-3">
        <Slider class="text-white" bind:value={ sequenceAlpha } min={ initAlpha } max={ finalAlpha } on:mousedown={ pause }/>
      </div>

      <div class="flex justify-evenly">
        <Tooltip position="top" text="Step back [Ctrl + Left]" class="!w-full" hasKeybinding>
          <Button class="w-full h-full rounded-none shadow-none hover:bg-purple-600" on:click={ () => step(-1) }>
            <StepBackIcon size={ iconSize }/>
          </Button>
        </Tooltip>

        <Tooltip position="top" text="Play/Pause [Ctrl + P]" class="!w-full" hasKeybinding>
          <Button class="w-full h-full rounded-none shadow-none hover:bg-green-600" on:click={ handlePlay }>
            {#if playing}
              <PauseIcon size={ iconSize }/>
            {:else}
              {#if sequenceAlpha === finalAlpha }
                <RestartIcon size={ iconSize }/>
              {:else}
                <PlayIcon size={ iconSize }/>
              {/if}
            {/if}
          </Button>
        </Tooltip>

        <Tooltip position="top" text="Step forward [Ctrl + Right]" class="!w-full" hasKeybinding>
          <Button class="w-full h-full rounded-none shadow-none hover:bg-purple-600" on:click={ () => step(1) }>
            <StepForwardIcon size={ iconSize }/>
          </Button>
        </Tooltip>
      </div>
    </div>
  </section>

  <section class="settings">
    <TextArea bind:value={ title } placeholder="[Title]"
      class="rounded-none border-none bg-gray-800 px-2 py-1 border-t border-t-blue-800 text-3xl text-center" />

    <div>
      <h2>Scramble</h2>
      <TextArea bind:value={ scramble } getInnerText={ parse } class="bg-transparent rounded-none w-full border-none" cClass="h-[10vh]"/>
    </div>

    <div>
      <h2>Reconstruction</h2>
      <TextArea class="rounded-none border-none absolute inset-0" placeholder="[Type your reconstruction here]"
        bind:value={ reconstruction } cClass="h-[30vh]" getInnerText={ parse } bind:this={ textarea }
      />
    </div>

    <div>
      <h2>Settings</h2>

      <ul class="setting-list p-2 gap-4 place-items-center">
        <li> <Checkbox label="Show back faces [Ctrl + B]" hasKeybinding bind:checked={ showBackFace }/></li>
        <li> Puzzle: <Select bind:value={ puzzle } items={ PUZZLES } label={ e => e.name } transform={ e => e } onChange={ resetPuzzle }/> </li>
        <li>
          <Button class="bg-green-700 hover:bg-green-600 gap-1" on:click={ () => simulator.resetCamera() }>
            <RestartIcon size={ iconSize }/> Reset camera
          </Button>
        </li>
        {#if backURL}
          <li>
            <Button class="bg-blue-700 hover:bg-blue-600 gap-1" on:click={ () => navigate(backURL) }>
              <BackIcon size={ iconSize }/> Return
            </Button>
          </li>
        {/if}
        <li class="w-full">
          Speed: <Slider bind:value={ speed } min={ 0.1 } max={ 10 }/> <span>{ Math.floor(speed * 100) / 100 }x</span>
        </li>
      </ul>
    </div>
  </section>
</main>

<style lang="postcss">
  main {
    @apply grid grid-cols-2 h-full;
  }

  main section {
    @apply relative;
  }

  .settings {
    @apply border border-blue-800;
  }

  .settings > div {
    @apply border-t border-t-blue-800;
  }

  .settings div h2 {
    @apply bg-gray-800 px-2 py-1 text-xl;
  }
  
  .settings div:last-child {
    @apply border-b border-b-blue-800;
  }

  .setting-list {
    min-height: 4rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, max-content));
    justify-content: space-evenly;
  }

  .setting-list li {
    display: flex;
    gap: .25rem;
    align-items: center;
    height: 100%;
    border-radius: .3rem;
    box-shadow: 0px 0px .3rem #fff3;
    padding: .3rem;
  }
</style>