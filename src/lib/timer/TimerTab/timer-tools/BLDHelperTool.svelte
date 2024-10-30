<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import * as all from "@cstimer/scramble";
  import Select from "@material/Select.svelte";
  import { Button, ButtonGroup, Tooltip } from "flowbite-svelte";
  import { SCHEMAS, SPEFFZ_SCH, getBLDCicles, type BLDCicleResult } from "./bld-helper/bld-cicles";
  import ClockwiseIcon from "@icons/CogClockwise.svelte";
  import CounterClockwiseIcon from "@icons/CogCounterclockwise.svelte";
  import FlippedIcon from "@icons/ArrowUpDown.svelte";
  import type { Writable } from "svelte/store";
  import { getContext } from "svelte";
  import { localLang } from "$lib/stores/language.service";

  export let context: TimerContext;

  let configMode = getContext("configMode") as Writable<boolean>;

  const { scramble, mode } = context;

  let cschema = SCHEMAS[0];
  let eschema = SCHEMAS[0];
  let cnschema = SCHEMAS[0];

  let cornerBuffer = cschema.schema[0][4];
  let edgeBuffers: string[] = [eschema.schema[1][20]];
  let centerBuffers: string[] = [cnschema.schema[2][0]];
  let order = 3;

  let cicle: BLDCicleResult = {
    centers: [],

    edges: [],
    flippedEdges: [],
    edgeBufferState: [],

    corners: [],
    twistedCorners: [],
    twistedCornerBuffer: 0,

    parity: false,
  };

  // function setSchema(sch: ISchema) {
  //   schema = sch;
  // }

  function cleanCicle() {
    cicle.centers = [];
    cicle.edges = [];
    cicle.flippedEdges = [];
    cicle.edgeBufferState = [];
    cicle.corners = [];
    cicle.twistedCorners = [];
    cicle.twistedCornerBuffer = 0;
    cicle.parity = false;
  }

  function getPairs(letters: string[]): string {
    return (
      letters
        .join("")
        .match(/.{1,2}/g)
        ?.join(" ") || ""
    );
  }

  function updateBuffers() {
    // Centers
    let dims = [];

    if (order & 1) {
      dims = [(order - 2) >> 1, order - 2 - ((order - 2) >> 1)];
    } else {
      dims = [(order - 2) >> 1, (order - 2) >> 1];
    }

    const centers = dims[0] * dims[1];
    centerBuffers = [...centerBuffers, ...cnschema.schema[2][0].repeat(centers).split("")].slice(
      0,
      centers
    );

    // Edges
    const edges = (order - 1) >> 1;
    edgeBuffers = [...edgeBuffers, ...eschema.schema[1][20].repeat(edges).split("")].slice(
      0,
      edges
    );
  }

  function updateMemo(scr: string, md: string) {
    let option = all.pScramble.options.get(md);

    if (Array.isArray(option)) {
      option = option[0];
    }

    if (!option || Array.isArray(option)) return cleanCicle();
    if (option.type != "rubik") return cleanCicle();

    order = option.order ? option.order[0] : 3;

    updateBuffers();

    cicle = getBLDCicles(scr, edgeBuffers, cornerBuffer, centerBuffers, order, [
      eschema.code,
      cschema.code,
      cnschema.code,
    ]);
  }

  function getName(type: "center" | "edge", pos: number, o: number, short = false) {
    if (o > 5) {
      let centers = short ? "C" : "Centers ";
      let edges = short ? "E" : "Edges ";
      return type === "center" ? centers + (pos + 1) : edges + (pos + 1);
    }

    if (o === 5) {
      return type === "center"
        ? pos === 0
          ? short
            ? "x"
            : "x Centers"
          : short
            ? "+"
            : "+ Centers"
        : pos === 0
          ? "Midges"
          : "Wings";
    }

    return type === "center" ? "Centers" : "Edges";
  }

  $: $scramble &&
    cornerBuffer &&
    edgeBuffers &&
    centerBuffers &&
    eschema &&
    cschema &&
    cnschema &&
    updateMemo($scramble, $mode[1]);
</script>

<div class="grid">
  {#if $configMode}
    <!-- Corners -->
    <div class="w-full grid justify-center items-center">
      <h3 class="text-center tx-emphasis p-0">Corners</h3>

      <div class="flex items-end justify-center gap-4 flex-wrap">
        <div>
          <span class="flex items-center gap-2 justify-center">Scheme</span>
          <Select
            class="bg-backgroundLevel2"
            bind:value={cschema}
            items={SCHEMAS}
            transform={e => e}
            label={e => e.name}
          />
        </div>

        <div class="ml-2">
          <span class="flex items-center gap-2 justify-center">Buffer</span>
          <Select
            class="py-2 bg-backgroundLevel2"
            placement="right"
            items={SPEFFZ_SCH[0]}
            bind:value={cornerBuffer}
            transform={e => e}
          />
        </div>
      </div>
    </div>

    <!-- Edges -->
    {#if order > 2}
      <hr class="border-gray-500 my-1" />

      <div class="w-full grid mt-2">
        <h3 class="text-center tx-emphasis">Edges</h3>

        <div class="flex items-end justify-center gap-4 flex-wrap">
          <div>
            <span class="flex items-center gap-2 justify-center">Scheme</span>
            <Select
              class="bg-backgroundLevel2"
              bind:value={eschema}
              items={SCHEMAS}
              transform={e => e}
              label={e => e.name}
            />
          </div>

          {#each edgeBuffers as e, pos}
            <div>
              <span class="flex items-center gap-2 justify-center"
                >{getName("edge", pos, order, true)}</span
              >
              <Select
                class="py-2 bg-backgroundLevel2"
                placement="right"
                items={SPEFFZ_SCH[1]}
                bind:value={e}
                transform={e => e}
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Centers -->
    {#if order > 3}
      <hr class="border-gray-500 my-1" />

      <div class="w-full grid mt-2">
        <h3 class="text-center tx-emphasis">Centers</h3>

        <div class="flex items-end justify-center gap-4 flex-wrap">
          <div>
            <span class="flex items-center gap-2 justify-center">Scheme</span>
            <Select
              class="bg-backgroundLevel2"
              bind:value={cnschema}
              items={SCHEMAS}
              transform={e => e}
              label={e => e.name}
            />
          </div>

          {#each centerBuffers as c, pos}
            <div>
              <span class="flex items-center gap-2 justify-center"
                >{getName("center", pos, order, true)}</span
              >
              <Select
                class="py-2 bg-backgroundLevel2"
                placement="right"
                items={SPEFFZ_SCH[2]}
                bind:value={c}
                transform={e => e}
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <Button
      color="none"
      class="bg-orange-400 hover:bg-orange-300 text-black mt-4"
      on:click={() => ($configMode = false)}
    >
      {$localLang.global.save}
    </Button>
  {:else}
    <!-- Memo -->
    <table class="w-full">
      <!-- CORNERS -->
      {#if cicle.corners.length}
        <tr>
          <td class="text-green-300 flex items-center">
            {#if cicle.twistedCornerBuffer === -1}
              Corners <ClockwiseIcon class="cursor-help ml-1" />:
              <Tooltip class="!bg-green-700"
                >The buffer should be rotated clockwise at the end</Tooltip
              >
            {:else if cicle.twistedCornerBuffer === 1}
              Corners <CounterClockwiseIcon class="cursor-help ml-1" />:
              <Tooltip class="!bg-green-700">
                The buffer should be rotated counterclockwise at the end
              </Tooltip>
            {:else}
              Corners:
            {/if}
          </td>
          <td>{getPairs(cicle.corners)}</td>
        </tr>

        {#if cicle.twistedCorners.length > 0}
          <tr>
            <td class="text-yellow-300">Twisted: </td>
            <td>
              <ul class="flex gap-3">
                {#each cicle.twistedCorners as cn}
                  <li class="flex items-center gap-2 border-b">
                    {cn.letter}

                    {#if cn.dir === -1}
                      <ClockwiseIcon class="cursor-help" />
                      <Tooltip class="!bg-green-700"
                        >This piece should be rotated clockwise at the end</Tooltip
                      >
                    {:else}
                      <CounterClockwiseIcon class="cursor-help" />
                      <Tooltip class="!bg-green-700"
                        >This piece should be rotated counterclockwise at the end</Tooltip
                      >
                    {/if}
                  </li>
                {/each}
              </ul>
            </td>
          </tr>
        {/if}
      {/if}

      <!-- EDGES -->
      {#if cicle.edges.reduce((a, b) => a + b.length, 0)}
        {#if cicle.corners.length}
          <tr>
            <td colspan="2"><hr class="border-gray-500 my-2" /></td>
          </tr>
        {/if}

        {#each cicle.edges as edge, pos}
          {#if pos}
            <tr>
              <td><hr class="border-gray-400" /></td>
            </tr>
          {/if}

          <tr>
            <td class="text-green-300 flex items-center">
              {getName("edge", pos, order)}:

              {#if cicle.edgeBufferState[pos] != "normal"}
                <FlippedIcon class="outline-none cursor-help" />
                <Tooltip class="!bg-green-700">The buffer will be flipped at the end</Tooltip>
              {/if}
            </td>
            <td>{getPairs(edge)}</td>
          </tr>

          {#if cicle.flippedEdges[pos] && cicle.flippedEdges[pos].length > 0}
            <tr>
              <td class="text-yellow-300"
                >Flipped{cicle.edges.length > 1 ? " " + (pos + 1) : ""}:
              </td>
              <td>{cicle.flippedEdges[pos].join(", ")}</td>
            </tr>
          {/if}
        {/each}
      {/if}

      <!-- CENTERS -->
      {#if cicle.centers.length}
        {#if cicle.corners.length || cicle.edges.reduce((a, b) => a + b.length, 0)}
          <tr>
            <td colspan="2"><hr class="border-gray-500 my-2" /></td>
          </tr>
        {/if}

        {#each cicle.centers as center, pos}
          <tr>
            <td class="text-green-300">{getName("center", pos, order)}: </td>
            <td>{getPairs(center)}</td>
          </tr>
        {/each}
      {/if}
    </table>
  {/if}
</div>
