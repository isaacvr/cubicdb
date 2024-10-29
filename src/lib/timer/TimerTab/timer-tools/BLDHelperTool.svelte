<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import * as all from "@cstimer/scramble";
  import Select from "@material/Select.svelte";
  import { Button, ButtonGroup, Tooltip } from "flowbite-svelte";
  import {
    SCHEMAS,
    SPEFFZ_SCH,
    getBLDCicles,
    type BLDCicleResult,
    type ISchema,
  } from "./bld-helper/bld-cicles";
  import ClockwiseIcon from "@icons/CogClockwise.svelte";
  import CounterClockwiseIcon from "@icons/CogCounterclockwise.svelte";
  import FlippedIcon from "@icons/ArrowUpDown.svelte";
  import type { Writable } from "svelte/store";
  import { getContext } from "svelte";
  import { localLang } from "$lib/stores/language.service";

  export let context: TimerContext;

  let configMode = getContext("configMode") as Writable<boolean>;

  const { scramble, mode } = context;

  let schema = SCHEMAS[0];

  let cornerBuffer = "";
  let edgeBuffers: string[] = [""];
  let centerBuffers: string[] = [""];
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

  function setSchema(sch: ISchema) {
    schema = sch;
    cornerBuffer = sch.schema[0][4];
    edgeBuffers = [sch.schema[1][20]];
    centerBuffers = [sch.schema[2][0]];
  }

  // Speffz by default
  setSchema(SCHEMAS[0]);

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
    const sch = schema.schema;
    // Centers
    let dims = [];

    if (order & 1) {
      dims = [(order - 2) >> 1, order - 2 - ((order - 2) >> 1)];
    } else {
      dims = [(order - 2) >> 1, (order - 2) >> 1];
    }

    const centers = dims[0] * dims[1];
    centerBuffers = [...centerBuffers, ...sch[2][0].repeat(centers).split("")].slice(0, centers);

    // Edges
    const edges = (order - 1) >> 1;
    edgeBuffers = [...edgeBuffers, ...sch[1][20].repeat(edges).split("")].slice(0, edges);
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

    cicle = getBLDCicles(scr, edgeBuffers, cornerBuffer, centerBuffers, order, schema.code);
  }

  function getName(type: "center" | "edge", pos: number, o: number) {
    if (o > 5) {
      return type === "center" ? "Centers " + (pos + 1) : "Edges " + (pos + 1);
    }

    if (o === 5) {
      return type === "center"
        ? pos === 0
          ? "x Centers"
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
    schema &&
    updateMemo($scramble, $mode[1]);
</script>

<div class="grid">
  {#if $configMode}
    <!-- Config -->
    <div class="w-full flex justify-center">
      <ButtonGroup>
        {#each SCHEMAS as sch}
          <Button
            on:click={() => setSchema(sch)}
            color={sch === schema ? "yellow" : "dark"}
            class={"py-1 " + (sch === schema ? "text-black" : "text-gray-400")}
          >
            {sch.name}
          </Button>
        {/each}
      </ButtonGroup>
    </div>

    <h2 class="text-center w-full text-orange-200">Buffers</h2>

    <ul class="buffer-list">
      <!-- Corners -->
      <li>
        <span class="flex items-center gap-2"> Corners </span>

        <Select
          class="py-2 bg-backgroundLevel2"
          placement="right"
          items={SPEFFZ_SCH[0]}
          bind:value={cornerBuffer}
          transform={e => e}
        />
      </li>

      <!-- Edges -->
      {#each edgeBuffers as e, pos}
        <li>
          <span class="flex items-center gap-2">{getName("edge", pos, order)}</span>
          <Select
            class="py-2 bg-backgroundLevel2"
            placement="right"
            items={SPEFFZ_SCH[1]}
            bind:value={e}
            transform={e => e}
          />
        </li>
      {/each}

      <!-- Centers -->
      {#each centerBuffers as c, pos}
        <li>
          <span class="flex items-center gap-2">{getName("center", pos, order)}</span>
          <Select
            class="py-2 bg-backgroundLevel2"
            placement="right"
            items={SPEFFZ_SCH[2]}
            bind:value={c}
            transform={e => e}
          />
        </li>
      {/each}
    </ul>

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

<style lang="postcss">
  .buffer-list {
    @apply flex flex-wrap gap-2 justify-evenly;
  }

  .buffer-list li {
    @apply grid;
  }
</style>
