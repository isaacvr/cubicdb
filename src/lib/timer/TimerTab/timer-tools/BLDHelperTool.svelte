<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import * as all from "@cstimer/scramble";
  import {
    SCHEMAS,
    SPEFFZ_SCH,
    getBLDCicles,
    type BLDCicleResult,
    type ISchema,
  } from "./bld-helper/bld-cicles";
  import ClockwiseIcon from "@icons/CogClockwise.svelte";
  import CounterClockwiseIcon from "@icons/CogCounterclockwise.svelte";
  import Select from "@material/Select.svelte";
  import FlippedIcon from "@icons/ArrowUpDown.svelte";
  import { Button, ButtonGroup, Tooltip } from "flowbite-svelte";

  export let context: TimerContext;

  const { scramble, mode } = context;

  let schema = SCHEMAS[0];

  let cornerBuffer = "";
  let edgeBuffer = "";
  let centerBuffer = "";
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
    edgeBuffer = sch.schema[1][20];
    centerBuffer = sch.schema[2][0];
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

  function updateMemo(scr: string, md: string) {
    let option = all.pScramble.options.get(md);

    if (Array.isArray(option)) {
      option = option[0];
    }

    if (!option || Array.isArray(option)) return cleanCicle();
    if (option.type != "rubik") return cleanCicle();

    order = option.order ? option.order[0] : 3;
    cicle = getBLDCicles(scr, edgeBuffer, cornerBuffer, centerBuffer, order, schema.code);
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
    edgeBuffer &&
    centerBuffer &&
    schema &&
    updateMemo($scramble, $mode[1]);
</script>

<div class="grid">
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
      <span class="flex items-center gap-2">
        Corners
        {#if cicle.twistedCornerBuffer === -1}
          <ClockwiseIcon class="cursor-help" />
          <Tooltip class="!bg-green-700">The buffer should be rotated clockwise at the end</Tooltip>
        {:else if cicle.twistedCornerBuffer === 1}
          <CounterClockwiseIcon class="cursor-help" />
          <Tooltip class="!bg-green-700">
            The buffer should be rotated counterclockwise at the end
          </Tooltip>
        {/if}
      </span>

      <Select
        class="py-2 !bg-gray-800"
        placement="right"
        items={SPEFFZ_SCH[0]}
        bind:value={cornerBuffer}
        transform={e => e}
      />
    </li>

    <!-- Edges -->
    <li>
      <span class="flex items-center gap-2"> Edges </span>
      <Select
        class="py-2 !bg-gray-800"
        placement="right"
        items={SPEFFZ_SCH[1]}
        bind:value={edgeBuffer}
        transform={e => e}
      />
    </li>

    <!-- Centers -->
    <li>
      <span class="flex items-center gap-2"> Centers </span>
      <Select
        class="py-2 !bg-gray-800"
        placement="right"
        items={SPEFFZ_SCH[2]}
        bind:value={centerBuffer}
        transform={e => e}
      />
    </li>
  </ul>

  <hr class="my-2 border-gray-500" />

  <table class="w-full">
    <!-- CORNERS -->
    {#if cicle.corners.length}
      <tr>
        <td class="text-green-300">Corners: </td>
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
</div>

<style lang="postcss">
  .buffer-list {
    @apply flex gap-2 justify-evenly;
  }

  .buffer-list li {
    @apply grid;
  }
</style>
