<script lang="ts">
  import { CubeViewMap, type Algorithm, type ITutorialAlg, type Solution } from "@interfaces";
  import Modal from "@components/Modal.svelte";
  import Select from "@material/Select.svelte";
  import { Button, Input, Range } from "flowbite-svelte";
  import { CubeModeMap } from "@constants";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import { createEventDispatcher } from "svelte";

  type AlgProp = { tutorial: false; alg: Algorithm } | { tutorial: true; alg: ITutorialAlg };

  export let show: boolean;
  export let isAdding: boolean;
  export let tipTemp: string[];
  export let solTemp: Solution[];
  export let img;
  export let alg: AlgProp;

  const dispatch = createEventDispatcher();

  const rotStep = Math.PI / 12;

  let rotation = {
    x: rotStep * 2,
    y: rotStep * 22,
    z: 0,
  };

  let sPos = -1;

  function addTip() {
    tipTemp = [...tipTemp, [0, 0, 0, 0, 0].join(", ")];
  }

  function addSolution() {
    solTemp = [...solTemp, { moves: "", votes: 0 }];
  }

  function renderSAlg() {
    dispatch("render");
  }

  function saveAlgorithm() {
    dispatch("save");
  }

  function selectPosition({
    pos,
    type,
    consecutive,
  }: {
    pos: number;
    type: number;
    consecutive: boolean;
  }) {
    if (sPos < 0) return (sPos = pos);
    if (pos === sPos) return (sPos = -1);

    let o = alg.alg.order;
    let x1 = sPos % o;
    let y1 = ~~(sPos / o);
    let x2 = pos % o;
    let y2 = ~~(pos / o);

    sPos = consecutive ? pos : -1;

    tipTemp = [...tipTemp, `${x1}, ${y1}, ${x2}, ${y2}, ${type}`];
  }
</script>

<Modal
  bind:show
  onClose={() => {
    show = false;
    isAdding = false;
  }}
>
  <div
    class="grid grid-cols-3 max-md:grid-cols-2 gap-4 place-items-center max-w-[50rem] max-h-[92vh] overflow-auto"
  >
    {#if !alg.tutorial}
      <section>
        Nombre: <Input bind:value={alg.alg.name} />
      </section>
      <section>
        Nombre corto: <Input bind:value={alg.alg.shortName} disabled={!isAdding} />
      </section>
      <section>
        Padre: <Input bind:value={alg.alg.parentPath} />
      </section>
    {/if}

    <section>
      Orden: <Input bind:value={alg.alg.order} type="number" />
    </section>
    <section>
      Scramble: <Input bind:value={alg.alg.scramble} />
    </section>

    {#if alg.tutorial}
      <section>
        Solution: <Input bind:value={alg.alg.solution} />
      </section>
    {/if}
    <section>
      Puzzle: <Input bind:value={alg.alg.puzzle} />
    </section>
    <section>
      Modo <Select
        placement="right"
        class="w-full"
        items={CubeModeMap}
        label={e => e[0]}
        transform={e => e[1]}
        bind:value={alg.alg.mode}
      />
    </section>
    <section>
      Vista <Select
        class="w-full"
        items={CubeViewMap}
        label={e => e[1]}
        transform={e => e[0]}
        bind:value={alg.alg.view}
      />
    </section>

    <section>
      Rotación:
      <div class="flex items-center">
        x: <Range bind:value={rotation.x} min={0} max={Math.PI * 2} step={rotStep} />
      </div>
      <div class="flex items-center">
        y: <Range bind:value={rotation.y} min={0} max={Math.PI * 2} step={rotStep} />
      </div>
      <div class="flex items-center">
        z: <Range bind:value={rotation.z} min={0} max={Math.PI * 2} step={rotStep} />
      </div>
    </section>

    <section class="row-span-2">
      Tips:

      {#if tipTemp.length}
        <ul class="grid no-grid gap-2">
          {#each tipTemp as tip, pos}
            <li class="flex gap-2 items-center">
              <Input bind:value={tip} class="py-1" />
              <button
                tabindex="0"
                class="text-gray-400 w-8 h-8 cursor-pointer hover:text-red-500"
                on:click|stopPropagation={() => {
                  tipTemp = tipTemp.filter((_, p) => p != pos);
                }}
              >
                <DeleteIcon size="1.2rem" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <Button class="!bg-blue-700 text-gray-300 mt-4" on:click={addTip}>Añadir flecha</Button>
    </section>

    <section class="place-items-center max-h-52 w-full h-full">
      <PuzzleImage src={img} interactive on:position={ev => selectPosition(ev.detail)} />
    </section>

    {#if !alg.tutorial}
      <section>
        Soluciones:

        {#if solTemp.length}
          <ul class="grid gap-2">
            {#each solTemp as solution, pos}
              <li class="flex gap-2 items-center">
                <Input bind:value={solution.moves} />
                <button
                  tabindex="0"
                  class="text-gray-400 w-8 h-8 cursor-pointer hover:text-red-500"
                  on:click|stopPropagation={() => {
                    solTemp = solTemp.filter((_, p) => p != pos);
                  }}
                >
                  <DeleteIcon size="1.2rem" />
                </button>
              </li>
            {/each}
          </ul>
        {/if}

        <Button class="!bg-blue-700 text-gray-300 mt-4" on:click={addSolution}
          >Añadir solución</Button
        >
      </section>
    {/if}

    <section class="actions col-span-full">
      <Button class="text-gray-300 !bg-purple-700" on:click={renderSAlg}>Actualizar Imagen</Button>
      <Button class="text-gray-300 !bg-green-700" on:click={saveAlgorithm}>Guardar</Button>
    </section>
  </div>
</Modal>
