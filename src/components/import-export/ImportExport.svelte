<script lang="ts">
  import type { CubeDBData, Session, Solve } from "@interfaces";
  import Button from "@components/material/Button.svelte";
  import Select from "@components/material/Select.svelte";
  import { onDestroy, onMount } from "svelte";
  import * as Adaptors from "./adaptors";
  import { MODE_MAP } from "@constants";
  import { timer } from "@helpers/timer";
  import { DataService } from "@stores/data.service";
  import type { Unsubscriber } from "svelte/store";
    import Checkbox from "@components/material/Checkbox.svelte";

  let dataService = DataService.getInstance();

  let parsers = Object.keys(Adaptors).map(k => new Adaptors[k]);
  let parser = 0;
  let mode = 0;
  let cubeData: CubeDBData = null;
  let sSession: Session = null;
  let fSolves: Solve[] = [];
  let sSub: Unsubscriber = null;

  let isImport = true;
  let rem = 0;

  function processFiles(list: FileList) {
    let fr = new FileReader();

    fr.addEventListener('loadend', (e) => {
      cubeData = parsers[ parser ].toCubeDB(fr.result as string, mode);
      cubeData.sessions = cubeData.sessions.filter(ss => cubeData.solves.reduce((acc, e) => acc + (e.session === ss._id ? 1 : 0), 0));
      
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
    for (let i = 0, maxi = cubeData.sessions.length; i < maxi; i += 1) {
      let s = cubeData.sessions[i];
      if ( !s.editing ) continue;

      s.tName = s._id;
      
      delete s._id;

      rem += 1;
      dataService.addSession(s);
    }
  }

  function selectAll() {
    cubeData.sessions.forEach(s => s.editing = true);
    cubeData.sessions = cubeData.sessions;
  }

  function selectNone() {
    cubeData.sessions.forEach(s => s.editing = false);
    cubeData.sessions = cubeData.sessions;
  }

  onMount(() => {
    sSub = dataService.sessSub.subscribe((e) => {
      if ( !e ) return;

      switch(e.type) {
        case 'add-session': {
          let ss = <Session> e.data;
          rem -= 1;
          for (let i = 0, maxi = cubeData?.solves?.length; i < maxi; i += 1) {
            let sv = cubeData.solves[i];
            if ( ss.tName === sv.session ) {
              sv.session = ss._id;
              dataService.addSolve(sv);
            }
          }
          if ( rem === 0 ) {
            cubeData = null;
          }
          break;
        }
      }
    });

  });

  onDestroy(() => {
    sSub();
  });

  $: fSolves = cubeData?.solves.filter(s => s.session === sSession?._id) || [];

</script>

<main class="container-mini mx-auto max-w-4xl bg-white bg-opacity-10 rounded-md text-gray-400 p-4">
  <h1 class="text-center text-3xl text-gray-300"> Import/Export </h1>
  <section class="flex items-center gap-2 justify-center my-4">
    <Button on:click={ () => isImport = true } class="bg-{ isImport ? "green" : "gray"}-800 text-gray-300">Import</Button>
    <Button on:click={ () => isImport = false } class="bg-{ !isImport ? "green" : "gray"}-800 text-gray-300">Export</Button>
  </section>

  {#if isImport}
    <section>
      <div class="flex mx-auto items-center gap-2 justify-center">
        <span>From:</span>
        <Select bind:value={parser} items={ parsers } label={ p => p.name } transform={ (_, pos) => pos  }/>
        
        {#if parsers[parser].modes.length > 1}
          <Select bind:value={mode} items={ parsers[parser].modes } transform={ (_, pos) => pos  }/>
        {/if}

        <Button class="bg-purple-800 text-gray-300" file on:files={ e => processFiles(e.detail) }>Select file</Button>
        
        {#if cubeData}
          <Button on:click={ selectAll } class="bg-orange-800 text-gray-300">Select All</Button>
          <Button on:click={ selectNone } class="bg-orange-800 text-gray-300">Select None</Button>
          <Button on:click={ save } class="bg-green-800 text-gray-300">Save</Button>
        {/if}
      </div>
    </section>

    {#if cubeData}
      <ul class="flex flex-wrap mt-4 gap-2 justify-center" style="row-gap: 1rem;">
        {#each cubeData.sessions as s}
          <li class="flex gap-1 mr-2">
            <Checkbox bind:checked={ s.editing }/>
            <Button on:click={ () => console.log(sSession = s) }
              class="p-2 bg-blue-700 bg-opacity-40 text-gray-300 rounded-md font-bold shadow-md cursor-pointer
              { s === sSession ? "bg-opacity-100 underline" : "" }
              "
            >{s.name}</Button>
          </li>
        {/each}
      </ul>
      <ul class="text-center mt-4 max-h-96 overflow-scroll">
        {#if sSession}
          <span class="text-xl text-gray-300">Total: {fSolves.length} {fSolves.length > 50 ? '(showing only 50)' : ''}</span>
        {/if}
        {#each fSolves.slice(0, 50) as s, i}
          <li class="grid grid-cols-6 border-none border-b border-gray-500">
            <span>{ i + 1 }</span>
            <span>{ MODE_MAP.get(s.mode) || "--" }</span>
            <span>{ timer( s.time, true, true ) }</span>
            <span class="overflow-hidden text-ellipsis whitespace-nowrap col-span-3 text-left">{ s.scramble }</span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <section>

    </section>
  {/if}
</main>

<style>
  .selected {
    text-decoration: underline;
    --tw-bg-opacity: 1;
  }
</style>