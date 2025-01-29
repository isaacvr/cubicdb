<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { dataService } from "$lib/data-services/data.service";
  import TimerSessionIcon from "$lib/timer/TimerSessionIcon.svelte";
  import { BezierSticker } from "@classes/puzzle/BezierSticker";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { roundStickerCorners } from "@classes/puzzle/puzzleUtils";
  import { Vector3D } from "@classes/vector3d";
  import Select from "@components/material/Select.svelte";
  import Modal from "@components/Modal.svelte";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { ICONS, SessionDefaultSettings, STEP_COLORS, type SCRAMBLE_MENU } from "@constants";
  import { options } from "@cstimer/scramble/scramble";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { map } from "@helpers/math";
  import { newArr } from "@helpers/object";
  import { sTime, timer } from "@helpers/timer";
  import { SESSION_TYPE, type SessionType, type Solve } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { sessions } from "@stores/sessions.store";
  import { Input } from "flowbite-svelte";
  import { LayoutGridIcon, PlusIcon, Table2Icon } from "lucide-svelte";
  import { onMount } from "svelte";

  const iconSize = "1.2rem";
  const chartSamples = 40;

  let sortBy: "name" = $state("name");
  let sortCmp: "asc" | "desc" = $state("asc");
  let layout: "card" | "table" = $state("table");

  let MENU: SCRAMBLE_MENU[] = $derived($localLang.MENU);
  let groups: string[] = $derived(MENU.map(e => e[0]));
  let images: string[] = $state([]);
  let sessionMap = $state(new Map<string, string>());
  let sessionAmount = $state(new Map<string, number>());
  let sessionData = $state(new Map<string, Solve[]>());
  let newSessionType: SessionType = $state("mixed");
  let newSessionName = $state("");
  let newSessionSteps = $state(2);
  let newSessionGroup = $state(0);
  let newSessionMode = $state(0);
  let stepNames: string[] = $state(["", ""]);

  // Modals
  let showAddSessionDialog = $state(false);

  function sortSessions() {
    $sessions.sort((a, b) => {
      if (sortBy === "name") {
        return sortCmp === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }

      if (sortBy === "type") {
        let strA = a.settings.sessionType?.toString() || "";
        let strB = b.settings.sessionType?.toString() || "";

        return sortCmp === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }

      if (sortBy === "count") {
        let aC = sessionAmount.get(a._id) || 0;
        let bC = sessionAmount.get(b._id) || 0;

        return sortCmp === "asc" ? aC - bC : bC - aC;
      }
      return 0;
    });
  }

  function f(x: number) {
    const pot = 100;
    return Math.floor(x * pot) / pot;
  }

  function getChart(arr: number[]): string {
    if (arr.length === 0) return "";

    let W = arr.length - 1;
    let arrMax = Math.max(...arr);
    let arrMin = Math.min(...arr);
    const height = layout === "card" ? 50 : 100;
    const margin = 10;
    const mTop = height - margin;
    const mBottom = margin;
    const maxX = 250;

    let inner = "";

    if (arr.length >= 3) {
      let st = new BezierSticker(
        arr.map(
          (n, p) => new Vector3D(map(p, 0, W, 0, maxX), map(n, arrMin, arrMax, mTop, mBottom), 0)
        )
      );

      let bcs = roundStickerCorners(st, 0.4, 1, 10, true) as BezierSticker;

      inner = bcs.parts
        .slice(0, -1)
        .map(p => {
          if (p instanceof Vector3D) {
            return `L ${p.x} ${p.y}`;
          }

          let a = p.anchors;

          if (a.length === 3) {
            return `Q${f(a[1].x)} ${f(a[1].y)},${f(a[2].x)} ${f(a[2].y)}`;
          }

          return `C${f(a[1].x)} ${f(a[1].y)},${f(a[2].x)} ${f(a[2].y)},${f(a[3].x)} ${f(a[3].x)}`;
        })
        .join(" ");
    } else {
      inner = arr
        .map((v, p) => `L ${f(map(p, 0, W, 0, maxX))} ${f(map(v, arrMin, arrMax, mTop, mBottom))}`)
        .join(" ");
    }

    let d =
      `M-10 ${height * 1.01} L -10 ${f(map(arr[0], arrMin, arrMax, mTop, mBottom))}` +
      inner +
      `L ${maxX + 10} ${f(map(arr[W], arrMin, arrMax, mTop, mBottom))} L ${maxX + 10} ${
        height * 1.01
      }`;

    return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" width="100%" height="100%"
      viewBox="0 0 ${maxX} ${height}" fill="none" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="stroke-primary">
      <defs>
      <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
        <stop class="stop1" offset="0%" />
        <stop class="stop2" offset="100%" />
      </linearGradient>
      </defs>
      <style>.stop1{ stop-color: oklch(var(--p) / 0.3); } .stop2{ stop-color: oklch(var(--p) / 0); }</style>
      <path d="${d}" style="fill: url(#background);" />
      </svg>`;
  }

  function updateData() {
    $dataService.solve.getSolves().then(s => {
      let sm: Map<string, Solve[]> = s.reduce((acc, cur) => {
        if (!acc.has(cur.session)) {
          acc.set(cur.session, []);
        }
        acc.get(cur.session).push(cur);
        return acc;
      }, new Map());

      let resSM: Map<string, string> = new Map();
      let resSA: Map<string, number> = new Map();

      for (let [key, value] of sm) {
        value.sort((a, b) => a.date - b.date);
        resSA.set(key, value.length);
        resSM.set(
          key,
          getChart(
            value
              .map(sTime)
              .filter(t => Number.isFinite(t))
              .slice(-chartSamples)
          )
        );
      }

      sessionData = sm;
      sessionMap = resSM;
      sessionAmount = resSA;
    });

    layout = ($dataService.config.getPath("/timer/layout") || {}).layout || "table";
  }

  function getBest(sId: string) {
    if (!sessionData.has(sId)) return 0;
    return Math.min(...sessionData.get(sId)!.map(s => sTime(s)));
  }

  function getWorst(sId: string) {
    if (!sessionData.has(sId)) return Infinity;
    return Math.max(...sessionData.get(sId)!.map(s => sTime(s)));
  }

  function updateSessionsIcons() {
    for (let i = 0, maxi = $sessions.length; i < maxi; i += 1) {
      if ($sessions[i].settings?.sessionType != "mixed") {
        for (let j = 0, maxj = ICONS.length; j < maxj; j += 1) {
          if (Array.isArray(ICONS[j].scrambler)) {
            if (
              (ICONS[j].scrambler as string[]).some(
                s => $sessions[i].settings && s === $sessions[i].settings.mode
              )
            ) {
              $sessions[i].icon = ICONS[j];
              break;
            }
          } else if ($sessions[i].settings && ICONS[j].scrambler === $sessions[i].settings.mode) {
            $sessions[i].icon = ICONS[j];
            break;
          }
        }
      }
    }
  }

  function newSession() {
    let name = newSessionName.trim();

    if (!name) return;

    let settings = Object.assign({}, SessionDefaultSettings);

    settings.sessionType = newSessionType;

    if (newSessionType === "single" || newSessionType === "multi-step") {
      settings.mode = MENU[newSessionGroup][1][newSessionMode][1];
    }

    if (newSessionType === "multi-step") {
      settings.steps = newSessionSteps;
      settings.stepNames = stepNames;
    }

    $dataService.session.addSession({ _id: "", name, settings }).then(ns => {
      ns.tName = ns.name;
      $sessions = [...$sessions, ns];

      updateSessionsIcons();
      sortSessions();
    });

    showAddSessionDialog = false;
  }

  onMount(updateData);

  $effect(() => {
    pGenerateCubeBundle(
      $sessions.map(s => {
        let opts = options.get(s.settings.mode || "333");
        return opts
          ? new Puzzle({ ...(Array.isArray(opts) ? opts[0] : opts), view: "trans" })
          : new Puzzle({ type: "rubik" });
      }),
      250,
      false,
      false,
      true
    ).then(res => (images = res));
  });

  $effect(() => sortSessions());

  $effect(() => {
    $dataService.config.setPath("/timer/layout", { layout });
    $dataService.config.saveConfig();
  });
</script>

<div class="grid grid-rows-[2rem,1fr] gap-2 w-full h-full p-1 overflow-hidden">
  <div class="actions flex items-center gap-2">
    <Select
      class="border-none bg-primary bg-opacity-10"
      bind:value={sortBy}
      items={[
        { value: "name", label: $localLang.global.name },
        { value: "type", label: "<Type>" },
        { value: "count", label: $localLang.TIMER.count },
      ]}
      transform={e => e.value}
      label={e => e.label}
    />

    <Select
      class="border-none bg-primary bg-opacity-10"
      bind:value={sortCmp}
      items={[
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ]}
      transform={e => e.value}
      label={e => e.label}
    />

    <div class="join gap-1 bg-base-100 p-1 ml-auto">
      <Button
        size="sm"
        onclick={() => (layout = "card")}
        class={layout === "card" ? "bg-primary" : "shadow-transparent border-transparent"}
      >
        <LayoutGridIcon size={iconSize} />
      </Button>

      <Button
        size="sm"
        onclick={() => (layout = "table")}
        class={layout === "card" ? "shadow-transparent border-transparent" : "bg-primary"}
      >
        <Table2Icon size={iconSize} />
      </Button>
    </div>

    <Button onclick={() => (showAddSessionDialog = true)}>
      <PlusIcon size={iconSize} />
      {$localLang.TIMER.addNewSession}
    </Button>
  </div>

  {#if layout === "card"}
    <ul
      class="content overflow-y-auto overflow-x-clip grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]
      grid-rows-[repeat(auto-fit,6.2rem)] gap-2"
    >
      {#each $sessions as s, p}
        <li class="h-[6rem]">
          <a
            href={"/timer/" + s._id}
            class="btn w-full h-full shaded-card hover:bg-base-100 gap-2 grid grid-cols-[40%,60%]"
          >
            <div class="img">
              <PuzzleImage src={images[p]} />
            </div>
            <div class="session-content grid text-left h-full">
              <span class="text-x s font-light">{s.settings.sessionType}</span>
              <span class="font-normal">{s.name}</span>
              <div class="h-6">
                {@html sessionMap.get(s._id)}
              </div>
              <span class="!text-xs font-light bg-base-100 w-fit px-1 py-0 rounded-sm scale-90">
                {sessionAmount.get(s._id) || 0}
              </span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="overflow-y-scroll shaded-card py-2">
      <table class="table">
        <thead>
          <tr class="sticky top-0 bg-base-100 z-10">
            <th class="p-1 text-base-content rounded-l-md"></th>
            <th class="p-1 text-base-content">{$localLang.global.name}</th>
            <th class="p-1 text-base-content">&lt;Type&gt;</th>
            <th class="p-1 text-base-content">{$localLang.TIMER.count}</th>
            <th class="p-1 text-base-content">{$localLang.TIMER.best}</th>
            <th class="p-1 text-base-content">{$localLang.TIMER.worst}</th>
            <th class="p-1 text-base-content rounded-r-md"></th>
          </tr>
        </thead>

        <tbody>
          {#each $sessions as s, p}
            <tr>
              <td class="p-1 max-w-[2rem]"><PuzzleImage src={images[p]} /></td>
              <td class="p-1">
                <a
                  href={`/timer/${s._id}`}
                  class="text-base-content w-full flex hover:text-primary"
                >
                  {s.name}
                </a>
              </td>
              <td class="p-1">
                {$localLang.TIMER.sessionTypeMap[s.settings.sessionType || "single"]}
              </td>
              <td class="p-1">{sessionAmount.get(s._id) || 0}</td>
              <td class="p-1 text-success">
                {timer(getBest(s._id), true, true)}
              </td>
              <td class="p-1 text-error">
                {timer(getWorst(s._id), true, true)}
              </td>
              <td class="p-1 max-w-[5rem]">{@html sessionMap.get(s._id)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<Modal class="max-w-2xl" bind:show={showAddSessionDialog} closeOnClickOutside>
  <h2 class="text-center text-xl mb-4">{$localLang.TIMER.addNewSession}</h2>

  <div class="flex flex-col items-center gap-4">
    <i class="note">{$localLang.TIMER.sessionTypeDescription[newSessionType]}</i>
    <div class="flex flex-wrap gap-2 justify-center">
      <div class="flex items-center justify-center gap-2">
        <span class="text-sm">{$localLang.global.name}</span>

        <Input
          class="bg-base-100 text-base-content flex-1 max-w-[20ch]"
          bind:value={newSessionName}
        />
      </div>

      <Select
        items={SESSION_TYPE}
        label={e => $localLang.TIMER.sessionTypeMap[e]}
        transform={e => e}
        bind:value={newSessionType}
        class="mx-auto"
        hasIcon={e => e}
        IconComponent={TimerSessionIcon}
        placement="right"
      />
    </div>

    {#if newSessionType != "mixed"}
      <div class="flex flex-wrap gap-2 justify-center">
        {#if newSessionType === "multi-step"}
          <div class="flex items-center justify-center gap-2">
            <span class="text-sm">{$localLang.global.steps}</span>

            <Input
              class="bg-base-100 text-base-content flex-1 max-w-[10ch]"
              type="number"
              min={2}
              max={10}
              bind:value={newSessionSteps}
              on:change={_ =>
                (stepNames = [...stepNames, ...newArr(newSessionSteps).fill("")].slice(
                  0,
                  newSessionSteps
                ))}
            />
          </div>
        {/if}

        <Select
          class="min-w-[8rem]"
          placeholder={$localLang.TIMER.selectGroup}
          bind:value={newSessionGroup}
          items={groups}
          transform={(_, p) => p}
          placement="right"
        />

        <Select
          class="min-w-[8rem]"
          placeholder={$localLang.TIMER.selectMode}
          bind:value={newSessionMode}
          items={MENU[newSessionGroup][1]}
          label={e => e[0]}
          transform={(_, p) => p}
          placement="right"
          hasIcon={e => e[1]}
        />
      </div>
    {/if}

    {#if newSessionType === "multi-step"}
      <div class="flex flex-col gap-2 justify-center">
        <h2 class="text-base text-center">{$localLang.TIMER.stepNames}</h2>

        <ul class="flex flex-wrap justify-center items-center gap-2">
          {#each stepNames as _, p (p)}
            <li class="w-20">
              <Input
                class="bg-base-100 text-base-content"
                style={`border-color: ${STEP_COLORS[p]}; border-width: .15rem;`}
                placeholder={$localLang.global.step + " " + (p + 1)}
                bind:value={stepNames[p]}
              />
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <div class="flex justify-center gap-2 mx-auto pt-4">
    <Button color="cancel" onclick={() => (showAddSessionDialog = false)}>
      {$localLang.global.cancel}
    </Button>
    <Button color="primary" onclick={newSession}>
      {$localLang.global.save}
    </Button>
  </div>
</Modal>

<!-- {:else}
    <div
      class="grid gap-2 m-2 mt-4"
      style="grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));"
    >
      {#each sessions as s}
        <button
          class={"grid h-max border rounded-md relative " +
            (s.settings.sessionType === "mixed"
              ? "border-purple-400"
              : s.settings.sessionType === "single"
                ? "border-green-400"
                : "border-sky-500") +
            (s.icon ? " pl-8" : "")}
          on:click={() => {
            sessions.forEach(s1 => (s1.editing = false));
            s.editing = true;
          }}
        >
          {#if s.icon}
            <span
              class="absolute p-[.05rem] rounded-sm
                  left-[.5rem] top-1/2 -translate-y-1/2"
            >
              <CubeCategory icon={s.icon.icon} size="1rem" containerClass="!p-[.1rem]" />
            </span>
          {/if}

          <Input
            class={"!bg-transparent text-center text-ellipsis w-full rounded-none flex-1  " +
              (!s.editing ? " border-none " : "") +
              (s.icon ? " text-left pl-1 " : "")}
            bind:value={s.tName}
            focus={s.editing}
            on:keydown={e => {
              switch (e.code) {
                case "Enter": {
                  s.editing = false;
                  renameSession(s);
                  break;
                }
                case "Escape": {
                  s.editing = false;
                  e.stopPropagation();
                  // @ts-ignore
                  e.target.blur();
                  break;
                }
              }
            }}
          />
          <div class="flex items-center justify-center">
            {#if s.editing && !creatingSession}
              <button
                tabindex="0"
                class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                on:click|stopPropagation={ev => renameSession(s)}
              >
                <CheckIcon size="1.2rem" />
              </button>
              <button
                tabindex="0"
                class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                on:click|stopPropagation={() => (s.editing = false)}
              >
                <CloseIcon size="1.2rem" />
              </button>
              <button
                tabindex="0"
                class="text-gray-400 w-full h-8 cursor-pointer hover:text-blue-500"
                on:click|stopPropagation={() => {
                  sSession = s;
                  showDeleteSession = true;
                }}
              >
                <DeleteIcon size="1.2rem" />
              </button>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if} -->

<!-- <svelte:fragment slot="footer">
    {#if creatingSession}
      <div class="flex justify-center gap-2 mx-auto">
        <Button color="alternative" on:click={closeAddSession}>{$localLang.global.cancel}</Button>
        <Button on:click={newSession}>
          {$localLang.global.save}
        </Button>
      </div>
    {:else}
      <Button
        type="button"
        ariaLabel={$localLang.TIMER.addNewSession}
        on:click={openAddSession}
        class="mx-auto flex bg-primary-700 "
      >
        <PlusIcon />
        {$localLang.TIMER.addNewSession}
      </Button>
    {/if}
  </svelte:fragment> -->
