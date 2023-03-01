<script lang="ts">
  import moment from 'moment';
  import Minus from 'svelte-material-icons/Minus.svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { DataService } from '@stores/data.service';
  import Select from './material/Select.svelte';
  import { LANGUAGES } from '@lang/index';
  import { globalLang } from '@stores/language.service';

  const dataService = DataService.getInstance();

  let date: string, itv: NodeJS.Timer;

  onMount(() => {
    date = moment().format('hh:mm a');

    itv = setInterval(() => {
      date = moment().format('hh:mm a');
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(itv);
  });

  function minimize() {
    dataService.minimize();
  }

  function close() {
    dataService.close();
  }

  function updateLang() {
    localStorage.setItem('language', $globalLang);
  }
</script>

<section class="w-full h-8 shadow-sm bg-white bg-opacity-10 text-gray-400 fixed z-50 mb-3 select-none flex items-center">

  <img draggable="false" src="/assets/logo.png" alt="" class="ml-1 w-8 flex my-auto">
  
  <h4 class="ml-1">CubeDB</h4>

  <div class="absolute right-0 top-0 flex h-8 items-center">
    <Select class="w-20 h-[2rem] mr-4"
      items={ LANGUAGES } label={e => e[1].code} bind:value={ $globalLang } transform={e => e[1].code} onChange={ updateLang }/>
    <span>{date}</span>
    <span class="ml-2 cursor-pointer" on:click={ minimize }>
      <Minus />
    </span>
    <span class="ml-2 mr-1 cursor-pointer" on:click={ close }>
      <Close height="100%"/>
    </span>
  </div>
</section>