<script lang="ts">
  import type { CubicDBData, Language, Session, Solve } from "@interfaces";
  import Select from "@material/Select.svelte";
  import { onMount } from "svelte";
  import Adaptors from "./adaptors";
  import { timer } from "@helpers/timer";
  import { DataService } from "@stores/data.service";
  import { derived, type Readable } from "svelte/store";
  import Checkbox from "@material/Checkbox.svelte";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import { ICONS, getModeMap } from "@constants";
  import { Card, Heading } from "flowbite-svelte";
  import Button from "@material/Button.svelte";
  import WcaCategory from "@components/wca/WCACategory.svelte";

  let MODE_MAP: Map<string, string>;

  let localLang: Readable<Language> = derived(globalLang, $lang => {
    let l = getLanguage($lang);
    MODE_MAP = getModeMap(l.MENU);
    return l;
  });

  let dataService = DataService.getInstance();

  let parser = 0;
  let mode = 0;
  let cubeData: CubicDBData | null = null;
  let ownData: CubicDBData = { sessions: [], solves: [] };
  let sSession: Session;
  let oSession: Session;
  let fSolves: Solve[] = [];
  let oSolves: Solve[] = [];

  let isImport = true;
  let rem = 0;

  function processFiles(list: FileList) {
    let fr = new FileReader();

    fr.addEventListener("loadend", e => {
      cubeData = Adaptors[parser].toCubicDB(fr.result as string, mode);
      cubeData.sessions = cubeData.sessions.filter(ss =>
        cubeData?.solves.reduce((acc, e) => acc + (e.session === ss._id ? 1 : 0), 0)
      );

      if (cubeData.sessions.length === 0) {
        cubeData = null;
      } else {
        let { sessions } = cubeData;

        for (let i = 0, maxi = sessions.length; i < maxi; i += 1) {
          if (sessions[i].settings.sessionType != "mixed") {
            for (let j = 0, maxj = ICONS.length; j < maxj; j += 1) {
              if (Array.isArray(ICONS[j].scrambler)) {
                if ((ICONS[j].scrambler as string[]).some(s => s === sessions[i].settings.mode)) {
                  sessions[i].icon = ICONS[j];
                  break;
                }
              } else if (ICONS[j].scrambler === sessions[i].settings.mode) {
                sessions[i].icon = ICONS[j];
                break;
              }
            }
          }
        }

        sessions.forEach(s => (s.editing = true));
        sSession = sessions[0];
      }
    });

    fr.readAsText(list[0]);
  }

  function save() {
    if (cubeData) {
      for (let i = 0, maxi = cubeData.sessions.length; i < maxi; i += 1) {
        let s = cubeData.sessions[i];
        if (!s.editing) continue;
        s.tName = s._id;
        s._id = "";
        rem += 1;
        dataService.addSession(s).then(ss => {
          rem -= 1;
          if (cubeData) {
            let solves = cubeData.solves.filter(s => {
              if (s.session === ss.tName) {
                s.session = ss._id;
                return true;
              }

              return false;
            });

            dataService.addSolves(solves);
          }
          if (rem === 0) {
            cubeData = null;
          }
        });
      }
    }
  }

  function selectAll() {
    cubeData?.sessions.forEach(s => (s.editing = true));
    cubeData = cubeData;
  }

  function selectNone() {
    cubeData?.sessions.forEach(s => (s.editing = false));
    cubeData = cubeData;
  }

  function selectAllOwn() {
    ownData?.sessions.forEach(s => (s.editing = true));
    ownData = ownData;
  }

  function selectNoneOwn() {
    ownData?.sessions.forEach(s => (s.editing = false));
    ownData = ownData;
  }

  function exportData() {
    let dt: CubicDBData = {
      sessions: [],
      solves: [],
    };

    let ss = ownData.sessions;
    let sv = oSolves;

    dt.sessions = ss.filter(s => s.editing);
    let ssId = dt.sessions.map(s => s._id);

    dt.solves = sv.filter(s => ssId.indexOf(s.session) > -1);

    const blob = new Blob([JSON.stringify(dt)], { type: "text/plain" });
    const a = document.createElement("a");
    a.download = `CubicDB-backup-${Date.now()}.json`;
    a.href = window.URL.createObjectURL(blob);
    a.click();
  }

  onMount(() => {
    dataService.getSolves().then(solves => {
      oSolves = solves
        .map(s => {
          let cp = { ...s };
          delete cp._id;
          return cp;
        })
        .sort((a, b) => (a.session < b.session ? -1 : 1));
    });

    dataService.getSessions().then(sessions => {
      ownData.sessions = sessions;
      oSession = ownData.sessions[0];
    });
  });

  $: fSolves = cubeData?.solves.filter(s => s.session === sSession?._id) || [];
</script>

<Card class="mx-auto mt-8 w-full max-w-3xl">
  <Heading tag="h3" class="text-center">{$localLang.IMPORT_EXPORT.title}</Heading>
  <section class="flex items-center gap-2 justify-center my-4">
    <Button
      on:click={() => (isImport = true)}
      class="bg-{isImport ? 'green' : 'gray'}-700 text-gray-300"
      >{$localLang.IMPORT_EXPORT.import}</Button
    >
    <Button
      on:click={() => (isImport = false)}
      class="bg-{!isImport ? 'green' : 'gray'}-700 text-gray-300"
      >{$localLang.IMPORT_EXPORT.export}</Button
    >

    {#if !isImport && ownData}
      <Button on:click={selectAllOwn} class="bg-orange-800 text-gray-300"
        >{$localLang.IMPORT_EXPORT.selectAll}</Button
      >
      <Button on:click={selectNoneOwn} class="bg-orange-800 text-gray-300"
        >{$localLang.IMPORT_EXPORT.selectNone}</Button
      >
      <Button on:click={exportData} class="bg-purple-800 text-gray-300"
        >{$localLang.global.save}</Button
      >
    {/if}
  </section>

  {#if isImport}
    <section>
      <div class="flex flex-wrap mx-auto items-center gap-2 justify-center">
        <span>{$localLang.IMPORT_EXPORT.from}:</span>
        <Select
          bind:value={parser}
          items={Adaptors}
          label={p => p.name}
          transform={(_, pos) => pos}
        />

        {#if Adaptors[parser].modes.length > 1}
          <Select bind:value={mode} items={Adaptors[parser].modes} transform={(_, pos) => pos} />
        {/if}

        <Button class="bg-purple-800 text-gray-300" file on:files={e => processFiles(e.detail)}
          >{$localLang.IMPORT_EXPORT.selectFile}</Button
        >

        {#if cubeData}
          <Button on:click={selectAll} class="bg-orange-800 text-gray-300"
            >{$localLang.IMPORT_EXPORT.selectAll}</Button
          >
          <Button on:click={selectNone} class="bg-orange-800 text-gray-300"
            >{$localLang.IMPORT_EXPORT.selectNone}</Button
          >
          <Button on:click={save} class="bg-green-800 text-gray-300"
            >{$localLang.global.save}</Button
          >
        {/if}
      </div>
    </section>

    {#if cubeData}
      <ul class="flex flex-wrap mt-4 gap-2 justify-center" style="row-gap: 1rem;">
        {#each cubeData.sessions as s}
          <li class="flex gap-1 mr-2">
            <Checkbox bind:checked={s.editing} />
            <Button
              on:click={() => (sSession = s)}
              class="p-2 bg-blue-700 bg-opacity-40 text-gray-300 rounded-md font-bold shadow-md cursor-pointer
              {s === sSession ? 'bg-opacity-100 underline' : ''} {s.icon ? ' pl-8' : ''}"
            >
              {#if s.icon}
                <span
                  class="absolute bg-purple-700 p-[.05rem] rounded-sm text-white
                  left-[.5rem] top-1/2 -translate-y-1/2"
                >
                  <WcaCategory icon={s.icon.icon} size="1rem" buttonClass="!p-[.1rem]" />
                </span>
              {/if}
              {s.name}
            </Button>
          </li>
        {/each}
      </ul>
      <ul class="text-center mt-4 max-h-96 overflow-scroll">
        {#if sSession}
          <span class="text-xl text-gray-300"
            >{$localLang.IMPORT_EXPORT.total}: {fSolves.length}
            {fSolves.length > 50 ? "(" + $localLang.IMPORT_EXPORT.showingOnly50 + ")" : ""}</span
          >
        {/if}
        {#each fSolves.slice(0, 50) as s, i}
          <li class="grid grid-cols-6 border-none border-b border-gray-500">
            <span>{i + 1}</span>
            <span>{MODE_MAP.get(s.mode || "") || "--"}</span>
            <span>{timer(s.time, true, true)}</span>
            <span class="overflow-hidden text-ellipsis whitespace-nowrap col-span-3 text-left"
              >{s.scramble}</span
            >
          </li>
        {/each}
      </ul>
    {/if}
  {:else if ownData}
    <ul class="flex flex-wrap mt-4 gap-2 justify-center" style="row-gap: 1rem;">
      {#each ownData.sessions as s}
        <li class="flex gap-1 mr-2">
          <Checkbox bind:checked={s.editing} />
          <Button
            on:click={() => (oSession = s)}
            class="p-2 bg-blue-700 bg-opacity-40 text-gray-300 rounded-md font-bold shadow-md cursor-pointer
              {s === oSession ? 'bg-opacity-100 underline' : ''}
              "
          >
            {s.name}
          </Button>
        </li>
      {/each}
    </ul>
    <ul class="text-center mt-4 max-h-96 overflow-scroll">
      {#if oSession}
        <span class="text-xl text-gray-300"
          >{$localLang.IMPORT_EXPORT.total}: {oSolves.length}
          {oSolves.length > 50 ? "(" + $localLang.IMPORT_EXPORT.showingOnly50 + ")" : ""}</span
        >
      {/if}
      {#each oSolves.slice(0, 50) as s, i}
        <li class="grid grid-cols-6 border-none border-b border-gray-500">
          <span>{i + 1}</span>
          <span>{MODE_MAP.get(s.mode || "") || "--"}</span>
          <span>{timer(s.time, true, true)}</span>
          <span class="overflow-hidden text-ellipsis whitespace-nowrap col-span-3 text-left"
            >{s.scramble}</span
          >
        </li>
      {/each}
    </ul>
  {/if}
</Card>
