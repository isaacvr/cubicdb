<script lang="ts">
  import type { CubeDBData, Language, Session, Solve } from "@interfaces";
  import Button from "@components/material/Button.svelte";
  import Select from "@components/material/Select.svelte";
  import { onDestroy, onMount } from "svelte";
  import Adaptors from "./adaptors";
  import { MODE_MAP } from "@constants";
  import { timer } from "@helpers/timer";
  import { DataService } from "@stores/data.service";
  import { derived, type Readable, type Unsubscriber } from "svelte/store";
  import Checkbox from "@components/material/Checkbox.svelte";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  let dataService = DataService.getInstance();

  let parser = 0;
  let mode = 0;
  let cubeData: CubeDBData | null = null;
  let ownData: CubeDBData = { sessions: [], solves: [] };
  let sSession: Session;
  let oSession: Session;
  let fSolves: Solve[] = [];
  let oSolves: Solve[] = [];
  let sSub: Unsubscriber;
  let svSub: Unsubscriber;

  let isImport = true;
  let rem = 0;

  function processFiles(list: FileList) {
    let fr = new FileReader();

    fr.addEventListener('loadend', (e) => {
      cubeData = Adaptors[ parser ].toCubeDB(fr.result as string, mode);
      cubeData.sessions = cubeData.sessions.filter(ss => cubeData?.solves.reduce((acc, e) => acc + (e.session === ss._id ? 1 : 0), 0));
      
      if ( cubeData.sessions.length === 0 ) {
        cubeData = null;
      } else {
        cubeData.sessions.forEach(s => s.editing = true);
        sSession = cubeData.sessions[0];
      }
    });

    fr.readAsText(list[0]);
  }

  function save() {
    if ( cubeData ) {
      for (let i = 0, maxi = cubeData.sessions.length; i < maxi; i += 1) {
        let s = cubeData.sessions[i];
        if ( !s.editing ) continue;
        s.tName = s._id;
        s._id = "";
        rem += 1;
        dataService.addSession(s);
      }
    }
  }

  function selectAll() {
    cubeData?.sessions.forEach(s => s.editing = true);
    cubeData = cubeData;
  }

  function selectNone() {
    cubeData?.sessions.forEach(s => s.editing = false);
    cubeData = cubeData;
  }

  function exportData() {
    let dt: CubeDBData = {
      sessions: [],
      solves: [],
    };

    let ss = ownData.sessions;
    let sv = oSolves;
    
    dt.sessions = ss.filter(s => s.editing);
    let ssId = dt.sessions.map(s => s._id);

    dt.solves = sv.filter(s => ssId.indexOf(s.session) > -1);

    const blob = new Blob([ JSON.stringify(dt) ], { type: 'text/plain' });
    const a = document.createElement('a');
    a.download = `CubeDB-backup-${ Date.now() }.json`;
    a.href = window.URL.createObjectURL(blob);
    a.click();
  }

  onMount(() => {
    sSub = dataService.sessSub.subscribe((e) => {
      if ( !e ) return;

      switch(e.type) {
        case 'add-session': {
          let ss = <Session> e.data;
          rem -= 1;
          if ( cubeData ) {
            for (let i = 0, maxi = cubeData.solves.length; i < maxi; i += 1) {
              let sv = cubeData.solves[i];
              if ( ss.tName === sv.session ) {
                sv.session = ss._id;
                dataService.addSolve(sv);
              }
            }
          }
          if ( rem === 0 ) {
            cubeData = null;
          }
          break;
        }

        case 'get-sessions': {
          let sessions = e.data as Session[];
          ownData.sessions = sessions;
          oSession = ownData.sessions[0];
          break;
        }
      }
    });

    svSub = dataService.solveSub.subscribe((e) => {
      if ( !e || !e.data ) {
        return;
      }

      switch(e.type) {
        case 'get-solves': {
          let solves = e.data as Solve[];

          oSolves = solves.map(s => {
            let cp = { ...s };
            delete cp._id;
            return cp;
          });
          break;
        }
      }
    });

    dataService.getSolves();
    dataService.getSessions();
  });

  onDestroy(() => {
    sSub();
    svSub();
  });

  $: fSolves = cubeData?.solves.filter(s => s.session === sSession?._id) || [];

</script>

<main class="container-mini mx-auto max-w-4xl bg-white bg-opacity-10 rounded-md text-gray-400 p-4">
  <h1 class="text-center text-3xl text-gray-300">{ $localLang.IMPORT_EXPORT.title }</h1>
  <section class="flex items-center gap-2 justify-center my-4">
    <Button on:click={ () => isImport = true } class="bg-{ isImport ? "green" : "gray"}-800 text-gray-300">{ $localLang.IMPORT_EXPORT.import }</Button>
    <Button on:click={ () => isImport = false } class="bg-{ !isImport ? "green" : "gray"}-800 text-gray-300">{ $localLang.IMPORT_EXPORT.export }</Button>
    {#if !isImport}
      <Button on:click={ exportData } class="bg-purple-800 text-gray-300">{ $localLang.IMPORT_EXPORT.save }</Button>
    {/if}
  </section>

  {#if isImport}
    <section>
      <div class="flex mx-auto items-center gap-2 justify-center">
        <span>{ $localLang.IMPORT_EXPORT.from }:</span>
        <Select bind:value={parser} items={ Adaptors } label={ p => p.name } transform={ (_, pos) => pos  }/>
        
        {#if Adaptors[parser].modes.length > 1}
          <Select bind:value={mode} items={ Adaptors[parser].modes } transform={ (_, pos) => pos  }/>
        {/if}

        <Button class="bg-purple-800 text-gray-300" file on:files={ e => processFiles(e.detail) }>{ $localLang.IMPORT_EXPORT.selectFile }</Button>
        
        {#if cubeData}
          <Button on:click={ selectAll } class="bg-orange-800 text-gray-300">{ $localLang.IMPORT_EXPORT.selectAll }</Button>
          <Button on:click={ selectNone } class="bg-orange-800 text-gray-300">{ $localLang.IMPORT_EXPORT.selectNone }</Button>
          <Button on:click={ save } class="bg-green-800 text-gray-300">{ $localLang.IMPORT_EXPORT.save }</Button>
        {/if}
      </div>
    </section>

    {#if cubeData}
      <ul class="flex flex-wrap mt-4 gap-2 justify-center" style="row-gap: 1rem;">
        {#each cubeData.sessions as s}
          <li class="flex gap-1 mr-2">
            <Checkbox bind:checked={ s.editing }/>
            <Button on:click={ () => sSession = s }
              class="p-2 bg-blue-700 bg-opacity-40 text-gray-300 rounded-md font-bold shadow-md cursor-pointer
              { s === sSession ? "bg-opacity-100 underline" : "" }
              "
            >{s.name}</Button>
          </li>
        {/each}
      </ul>
      <ul class="text-center mt-4 max-h-96 overflow-scroll">
        {#if sSession}
          <span class="text-xl text-gray-300">{ $localLang.IMPORT_EXPORT.total }: {fSolves.length} {fSolves.length > 50 ? '(' + $localLang.IMPORT_EXPORT.showingOnly50  + ')' : ''}</span>
        {/if}
        {#each fSolves.slice(0, 50) as s, i}
          <li class="grid grid-cols-6 border-none border-b border-gray-500">
            <span>{ i + 1 }</span>
            <span>{ MODE_MAP.get(s.mode || "") || "--" }</span>
            <span>{ timer( s.time, true, true ) }</span>
            <span class="overflow-hidden text-ellipsis whitespace-nowrap col-span-3 text-left">{ s.scramble }</span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    {#if ownData}
      <ul class="flex flex-wrap mt-4 gap-2 justify-center" style="row-gap: 1rem;">
        {#each ownData.sessions as s}
          <li class="flex gap-1 mr-2">
            <Checkbox bind:checked={ s.editing }/>
            <Button on:click={ () => oSession = s }
              class="p-2 bg-blue-700 bg-opacity-40 text-gray-300 rounded-md font-bold shadow-md cursor-pointer
              { s === oSession ? "bg-opacity-100 underline" : "" }
              "
            >{s.name}</Button>
          </li>
        {/each}
      </ul>
      <ul class="text-center mt-4 max-h-96 overflow-scroll">
        {#if oSession}
          <span class="text-xl text-gray-300">{ $localLang.IMPORT_EXPORT.total }: {oSolves.length} {oSolves.length > 50 ? '(' + $localLang.IMPORT_EXPORT.showingOnly50  + ')' : ''}</span>
        {/if}
        {#each oSolves.slice(0, 50) as s, i}
          <li class="grid grid-cols-6 border-none border-b border-gray-500">
            <span>{ i + 1 }</span>
            <span>{ MODE_MAP.get(s.mode || "") || "--" }</span>
            <span>{ timer( s.time, true, true ) }</span>
            <span class="overflow-hidden text-ellipsis whitespace-nowrap col-span-3 text-left">{ s.scramble }</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</main>