<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import * as all from "@cstimer/scramble";
  import Select from "@material/Select.svelte";
  import { Button, Tooltip } from "flowbite-svelte";
  import {
    ORIS,
    SCHEMAS,
    SPEFFZ_SCH,
    getBLDCicles,
    type BLDCicleResult,
    type Facelet,
  } from "./bld-helper/bld-cicles";
  import ClockwiseIcon from "@icons/CogClockwise.svelte";
  import CounterClockwiseIcon from "@icons/CogCounterclockwise.svelte";
  import FlippedIcon from "@icons/ArrowUpDown.svelte";
  import { ChevronLeftSolid, ChevronRightSolid } from "flowbite-svelte-icons";
  import type { Writable } from "svelte/store";
  import { getContext } from "svelte";
  import { localLang } from "$lib/stores/language.service";
  import { MISC, type ColorName } from "@constants";
  import { ScrambleParser } from "@classes/scramble-parser";
  import { minmax } from "@helpers/math";

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

  const FACENAME: Facelet[] = ["U", "R", "F", "D", "L", "B"];
  const COLORS: ColorName[] = ["white", "red", "green", "yellow", "orange", "blue"];
  let frontFace: Facelet = "F";
  let upFace: Facelet = "U";
  let setupSeq = "";
  let selectedCicle = 0;

  let cicles: BLDCicleResult[] = [];

  function cleanCicle() {
    cicles.length = 0;
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

    let scramble = MISC.some(mmode =>
      typeof mmode === "string" ? mmode === md : mmode.indexOf(md) > -1
    )
      ? ScrambleParser.parseMisc(scr, md)
      : [scr];

    cicles = scramble.map(s =>
      getBLDCicles(
        s,
        edgeBuffers,
        cornerBuffer,
        centerBuffers,
        order,
        [eschema.code, cschema.code, cnschema.code],
        order % 2 === 0
          ? { type: "rotation", sequence: setupSeq }
          : { type: "orientation", front: frontFace, up: upFace }
      )
    );

    selectedCicle = 0;
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

  function step(ev: MouseEvent, v: number) {
    ev.stopPropagation();
    selectedCicle = minmax(selectedCicle + v, 0, cicles.length);
  }

  $: $scramble &&
    cornerBuffer &&
    edgeBuffers &&
    centerBuffers &&
    eschema &&
    cschema &&
    cnschema &&
    (setupSeq || "-") &&
    updateMemo($scramble, $mode[1]);
</script>

<div class="grid">
  {#if $configMode}
    <div class="flex">
      {#if order & 1}
        <div>
          Front:
          <Select
            type="color"
            class="bg-backgroundLevel2"
            placement="right"
            items={FACENAME}
            bind:value={frontFace}
            transform={e => e}
            label={(e, p) => COLORS[p]}
            onChange={() =>
              (upFace =
                upFace === frontFace || FACENAME[(FACENAME.indexOf(upFace) + 3) % 6] === frontFace
                  ? FACENAME[(FACENAME.indexOf(upFace) + 1) % 6]
                  : upFace)}
          />

          Up:
          <Select
            type="color"
            class="bg-backgroundLevel2"
            placement="right"
            items={FACENAME}
            bind:value={upFace}
            transform={e => e}
            label={(e, p) => COLORS[p]}
            disabled={(e, p) => e === frontFace || FACENAME[(p + 3) % 6] === frontFace}
          />
        </div>
        <div></div>
      {:else}
        <div class="flex items-center justify-center mx-auto gap-2">
          Setup Move:
          <Select
            class="bg-backgroundLevel2"
            items={ORIS}
            bind:value={setupSeq}
            transform={e => e[1]}
            label={e => e[1]}
            placement="right"
          />

          <!-- Recommended Setup: "{cicle.recommendedSetup}" -->
        </div>
      {/if}
    </div>

    <table>
      <tr>
        <th></th>
        <th>Scheme</th>
        <th>Buffer/s</th>
      </tr>

      <!-- Corners -->
      <tr>
        <td><h3 class="text-center tx-emphasis p-0">Corners</h3></td>
        <td>
          <Select
            class="bg-backgroundLevel2"
            bind:value={cschema}
            items={SCHEMAS}
            transform={e => e}
            label={e => e.name}
          />
        </td>
        <td class="flex flex-wrap w-max justify-center">
          <Select
            class="py-2 bg-backgroundLevel2"
            placement="right"
            items={SPEFFZ_SCH[0]}
            bind:value={cornerBuffer}
            transform={e => e}
          />
        </td>
      </tr>

      <!-- Edges -->
      {#if order > 2}
        <tr> <td colspan="3"> <hr class="border-gray-500 my-1" /> </td> </tr>

        <tr>
          <td><h3 class="text-center tx-emphasis mt-6">Edges</h3></td>
          <td>
            <Select
              class="bg-backgroundLevel2 mt-6"
              bind:value={eschema}
              items={SCHEMAS}
              transform={e => e}
              label={e => e.name}
            />
          </td>
          <td class="flex flex-wrap w-max justify-center gap-1">
            {#each edgeBuffers as e, pos}
              <div class="grid place-items-center w-fit">
                <span class="flex items-center gap-2 justify-center w-min"
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
          </td>
        </tr>
      {/if}

      <!-- Centers -->
      {#if order > 3}
        <tr> <td colspan="3"> <hr class="border-gray-500 my-1" /> </td> </tr>
        <tr>
          <td>
            <h3 class="text-center tx-emphasis mt-6">Centers</h3>
          </td>
          <td>
            <Select
              class="bg-backgroundLevel2 mt-6"
              bind:value={cnschema}
              items={SCHEMAS}
              transform={e => e}
              label={e => e.name}
            />
          </td>
          <td class="flex flex-wrap w-max justify-center items-center gap-1">
            {#each centerBuffers as c, pos}
              <div class="grid place-items-center w-fit">
                <span class="flex items-center gap-2 justify-center w-min"
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
          </td>
        </tr>
      {/if}
    </table>

    <Button
      color="none"
      class="bg-orange-400 hover:bg-orange-300 text-black mt-4"
      on:click={() => ($configMode = false)}
    >
      {$localLang.global.save}
    </Button>
  {:else}
    <!-- Memo -->
    <!-- {#if cicles.length} -->
    {#each cicles as cicle, pos}
      <!-- {@const cicle = cicles[selectedCicle]} -->
      {#if cicles.length > 1}
        <h3
          class={"text-center tx-emphasis " +
            (pos ? "mt-4 border-t border-t-gray-500" : "") +
            (pos % 2 === 1 ? " bg-backgroundLevel2" : "")}
        >
          {$localLang.global.scramble} #{pos + 1}
        </h3>
      {/if}
      <table class={"w-full" + (pos % 2 === 1 ? " bg-backgroundLevel2" : "")}>
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
    {/each}
    <!-- {/if} -->

    <!-- {#if cicles.length > 1}
      <div class="flex items-center mx-auto">
        <Button
          color="none"
          on:click={ev => step(ev, -1)}
          disabled={selectedCicle === 0}
          class={"rounded-full w-[3rem] h-[3rem] " + (cicles.length < 2 ? "hidden" : "mt-2")}
        >
          <ChevronLeftSolid class="pointer-events-none w-2 h-2" />
        </Button>
        <span>{$localLang.global.scramble} #{selectedCicle + 1}</span>
        <Button
          color="none"
          on:click={ev => step(ev, 1)}
          disabled={selectedCicle + 1 === cicles.length}
          class={"rounded-full w-[3rem] h-[3rem] " + (cicles.length < 2 ? "hidden" : "mt-2")}
        >
          <ChevronRightSolid class="pointer-events-none w-2 h-2" />
        </Button>
      </div>
    {/if} -->
  {/if}
</div>
