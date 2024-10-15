<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import * as all from "@cstimer/scramble";
  import {
    SCHEMAS,
    SPEFFZ_SCH,
    getOldPochman,
    type ISchema,
    type OldPochmanResult,
  } from "./bld-helper/old-pochman";
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

  let op: OldPochmanResult = {
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

  function cleanOP() {
    op.centers = [];
    op.edges = [];
    op.flippedEdges = [];
    op.edgeBufferState = [];
    op.corners = [];
    op.twistedCorners = [];
    op.twistedCornerBuffer = 0;
    op.parity = false;
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

    if (!option || Array.isArray(option)) return cleanOP();
    if (option.type != "rubik") return cleanOP();

    op = getOldPochman(
      scr,
      edgeBuffer,
      cornerBuffer,
      centerBuffer,
      option.order ? option.order[0] : 3,
      schema.code
    );
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
    <li>
      <span class="flex items-center gap-2">
        Corners
        {#if op.twistedCornerBuffer === -1}
          <ClockwiseIcon class="cursor-help" />
          <Tooltip class="!bg-green-700">The buffer should be rotated clockwise at the end</Tooltip>
        {:else if op.twistedCornerBuffer === 1}
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
    {#if op.corners.length}
      <tr>
        <td class="text-green-300">Corners: </td>
        <td>{getPairs(op.corners)}</td>
      </tr>

      {#if op.twistedCorners.length > 0}
        <tr>
          <td class="text-yellow-300">Twisted: </td>
          <td>
            <ul class="flex gap-3">
              {#each op.twistedCorners as cn}
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
    {#if op.edges.reduce((a, b) => a + b.length, 0)}
      {#if op.corners.length}
        <tr>
          <td colspan="2"><hr class="border-gray-500 my-2" /></td>
        </tr>
      {/if}

      {#each op.edges as edge, pos}
        {#if pos}
          <tr>
            <td><hr class="border-gray-400" /></td>
          </tr>
        {/if}

        <tr>
          <td class="text-green-300 flex items-center">
            Edges{op.edges.length > 1 ? " " + (pos + 1) : ""}:

            {#if op.edgeBufferState[pos] != "normal"}
              <FlippedIcon class="outline-none cursor-help" />
              <Tooltip class="!bg-green-700">The buffer will be flipped at the end</Tooltip>
            {/if}
          </td>
          <td>{getPairs(edge)}</td>
        </tr>

        {#if op.flippedEdges[pos] && op.flippedEdges[pos].length > 0}
          <tr>
            <td class="text-yellow-300">Flipped{op.edges.length > 1 ? " " + (pos + 1) : ""}: </td>
            <td>{op.flippedEdges[pos].join(", ")}</td>
          </tr>
        {/if}
      {/each}
    {/if}

    <!-- CENTERS -->
    {#if op.centers.length}
      {#if op.corners.length || op.edges.reduce((a, b) => a + b.length, 0)}
        <tr>
          <td colspan="2"><hr class="border-gray-500 my-2" /></td>
        </tr>
      {/if}

      {#each op.centers as center, pos}
        <tr>
          <td class="text-green-300">Centers{op.centers.length > 1 ? " " + (pos + 1) : ""}: </td>
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
