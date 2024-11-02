<script lang="ts">
  import {
    AverageSetting,
    Penalty,
    ROLES,
    ROLES_STR,
    type Contestant,
    type CubeEvent,
    type SheetRegistry,
    type Solve,
    type Language,
    type PuzzleOptions,
  } from "@interfaces";
  import Input from "@components/material/Input.svelte";
  import Button from "@material/Button.svelte";
  import Select from "@components/material/Select.svelte";
  import Tooltip from "@components/material/Tooltip.svelte";
  import DeleteIcon from "@icons/Delete.svelte";
  import MinusIcon from "@icons/Minus.svelte";
  import PlusIcon from "@icons/Plus.svelte";
  import CloseIcon from "@icons/Close.svelte";
  import { timer } from "@helpers/timer";
  import { getAverageS } from "@helpers/statistics";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import * as all from "@cstimer/scramble";
  import { globalLang } from "@stores/language.service";
  import { onMount } from "svelte";
  import Modal from "@components/Modal.svelte";
  import TextArea from "@components/material/TextArea.svelte";
  import { getLanguage } from "@lang/index";
  import type { Readable } from "svelte/motion";
  import { derived } from "svelte/store";
  import type { SCRAMBLE_MENU } from "@constants";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  // import { dataService } from "$lib/data-services/data.service";

  let MENU: SCRAMBLE_MENU[] = getLanguage($globalLang).MENU;
  let groups: string[] = [];

  let localLang: Readable<Language> = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MENU = l.MENU;
    groups = MENU.map(e => e[0]);
    return l;
  });

  void $localLang;

  const MODS: any = MENU[0][1].map(e => [
    e[0].replace(/(\d)x(\d)x(\d)(.*)$/, "$1x$2$4"),
    e[1],
    e[2],
    e[3],
    e[4],
  ]);
  const MODS_O = MENU[0][1].map(e => [e[0], e[1], e[2], e[3], e[4]]);
  const MOD_MAP: Map<string, any[]> = new Map();
  const MOD_MAP_O: Map<string, any[]> = new Map();
  const MOD_CANT: Map<string, number> = new Map();

  MODS.forEach((m: any) => MOD_MAP.set(m[1] as string, [m[0], m[2], m[3], m[4]]));
  MODS_O.forEach(m => MOD_MAP_O.set(m[1] as string, [m[0], m[2], m[3], m[4]]));

  let filteredMods: string[] = [];
  let indPerf: any = [];
  let modal: any;
  let show = false;
  let sSolve: Solve;
  let ev: CubeEvent | null = null;
  let allEvents: CubeEvent[] = [];

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
      // $dataService.config
      //   .zipPDF({
      //     name: ev?.name || "Contest",
      //     files: sheetRegistry.sheets,
      //   })
      //   .then(file => {
      //     dataService.revealFile(file);
      //   })
      //   .catch(err => console.log("ERROR: ", err));
    },
  };

  function createEvent() {
    ev = {
      _id: "",
      name: "",
      place: "",
      date: "",
      inscriptionCost: 0,
      inscriptionI: "",
      inscriptionF: "",
      contestants: [],
      rounds: {},
      status: "editing",
    };
  }

  function timeToSolve(time: number, mode: string): Solve {
    return {
      date: 0,
      penalty: Penalty.NONE,
      scramble: "",
      selected: false,
      session: "",
      time,
      mode,
    };
  }

  function addPerson() {
    if (!ev) return;

    ev.contestants.push({
      fullname: "",
      age: 15,
      categories: [],
      gender: "Hombre",
      oid: "",
      role: ROLES.CONTESTANT,
      expanded: true,
      results: {},
      otherData: "",
    });
    ev.contestants = ev.contestants;
    updateResults();
  }

  function deletePerson(pos: number) {
    if (!ev) return;

    ev.contestants.splice(pos, 1);
    ev.contestants = ev.contestants;
    updateResults();
  }

  function has(list: string[], e: string): boolean {
    return list.indexOf(e) > -1;
  }

  function toggle(c: Contestant, e: string) {
    if (!ev) return;

    let list = c.categories;

    if (has(list, e)) {
      list.splice(list.indexOf(e), 1);
      delete c.results[e];
    } else {
      list.push(e);
      c.results[e] = new Array(ev.rounds[e]).fill(0).map((_, idx) => ({
        mode: e,
        round: idx + 1,
        solves: [0, 0, 0, 0, 0].map(t => timeToSolve(t, e)),
      }));
    }

    ev.contestants = ev.contestants;
    updateResults();
  }

  function bestWorst(sv: Solve[]): Solve[] {
    return sv.reduce(
      (ac, b) => [
        b.penalty === Penalty.DNF ? ac[0] : b.time < ac[0].time ? b : ac[0],
        b.penalty === Penalty.DNF ? ac[1] : b.time > ac[1].time ? b : ac[1],
      ],
      [timeToSolve(Infinity, ""), timeToSolve(-Infinity, "")]
    );
  }

  function getCategory(ct: string): { name: string; Ao5: number; best: number }[][] {
    if (!ev) return [];

    return ev.contestants
      .reduce((acc: any, cnt: any) => {
        if (cnt.categories.indexOf(ct) > -1) {
          cnt.results[ct].forEach((r: any) => {
            if (!Array.isArray(acc[r.round - 1])) {
              acc[r.round - 1] = [];
            }

            acc[r.round - 1].push({
              name: cnt.fullname,
              Ao5: getAverageS(5, r.solves, AverageSetting.SEQUENTIAL)[4],
              best: numberToTime(
                r.solves
                  .map((e: any) => (e.penalty === Penalty.DNF ? Infinity : e.time))
                  .sort((a: any, b: any) => a - b)[0]
              ),
            });
          });
        }
        return acc;
      }, [] as any)
      .map((r: any) =>
        r
          .sort((a: any, b: any) => a.Ao5 - b.Ao5)
          .map((e: any) => {
            e.Ao5 = numberToTime(e.Ao5);
            return e;
          })
      );
  }

  function numberToTime(n: number | null): string {
    return n ? timer(n, true) : "--";
  }

  function solveToTime(s: Solve): { time: string; p2: boolean } {
    return {
      time: s.penalty === Penalty.DNF ? "DNF" : numberToTime(s.time),
      p2: s.penalty === Penalty.P2,
    };
  }

  function updateResults() {
    if (!ev) return;

    MOD_CANT.clear();

    filteredMods = [
      ...ev.contestants
        .map(c => c.categories)
        .reduce((st, c) => {
          c.forEach(ct => {
            st.add(ct);
            MOD_CANT.set(ct, ~~(MOD_CANT.get(ct) || 0) + 1);
          });
          return st;
        }, new Set<string>()),
    ];

    let tempMP: any = {};

    for (let i = 0, maxi = filteredMods.length; i < maxi; i += 1) {
      if (Object.keys(ev.rounds).indexOf(filteredMods[i]) > -1) {
        tempMP[filteredMods[i]] = ev.rounds[filteredMods[i]];
      } else {
        tempMP[filteredMods[i]] = 1;
      }
    }

    ev.rounds = tempMP;

    for (let i = 0, maxi = ev.contestants.length; i < maxi; i += 1) {
      let cnt = ev.contestants[i];
      let resK = cnt.categories;

      for (let j = 0, maxj = resK.length; j < maxj; j += 1) {
        const cat = resK[j];

        if (filteredMods.indexOf(cat) < 0) {
          delete cnt.results[cat];
        } else {
          let res = cnt.results[cat].slice(0, ev.rounds[cat]);

          for (let k = res.length, maxk = ev.rounds[cat]; k < maxk; k += 1) {
            res.push({
              round: k + 1,
              solves: new Array(5).fill(0).map(t => timeToSolve(t, cat)),
            });
          }

          cnt.results[cat] = res;
        }
      }
    }

    indPerf = ev.contestants.reduce((acc, cnt) => {
      let obj = {
        contestant: cnt.fullname,
        results: [],
        cnt,
      } as any;

      Object.keys(cnt.results).forEach(cat => {
        let cr = cnt.results[cat];

        cr.forEach(r => {
          obj.results.push({
            category: cat,
            round: r.round,
            times: [
              ...r.solves,
              { time: numberToTime(getAverageS(5, r.solves, AverageSetting.SEQUENTIAL)[4]) },
              ...bestWorst(r.solves).map(solveToTime),
            ],
          });
        });
      });

      acc.push(obj);

      return acc;
    }, [] as any[]);
  }

  function drawScrambles(scr: string[], mode: string, round: number) {
    if (!ev) return;

    const FACTOR = 1.291666666666667; // Letter h / w ratio (216 x 279)
    const W = 21.6; // 21.6cm
    const H = W * FACTOR;
    const PADDING_V = 1; // 1cm
    const FR =
      ((H - scr.length * PADDING_V) * (/^(666|777)wca$/.test(mode) ? 0.8 : 0.9)) / scr.length;

    let imgs: string[] = [];

    let CW = (MOD_MAP.get(mode) || [])[2]; // 33
    let CHM = (MOD_MAP.get(mode) || [])[3]; // [3]

    const draw = () => {
      if (!ev) return;

      // $dataService.config
      //   .generateContestPDF({
      //     width: W,
      //     height: H,
      //     mode: (MOD_MAP_O.get(mode) || [])[0],
      //     round,
      //     html: `
      //   <!DOCTYPE html>
      //     <html>
      //     <body>
      //       <h1 style="text-align: center;">${ev.name}</h1>
      //       <p style="text-align: center;">${(MOD_MAP_O.get(mode) || [])[0]} Ronda ${round}</p>
      //       <table>
      //         ${imgs
      //           .map(
      //             (img, p) => `
      //             ${
      //               p + 2 === imgs.length
      //                 ? '<tr><td colspan="3" style="text-align: center;"><h3>Extra scrambles</h3></td></tr>'
      //                 : ""
      //             }
      //             <tr>
      //               <td style="width: 20px; padding-inline: 16px; text-align: center;">
      //                 ${p + 2 >= imgs.length ? "E" + (p - imgs.length + 3) : p + 1}
      //               </td>
      //               <td>
      //                 <div class="scramble">
      //                   ${
      //                     scr[p]
      //                       .replace(/<br>/g, "")
      //                       .split(/\s+/)
      //                       .reduce(
      //                         (acc, p, i) => [
      //                           ...acc,
      //                           ...(
      //                             p + " ".repeat(Math.max(CHM[i % CHM.length] - p.length, 1))
      //                           ).split(""),
      //                         ],
      //                         new Array()
      //                       )
      //                       .map(
      //                         (s, i) =>
      //                           `<span class="${~~(i / CW) % 2 === 0 ? "" : "bg-gray"}">${s}</span>`
      //                       )
      //                       .join("")
      //                     // scr[p].split(/\s+/).map((p, i) => (p + " ".repeat(CHM[ i % CHM.length ] - p.length)).split("").map(
      //                     //   (s) => `<span style="background-color: ${ (~~(i / CW)) % 2 === 0 ? "white" : "rgb(237, 237, 255)" };">${s}</span>`
      //                     // ).join("") ).join("")
      //                   }
      //                 </div>
      //               </td>
      //               <td style="width: 0cm;"><img src="${img}" style="height: ${FR}cm;"></td>
      //             </tr>
      //           `
      //           )
      //           .join(" ")}
      //       </table>
      //       <p style="text-align: center;">Generated by CubicDB</p>
      //     </body>
      //     <${"style"}>
      //       @font-face {
      //         font-family: 'Cqmono';
      //         src: url('http://127.0.0.1:5000/assets/fonts/CQMono.otf');
      //       }

      //       * {
      //         font-family: "Arial";
      //       }

      //       table, th, td {
      //         border: 1px solid black;
      //         border-collapse: collapse;
      //         width: 100%;
      //       }

      //       .scramble {
      //         display: grid;
      //         grid-template-columns: repeat(${CW}, 1fr);
      //         padding-inline: 1rem;
      //       }

      //       .scramble span {
      //         font-size: ${map(mode === "sqrs" ? 40 : CW, 30, 48, 1.2, 0.85)}rem;
      //       }

      //       .scramble span.bg-gray {
      //         background: #ededff;
      //       }
      //     </style>
      //   </html>`,
      //   })
      //   .then(sheet => {
      //     sheetRegistry.addSheet(sheet);
      //   });
    };

    let puzzles = scr.map(s =>
      Puzzle.fromSequence(s, {
        ...all.pScramble.options.get(mode),
        rounded: true,
        headless: true,
      } as PuzzleOptions)
    );

    pGenerateCubeBundle(puzzles, 1000, false, true, false, "raster").then(res => {
      imgs = res;
      draw();
    });
  }

  async function generateScrambles() {
    const SyncWorker = await import("@workers/scrambleWorker?worker");
    const imageWorker = new SyncWorker.default();

    imageWorker.onmessage = e => {
      if (!ev) return;

      const { data } = e;
      if (data.type === "done") {
        let round = ev.rounds[data.mode]--;
        ev.rounds[data.mode] = Math.max(1, ev.rounds[data.mode]);
        drawScrambles(data.batch, data.mode, round);
      }
    };

    const BIG = ["666wca", "777wca"];

    filteredMods.map(m => {
      if (!ev) return;

      for (let i = 1, maxi = ev.rounds[m]; i <= maxi; i += 1) {
        sheetRegistry.addTotal(1);
        imageWorker.postMessage([m, (MOD_MAP_O.get(m) as any)[1], BIG.indexOf(m) > -1 ? 5 : 7]);
      }
    });
  }

  function modalClosehandler() {
    show = false;
    updateResults();
  }

  function setPenalty(p: Penalty) {
    if (p === Penalty.P2) {
      sSolve.penalty != Penalty.P2 && (sSolve.time += 2000);
    } else if (sSolve.penalty === Penalty.P2) {
      sSolve.time -= 2000;
    }
    sSolve.penalty = p;
  }

  function timerToMilli(n: number): number {
    let p = [];
    p.push(n % 100);
    n = ~~(n / 100);
    p.push(n % 100);
    n = ~~(n / 100);
    p.push(n);
    return p[2] * 60000 + p[1] * 1000 + p[0] * 10;
  }

  function setTime(ev: CustomEvent<KeyboardEvent>) {
    if (sSolve.comments && /^\s*\d{1,6}\s*$/.test(sSolve.comments)) {
      sSolve.time = timerToMilli(+sSolve.comments);
    } else {
      sSolve.comments = "";
    }

    if (ev.detail.ctrlKey) {
      modalClosehandler();
    }
  }

  function saveContest() {
    if (!ev) return;

    // if (ev._id) {
    //   dataService.updateContest(ev);
    // } else {
    //   delete (ev as any)._id;
    //   dataService.addContest(ev).then(e => {
    //     if (!ev) return;
    //     ev._id = e._id;
    //   });
    // }
  }

  onMount(() => {
    // dataService.getContests().then(data => (allEvents = data));
  });
</script>

<main class="container-mini pt-4">
  {#if ev}
    <article class="text-gray-400 bg-white bg-opacity-10 py-8 rounded-md max-w-5xl mx-auto">
      {#if ev.status === "editing"}
        <h1 class="text-3xl text-center font-bold mt-2 text-gray-300">Organizador de Eventos</h1>
        <h2 class="text-2xl text-center font-bold mb-6 mt-2 text-gray-300">Datos generales</h2>

        <section class="max-w-3xl mx-auto" id="event-data">
          <span class="flex mr-2 items-center justify-end">Nombre del evento</span>
          <Input bind:value={ev.name} />

          <span class="flex mr-2 items-center justify-end">Lugar</span>
          <Input bind:value={ev.place} />

          <span class="flex mr-2 items-center justify-end">Fecha</span>
          <Input bind:value={ev.date} type="date" />

          <span class="flex mr-2 items-center justify-end">Inicio de la inscripción</span>
          <Input bind:value={ev.inscriptionI} type="date" />

          <span class="flex mr-2 items-center justify-end">Fin de la inscripción</span>
          <Input bind:value={ev.inscriptionF} type="date" />

          <span class="flex mr-2 items-center justify-end">Costo de inscripción</span>
          <Input bind:value={ev.inscriptionCost} type="number" />
        </section>

        {#if Object.keys(ev.rounds).length}
          <h2 class="text-2xl text-center font-bold mb-2 mt-6 text-gray-300">
            Rondas por categorías
          </h2>
          <div id="rounds-container" class="text-gray-300">
            {#each filteredMods as fr}
              <div
                class="card w-24 h-32 grid place-items-center bg-white bg-opacity-10 rounded-md shadow-md"
              >
                <span>{(MOD_MAP.get(fr) || [""])[0]}</span>
                <span>Rounds</span>
                <Input
                  class="bg-transparent"
                  inpClass="text-center"
                  on:change={updateResults}
                  bind:value={ev.rounds[fr]}
                  type="number"
                  min={1}
                  max={10}
                />
              </div>
            {/each}
          </div>
        {/if}

        <section>
          <h2 class="text-2xl text-center font-bold mb-6 mt-2 text-gray-300">
            Datos de los competidores
          </h2>
          {#each ev.contestants as cnt, pos}
            <div class="bg-white bg-opacity-10 rounded-md p-4 shadow-sm mb-8 mx-4 relative">
              <div class="options absolute right-4 flex">
                <Tooltip
                  class="text-gray-400 cursor-pointer"
                  text={cnt.expanded ? "Contraer" : "Expandir"}
                  position="top"
                >
                  <button
                    class="w-8 h-8 rounded-full grid place-items-center transition-all duration-200
                    hover:bg-gray-700 hover:text-gray-200"
                    on:click={() => (cnt.expanded = !cnt.expanded)}
                  >
                    {#if cnt.expanded}
                      <MinusIcon width="1.2rem" height="1.2rem" />
                    {:else}
                      <PlusIcon width="1.2rem" height="1.2rem" />
                    {/if}
                  </button>
                </Tooltip>

                <Tooltip class="text-gray-400 cursor-pointer" text="Eliminar" position="top">
                  <button
                    class="w-8 h-8 rounded-full grid place-items-center transition-all duration-200
                    hover:bg-red-700 hover:text-gray-200"
                    on:click={() => deletePerson(pos)}
                  >
                    <DeleteIcon width="1.2rem" height="1.2rem" />
                  </button>
                </Tooltip>
              </div>

              {#if cnt.expanded}
                <div class="flex gap-2">
                  <span class="text-gray-300 font-bold flex items-center">Nombre completo</span>
                  <Input bind:value={cnt.fullname} class="bg-gray-600 w-80 text-gray-300" />
                  <span class="text-gray-300 font-bold flex items-center ml-4">Sexo</span>
                  <Select
                    items={["Hombre", "Mujer"]}
                    transform={e => e}
                    bind:value={cnt.gender}
                    class="border border-gray-400 text-gray-300 rounded-md"
                  />
                </div>
                <div class="flex gap-2 mt-4">
                  <span class="text-gray-300 font-bold flex items-center"
                    >Identificación oficial</span
                  >
                  <Input bind:value={cnt.oid} class="bg-gray-600 w-80 text-gray-300" />
                  <span class="text-gray-300 font-bold flex items-center ml-4">Edad</span>
                  <Input
                    bind:value={cnt.age}
                    class="bg-gray-600 w-20 text-gray-300"
                    type="number"
                    min={10}
                    max={100}
                  />
                </div>
                <div class="flex gap-2 mt-4">
                  <span class="text-gray-300 font-bold flex items-center">Otros datos</span>
                  <TextArea bind:value={cnt.otherData} class="bg-gray-600 w-80 text-gray-300" />
                </div>
                <div class="flex gap-2 my-10 flex-wrap justify-around">
                  <span class="text-gray-300 font-bold flex items-center"> Modalidades: </span>
                  {#each MODS as MOD}
                    <Tooltip text="Toca para activar o desactivar" position="top">
                      <button
                        class="mod flex w-max"
                        class:selected={has(cnt.categories, MOD[1] || "")}
                        on:click={() => {
                          toggle(cnt, MOD[1] || "");
                          cnt.categories = cnt.categories;
                        }}>{MOD[0]}</button
                      >
                    </Tooltip>
                  {/each}
                </div>
                <div class="flex gap-2 mt-4">
                  <span class="text-gray-300 font-bold flex items-center"> Roles: </span>
                  {#each ROLES_STR as ROLE, rindex}
                    <Tooltip text="Toca para activar o desactivar" position="top">
                      <button
                        class="role"
                        class:selected={cnt.role & (1 << rindex)}
                        on:click={() => (cnt.role ^= 1 << rindex)}>{ROLE}</button
                      >
                    </Tooltip>
                  {/each}
                </div>
              {:else}
                <h2 class="text-gray-300 font-bold text-center">
                  {cnt.fullname} ({cnt.oid}), {cnt.age} años.
                </h2>
              {/if}
            </div>
          {/each}
        </section>
      {:else}
        <h1 class="text-3xl text-center font-bold mb-6 mt-2 text-gray-300">{ev.name}</h1>

        <section>
          <h2 class="text-2xl text-gray-300 font-bold text-center border-t border-gray-500 py-4">
            Desempeño individual
          </h2>
          {#each indPerf as pf}
            <div class="bg-white bg-opacity-10 rounded-md p-4 shadow-sm mb-8 mx-4 relative">
              <h2 class="text-2xl text-green-400 font-bold">{pf.contestant}</h2>

              <div class="options absolute right-4 top-2 flex">
                <Tooltip
                  class="text-gray-400 cursor-pointer"
                  text={pf.cnt.expanded ? "Contraer" : "Expandir"}
                  position="top"
                >
                  <button
                    class="w-8 h-8 rounded-full grid place-items-center transition-all duration-200
                bg-gray-600 hover:bg-gray-600 hover:text-gray-200"
                    on:click={() => (pf.cnt.expanded = !pf.cnt.expanded)}
                  >
                    {#if pf.cnt.expanded}
                      <MinusIcon width="1.2rem" height="1.2rem" />
                    {:else}
                      <PlusIcon width="1.2rem" height="1.2rem" />
                    {/if}
                  </button>
                </Tooltip>
              </div>

              {#if pf.cnt.expanded}
                <div
                  class="result-table text-gray-300 mt-4 border-t border-gray-500 pt-2 overflow-scroll"
                >
                  <span class="font-bold text-lg">Categoría</span>
                  <span class="font-bold text-lg">Ronda</span>
                  <span class="font-bold text-lg">T1</span>
                  <span class="font-bold text-lg">T2</span>
                  <span class="font-bold text-lg">T3</span>
                  <span class="font-bold text-lg">T4</span>
                  <span class="font-bold text-lg">T5</span>
                  <span class="font-bold text-lg">Ao5</span>
                  <span class="font-bold text-lg">Mejor</span>
                  <span class="font-bold text-lg">Peor</span>

                  {#each pf.results as res}
                    <hr class="col-span-full border-0 border-t border-t-gray-400 h-0 w-full" />
                    <span class="text-lg text-gray-300 font-bold"
                      >{(MOD_MAP.get(res.category) || [""])[0]}</span
                    >
                    <span class="text-lg text-gray-300 font-bold">{res.round}</span>
                    {#each res.times as t, i}
                      <button
                        on:click={() => {
                          sSolve = t;
                          sSolve.comments = "";
                          show = true;
                        }}
                        class={i < 5
                          ? `cursor-pointer hover:text-yellow-100 transition-all duration-200`
                          : "pointer-events-none"}
                      >
                        <span
                          class="time font-bold {i === 5
                            ? 'text-blue-400'
                            : i === 6
                              ? 'text-green-400'
                              : i === 7
                                ? 'text-orange-400'
                                : ''}"
                        >
                          {i < 5 ? solveToTime(t).time : t.time}
                        </span>

                        <div
                          class="absolute right-1 top-0 h-full flex flex-col items-center justify-evenly"
                        >
                          {#if i != 5 && t.p2}
                            <span class="font-small">+2</span>
                          {/if}
                        </div>
                      </button>
                    {/each}
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          <h2
            class="text-2xl text-gray-300 font-bold text-center border-t border-gray-500 py-4 mt-6"
          >
            Desempeño por categorías
          </h2>

          {#each filteredMods as fm}
            <div class="bg-white bg-opacity-10 rounded-md p-4 shadow-sm mb-8 mx-4 relative">
              <h2 class="text-2xl text-center text-green-400 font-bold">
                {(MOD_MAP.get(fm) || [""])[0]}
              </h2>

              {#each getCategory(fm) as rnd, i}
                <h2 class="text-xl text-gray-300 font-bold text-center {i ? 'mt-8' : 'mt-2'}">
                  Ronda {i + 1}
                </h2>
                <div class="result-table-c text-gray-300 mt-4 border-t border-gray-500 pt-2">
                  <span class="font-bold text-xl text-blue-400">Nombre</span>
                  <span class="font-bold text-xl text-blue-400">Ao5</span>
                  <span class="font-bold text-xl text-blue-400">Mejor tiempo</span>

                  {#each rnd as cnt}
                    <span class="text-lg">{cnt.name}</span>
                    <span>{cnt.Ao5}</span>
                    <span>{cnt.best}</span>
                  {/each}
                </div>
              {/each}
            </div>
          {/each}
        </section>
      {/if}

      <div
        class="flex gap-4 mx-auto py-4 items-center justify-center sticky bg-gray-500 bg-opacity-80 bottom-0"
      >
        <Button
          class="bg-purple-800 text-gray-300"
          on:click={() => ev && (ev.status = ev.status === "editing" ? "running" : "editing")}
          >Cambiar a {ev.status === "editing" ? "ejecución" : "edición"}</Button
        >

        {#if ev.status === "editing"}
          <Button class="bg-blue-800 text-gray-300" on:click={addPerson}>Agregar persona</Button>
        {:else}
          <Button class="bg-orange-800 text-gray-300" on:click={generateScrambles}
            >Generar scrambles</Button
          >
        {/if}

        <Button class="bg-green-800 text-gray-300" on:click={saveContest}>Guardar</Button>
        <Button
          class="bg-red-800 text-gray-300"
          on:click={() => {
            ev = null;
            // dataService.getContests().then(data => (allEvents = data));
          }}>Salir</Button
        >
      </div>
    </article>
  {:else}
    <article class="text-gray-400 bg-white bg-opacity-10 py-8 rounded-md max-w-5xl mx-auto">
      <h1 class="text-3xl text-center font-bold mt-2 text-gray-300">Seleccione el evento</h1>
      <Button class="bg-green-800 text-gray-300 mx-auto my-4" on:click={createEvent}
        >Crear evento</Button
      >
      <ul class="max-w-lg grid m-auto bg-white bg-opacity-10 p-4 mt-4 rounded-md">
        {#each allEvents as event}
          <button
            on:click={() => {
              ev = event;
              updateResults();
            }}
            class="p-2 rounded-md cursor-pointer transition-all duration-200 mb-2 bg-white bg-opacity-10
          text-gray-300 hover:bg-blue-300 hover:bg-opacity-50 hover:shadow-md hover:text-black"
          >
            {event.name} - {event.place}
          </button>
        {/each}
      </ul>
    </article>
  {/if}

  <Modal bind:this={modal} bind:show onClose={modalClosehandler}>
    <div class="flex flex-col justify-between items-center text-gray-400 m-2">
      <h2 class="m-1 w-full text-center text-gray-300 text-2xl font-bold">
        {timer(sSolve.time, true, true)}
      </h2>
      <div class="flex w-full gap-4 items-center justify-center">
        <span>Time</span>
        <Input class="w-[20ch]" bind:value={sSolve.comments} on:UENTER={setTime} focus={show} />
        <Button on:click={setTime}>Asignar</Button>
      </div>
      <span class="w-full max-w-[40ch] text-justify text-gray-500 italic mt-4">
        El tiempo debe darse en el formato de los timers pero sin símbolos. Por ejemplo
        <mark>1:23.45</mark> en el timer, se debe escribir como <mark>12345</mark>.
      </span>
    </div>
    <div class="mt-2 flex justify-center">
      <Button flat on:click={() => modal.close()}><CloseIcon /> Cerrar</Button>
      <Button
        flat
        class={sSolve.penalty === Penalty.P2 ? "text-red-500" : ""}
        on:click={() => setPenalty(Penalty.P2)}>+2</Button
      >

      <Button
        flat
        class={sSolve.penalty === Penalty.DNF ? "text-red-500" : ""}
        on:click={() => setPenalty(Penalty.DNF)}>DNF</Button
      >

      <Button
        flat
        class={sSolve.penalty === Penalty.NONE ? "text-green-500" : ""}
        on:click={() => setPenalty(Penalty.NONE)}>Sin penalización</Button
      >
    </div>
  </Modal>
</main>

<style lang="postcss">
  .container-mini {
    height: calc(100vh - 7rem);
    overflow: scroll;
  }

  #event-data {
    display: grid;
    grid-template-columns: auto 20rem;
    place-content: center;
    grid-gap: 1rem;
  }

  .role,
  .mod {
    @apply bg-gray-500 text-gray-300 py-1 px-2 rounded-full cursor-pointer hover:bg-gray-600
      transition-all duration-200 select-none shadow-md;
  }

  .role.selected {
    @apply bg-green-700;
  }

  .mod.selected {
    @apply bg-purple-700;
  }

  .result-table {
    @apply grid place-items-center;
    grid-template-columns: repeat(10, 1fr);
    grid-gap: 0.5rem;
  }

  .result-table-c {
    @apply grid place-items-center;
    grid-template-columns: repeat(3, 1fr);
  }

  #rounds-container {
    @apply flex p-4 gap-4 flex-wrap justify-center;
  }
</style>
