<script lang="ts">
  import { type SheetRegistry } from "@interfaces";
  import Select from "@components/material/Select.svelte";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import type { SCRAMBLE_MENU } from "@constants";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { dataService } from "$lib/data-services/data.service";
  import { setSeed } from "@cstimer/lib/mathlib";
  import { scrambleToPuzzle } from "@helpers/scrambleToPuzzle";
  import { modeToName } from "@helpers/strings";
  import CubeCategory from "@components/wca/CubeCategory.svelte";
  import { getHTMLTemplate } from "./getHTMLTemplate";
  import { localLang } from "@stores/language.service";
  import { TrashIcon } from "lucide-svelte";

  interface SCRAMBLE_SETTINGS {
    scrambles: number;
    extras: number;
    factor: number;
  }

  type FORMAT = "Ao5" | "Mo3" | "Bo3" | "Bo2" | "Bo1";

  interface CATEGORY {
    group: number;
    mode: MODE;
    name: string;
    rounds: number;
    format: FORMAT;
    scrambles: number;
  }

  type MODE = SCRAMBLE_MENU["1"][number];

  let MENU: SCRAMBLE_MENU[] = getLanguage($globalLang).MENU;
  let groups: string[] = MENU.map(e => e[0]);
  let modes: MODE[] = $state(MENU[0][1]);
  let group = $state(0);
  let mode: MODE = $state(modes[0]);
  let categories: CATEGORY[] = $state([]);

  let contestName = $state("");
  let seedCounter = $state(0);
  let seedStr = $state("");

  let sheetRegistry: SheetRegistry = {
    count: 0,
    total: 0,
    sheets: [],
    clear: () => (sheetRegistry.sheets.length = sheetRegistry.count = sheetRegistry.total = 0),
    addSheet: s => {
      sheetRegistry.sheets.push(s);
      sheetRegistry.count += 1;
      if (sheetRegistry.count === sheetRegistry.total) {
        sheetRegistry.save();
      }
    },
    addCount: c => (sheetRegistry.count += c),
    addTotal: t => (sheetRegistry.total += t),
    save: () => {
      $dataService.config
        .zipPDF({
          name: contestName,
          files: sheetRegistry.sheets,
        })
        .then(file => {
          $dataService.config.revealFile(file);
        })
        .catch(err => console.log("ERROR: ", err));
    },
  };

  function drawScrambles(
    scr: string[],
    mode: MODE,
    round: number,
    name: string,
    settings: SCRAMBLE_SETTINGS
  ) {
    // All the values are in centimeters
    const W = 21.6;
    const H = 27.9;
    const PADDING_T = 1.3;
    const PADDING_D = 0.8;
    const EXTRA_HEADING = settings.extras ? 0.7 : 0;
    const SCRAMBLES_PER_PAGE = 5;

    let imgs: string[] = [];
    let CW = mode[3] || 30; // 33
    let CHM = mode[4] || [3]; // [3]

    const draw = () => {
      let pages =
        mode[1] === "r3ni"
          ? imgs.reduce(
              (acc: string[][], e) => {
                if (acc[acc.length - 1].length < SCRAMBLES_PER_PAGE) {
                  acc[acc.length - 1].push(e);
                  return acc;
                }
                return [...acc, [e]];
              },
              [[]]
            )
          : [imgs];

      const FRS = pages.map(
        p =>
          Math.min(
            5,
            ((H - PADDING_T - PADDING_D - EXTRA_HEADING - 4.3) * settings.factor) / (p.length || 1)
          ) - 0.2
      );

      $dataService.config
        .generateContestPDF({
          width: W,
          height: H,
          mode: name,
          round,
          html: getHTMLTemplate({
            contestName,
            name,
            mode,
            scr,
            pages,
            FRS,
            round,
            settings,
            SCRAMBLES_PER_PAGE,
            CHM,
            CW,
          }),
        })
        .then(sheet => {
          sheetRegistry.addSheet(sheet);
        });
    };

    let puzzles = scr.map(s => scrambleToPuzzle(s, mode[1])[0]);

    pGenerateCubeBundle(puzzles, 500, false, true).then(res => {
      imgs = res;
      draw();
    });
  }

  function getFactorFromMode(mode: string): number {
    if (/^(666|777)wca$/.test(mode)) return 0.92;
    if (mode === "clkwca") return 1;

    return 1.05;
  }

  function getModeSettings(ct: CATEGORY): SCRAMBLE_SETTINGS {
    const modeMap: Record<string, number> = {
      r3ni: +ct.scrambles,
      "666wca": 3,
      "777wca": 3,
      "333fm": 1,
    };

    const NO_EXTRAS = ["r3ni", "333fm"];
    const mode = ct.mode[1];

    return {
      scrambles: mode in modeMap ? modeMap[mode] : 5,
      extras: NO_EXTRAS.indexOf(mode) > -1 ? 0 : 2,
      factor: getFactorFromMode(mode),
    };
  }

  async function generateScrambles() {
    setSeed(seedCounter, seedStr);

    const SyncWorker = await import("@workers/scrambleWorker?worker");
    const imageWorker = new SyncWorker.default();

    imageWorker.onmessage = e => {
      const { data } = e;
      if (data.type === "done") {
        drawScrambles(data.batch, data.mode, data.round, data.name, data.settings);
      }
    };

    categories.forEach(ct => {
      let md = ct.mode;
      for (let i = 1, maxi = +ct.rounds; i <= maxi; i += 1) {
        sheetRegistry.addTotal(1);
        imageWorker.postMessage([
          i,
          $state.snapshot(md),
          getModeSettings(ct),
          ct.name,
          seedCounter,
          seedStr,
        ]);
      }
    });
  }

  function selectedGroup() {
    if (typeof group === "undefined") return;

    modes = MENU[group][1];
    mode = modes[0];
  }

  function getModeFormats(mode: string): FORMAT[] {
    if (["666wca", "777wca", "333fm"].indexOf(mode) > -1) {
      return ["Mo3", "Bo2", "Bo1"];
    }

    if (["333ni", "r3ni", "444bld", "555bld"].indexOf(mode) > -1) {
      return ["Bo3", "Bo2", "Bo1"];
    }

    return ["Ao5", "Bo3", "Bo2", "Bo1"];
  }

  function getModeFormat(mode: string): FORMAT {
    return getModeFormats(mode)[0] || "Ao5";
  }
</script>

<div
  class="shaded-card mt-4 max-w-5xl w-[calc(100%-2rem)] mx-auto mb-8 flex flex-col items-center gap-4"
>
  <input
    type="text"
    bind:value={contestName}
    class="input max-w-xs text-white"
    placeholder={$localLang.global.name + "..."}
  />

  <input bind:value={seedStr} class="input" type="text" placeholder="Seed string" />

  <input bind:value={seedCounter} class="input" type="text" placeholder="Seed counter" />

  <div class="flex flex-wrap items-center gap-2">
    <Select
      value={groups[group]}
      items={groups}
      transform={e => e}
      onChange={(g, p) => {
        group = p || 0;
        selectedGroup();
      }}
    />

    <Select
      value={mode}
      items={modes}
      label={e => e[0]}
      transform={e => e}
      onChange={g => {
        mode = g;
      }}
      hasIcon={v => v[1]}
    />

    <button
      class="btn btn-primary py-2"
      onclick={() =>
        (categories = [
          ...categories,
          {
            group: group,
            mode: mode,
            name: modeToName(mode, groups[group]),
            rounds: 1,
            format: getModeFormat(mode[1]),
            scrambles: mode[1] === "r3ni" ? 10 : 1,
          },
        ])}>{$localLang.CONTEST.addCategory}</button
    >
  </div>

  <ul class="flex flex-wrap justify-center items-center gap-4 pt-2">
    {#each categories as category, pos}
      {@const mbld = category.mode[1] === "r3ni"}

      <li
        class="shadow-md border rounded-md grid grid-cols-[auto_1fr] place-items-center gap-1 p-2 relative"
      >
        <CubeCategory icon={category.mode[1]} size="3rem" />

        <table>
          <tbody>
            <tr>
              <td>
                <input bind:value={category.name} class="input w-fit py-1 text-center" />
              </td>
            </tr>
            <tr>
              <td>
                <div class="grid grid-cols-2 gap-x-2">
                  <h4 class="text-center">{$localLang.CONTEST.rounds}</h4>
                  <h4 class="text-center">{$localLang.CONTEST.format}</h4>

                  <input
                    bind:value={category.rounds}
                    class="input py-1 text-center"
                    min={1}
                    max={4}
                    type="number"
                  />

                  <Select
                    bind:value={category.format}
                    items={getModeFormats(category.mode[1])}
                    transform={e => e}
                    class="w-full !bg-gray-600 !text-white"
                    placement="right"
                  />
                </div>
              </td>
            </tr>
            {#if mbld}
              <tr>
                <td>
                  <h4 class="text-center">{$localLang.global.scrambles}</h4>
                  <input
                    bind:value={category.scrambles}
                    class="input py-1 text-center"
                    min={2}
                    max={200}
                    type="number"
                  />
                </td>
              </tr>
            {/if}
          </tbody>
        </table>

        <button
          color="red"
          class="btn btn-error !p-1 w-7 h-7 min-h-0 aspect-square absolute -top-3 -right-2"
          onclick={() => {
            categories = categories.filter((_, p) => p != pos);
          }}><TrashIcon size="1rem" /></button
        >
      </li>
    {/each}
  </ul>

  {#if categories.length > 0 && contestName.trim()}
    <button class="btn btn-primary" onclick={generateScrambles}>
      {$localLang.global.generate}
    </button>
  {/if}
</div>
