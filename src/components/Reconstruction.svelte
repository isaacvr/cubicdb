<script lang="ts">
  import Simulator from "./Simulator.svelte";
  import Button from "./material/Button.svelte";
  import Slider from "./material/Slider.svelte";
  import TextArea from "./material/TextArea.svelte";
  import { Interpreter } from "@classes/scrambleInterpreter";
  import PlayIcon from 'svelte-material-icons/Play.svelte';
  import RestartIcon from 'svelte-material-icons/Restart.svelte';
  import PauseIcon from 'svelte-material-icons/Pause.svelte';
  import StepBackIcon from 'svelte-material-icons/ChevronLeft.svelte';
  import StepForwardIcon from 'svelte-material-icons/ChevronRight.svelte';  
  import { map, minmax } from "@helpers/math";
  import { onMount, tick } from "svelte";
  import Tooltip from "./material/Tooltip.svelte";
  import Checkbox from "./material/Checkbox.svelte";
  import Select from "./material/Select.svelte";
  import type { PuzzleType } from "@interfaces";
  import Input from "./material/Input.svelte";

  type IToken = ReturnType< Interpreter['getTree'] >['program'];

  const iconSize = '1.3rem';
  const PUZZLES: { puzzle: PuzzleType, name: string, order: number }[] = [
    { puzzle: 'rubik', name: "2x2x2", order: 2 },
    { puzzle: 'rubik', name: "3x3x3", order: 3 },
    { puzzle: 'rubik', name: "4x4x4", order: 4 },
    { puzzle: 'rubik', name: "5x5x5", order: 5 },
    { puzzle: 'rubik', name: "6x6x6", order: 6 },
    { puzzle: 'rubik', name: "7x7x7", order: 7 },
    { puzzle: 'pyraminx', name: "Pyraminx", order: 3 },
    { puzzle: 'skewb', name: "Skewb", order: -1 },
  ];

  let puzzle = PUZZLES[6];
  
  let simulator: Simulator;
  let textarea: TextArea;

  let showBackFace = true;
  let title = "";
  let scramble = "";
  let reconstruction = ``;

  let errorCursor = -1;
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

  function defaultInner(s: string, withSuffix = true) {
    return s.replace(/\n/g, '<br>') + (withSuffix ? '<br>' : '');
  }

  function getTreeString(token: IToken): string {
    let { value } = token;

    switch( token.type ) {
      case 'Move': {
        return `<span class="move">${ value }</span>`;
      }
      
      case 'Comment': {
        return `<span class="comment">${ value }</span>`;
      }

      case 'Space': {
        return value.split("").map((e1: string) => e1 === '\n' ? '<br>' : '<span>&nbsp</span>').join('');
      }

      case 'Expression': {
        return (value as IToken[]).map(getTreeString).join('');
      }
      
      case 'ParentesizedExpression': {
        return '<span class="operator">(</span>'
          + getTreeString(value.expr)
          + '<span class="operator">)</span>'
          + ((value.cant != 1 || value.explicit) ? `<span class="operator">${value.cant}</span>` : '');
      }

      case 'ConmutatorExpression': {
        if ( value.setup ) {
          return '<span class="operator">[</span>'
            + getTreeString(value.setup)
            + '<span class="operator">:</span>'
            + getTreeString(value.conmutator)
            + '<span class="operator">]</span>'
            + ((value.cant != 1 || value.explicit) ? `<span class="operator">${value.cant}</span>` : '');
        }
        return '<span class="operator">[</span>'
          + getTreeString(value.expr1)
          + '<span class="operator">,</span>'
          + getTreeString(value.expr2)
          + '<span class="operator">]</span>'
          + ((value.cant != 1 || value.explicit) ? `<span class="operator">${value.cant}</span>` : '');
      }
    }

    return '';
  }

  function parseReconstruction(s: string) {
    let itp = new Interpreter(true, puzzle.puzzle);
    
    errorCursor = -1;
    sequence.length = 0;
    finalAlpha = 0;

    try {
      let tree = itp.getTree(s);

      console.log("TREE: ", tree);

      if ( tree.error ) {
        console.log("ERROR: ", tree.error, tree.cursor);
        if ( typeof tree.cursor === 'number' ) {
          errorCursor = tree.cursor;
        } else {
          errorCursor = 0;
        }
      } else {
        let program = itp.getFlat( tree.program );
        let flat = program.filter(token => token.cursor >= 0);
        
        sequence = flat.map(token => token.value);
        sequenceIndex = flat.map(token => token.cursor);

        finalAlpha = sequence.length;

        return getTreeString(tree.program.value) + "<br>";
      }
    } catch(e) {
      if ( typeof e === 'number' ) {
        errorCursor = e;
      }
    }

    if ( errorCursor != -1 ) {
      let pref = defaultInner(s.slice(0, errorCursor), false);
      let middle = '';
      let match = /^([^\s\n]+)/.exec( s.slice(errorCursor) );

      if ( match ) {
        middle = `<span class="error">${ match[0] }</span>`;
        return pref + middle + defaultInner(s.slice( errorCursor + match[0].length ));
      }
    }

    return defaultInner(s);
  }

  function play() {
    if ( !playing ) return;

    let t = performance.now();
    let a = map(t, initTime, finalTime, initAlpha, finalAlpha);

    sequenceAlpha = minmax(a, 0, finalAlpha);

    if ( a < initAlpha || a > finalAlpha ) {
      playing = false;
    }

    requestAnimationFrame(play);
  }

  function recomputeTimeBounds(s: number, inv = false) {
    let percent = sequenceAlpha / (finalAlpha - initAlpha);
    let total = finalAlpha  * 1000 / s;

    finalTime = performance.now() + total * (1 - (inv ? 1 - percent : percent));
    initTime = finalTime - total;
  }

  function handlePlay() {
    if ( sequence.length === 0 ) return;

    if ( playing ) {
      playing = false;
    } else {
      if ( sequenceAlpha === finalAlpha ) {
        sequenceAlpha = 0;
      }

      playing = true;
      recomputeTimeBounds(speed);
      play();
    }
  }

  function handleSequenceAlpha(a: number) {
    if ( !mounted ) return;

    let id = sequenceIndex[~~a];

    if ( lastId != id && id >= initAlpha && id < finalAlpha ) {
      let allMoves = textarea.getContentEdit().querySelectorAll('.move');
      allMoves.forEach(mv => mv.classList.remove('current'));
      allMoves[id].classList.add('current');
      lastId = id;
    }
  }

  function pause() {
    playing = false;
  }

  function stepBack() {
    if ( playing ) {
      playing = false;
    }

    let id = ~~sequenceAlpha;
    sequenceAlpha = minmax(id - 1, initAlpha, finalAlpha);
  }
  
  function stepForward() {
    if ( playing ) {
      playing = false;
    }

    let id = ~~sequenceAlpha;
    limit = id + 1;
    dir = 1;
    recomputeTimeBounds(speed);
    playing = true;
    play();
    // sequenceAlpha = minmax(id + 1, 0, sequence.length);
  }

  function handleKeyup(ev: KeyboardEvent) {
    switch( ev.code ) {
      case 'KeyP': {
        ev.ctrlKey && handlePlay();
        break;
      }

      case 'ArrowLeft': {
        ev.ctrlKey && stepBack();
        break;
      }

      case 'ArrowRight': {
        ev.ctrlKey && stepForward();
        break;
      }
    }
  }

  async function resetPuzzle() {
    await tick();
    simulator.handleSequence(sequence, scramble);
    finalAlpha = sequence.length;
  }

  onMount(() => mounted = true);

  $: recomputeTimeBounds(speed);
  $: handleSequenceAlpha(sequenceAlpha);
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
    />

    <div class="controls  bg-gray-600 h-[4rem] absolute bottom-0 w-full">
      <div class="flex px-3">
        <Slider class="text-white" bind:value={ sequenceAlpha } min={0} max={ sequence.length } on:mousedown={ pause }/>
      </div>

      <div class="flex justify-evenly">
        <Tooltip position="top" text="Step back [Ctrl + Left]" class="!w-full" hasKeybinding>
          <Button class="w-full rounded-none shadow-none hover:bg-purple-600" on:click={ stepBack }>
            <StepBackIcon size={ iconSize }/>
          </Button>
        </Tooltip>

        <Tooltip position="top" text="Play/Pause [Ctrl + P]" class="!w-full" hasKeybinding>
          <Button class="w-full rounded-none shadow-none hover:bg-green-600" on:click={ handlePlay }>
            {#if playing}
              <PauseIcon size={ iconSize }/>
            {:else}
              {#if sequenceAlpha === sequence.length }
                <RestartIcon size={ iconSize }/>
              {:else}
                <PlayIcon size={ iconSize }/>
              {/if}
            {/if}
          </Button>
        </Tooltip>

        <Tooltip position="top" text="Step forward [Ctrl + Right]" class="!w-full" hasKeybinding>
          <Button class="w-full rounded-none shadow-none hover:bg-purple-600" on:click={ stepForward }>
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
      <Input bind:value={ scramble } class="bg-transparent rounded-none w-full border-none"/>
    </div>

    <div>
      <h2>Reconstruction</h2>
      <TextArea class="rounded-none border-none absolute inset-0 overflow-auto" placeholder="[Type your reconstruction here]"
        bind:value={ reconstruction } cClass="h-[30vh] overflow-clip" getInnerText={ parseReconstruction } bind:this={ textarea }
      />
    </div>

    <div>
      <h2>Settings</h2>

      <ul class="setting-list grid p-2 gap-4 place-items-center">
        <li> <Checkbox label="Show back faces [Ctrl + B]" hasKeybinding bind:checked={ showBackFace }/></li>
        <li> Puzzle: <Select bind:value={ puzzle } items={ PUZZLES } label={ e => e.name } transform={ e => e } onChange={ resetPuzzle }/> </li>
        <li>
          <Button class="bg-green-700 hover:bg-green-600 gap-1" on:click={ () => simulator.resetCamera() }>
            <RestartIcon size={ iconSize }/> Reset camera
          </Button>
        </li>
      </ul>
    </div>

    <div>
      <h2>Playback options</h2>

      <div class="flex px-3 py-1 gap-2">
        Speed: <Slider bind:value={ speed } min={ 0.1 } max={ 10 }/> <span>{ Math.floor(speed * 100) / 100 }x</span>
      </div>
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
    width: 100%;
    min-height: 4rem;
  }

  .setting-list li {
    display: flex;
    gap: .25rem;
    align-items: center;
  }

  :global(.move), :global(.operator) {
    display: inline-block;
  }

  :global(.move) {
    color: #cbd375;
  }

  :global(.move.current) {
    background-color: #0065ff;
    color: white;
  }

  :global(.comment) {
    color: #508661;
    display: inline;
  }

  :global(.error) {
    color: #e04a4a;
  }

  :global(.operator) {
    color: #a0b3fb;
  }
</style>