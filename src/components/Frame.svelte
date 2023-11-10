<script lang="ts">
  import moment from 'moment';
  import Minus from 'svelte-material-icons/Minus.svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { DataService } from '@stores/data.service';
  import Select from './material/Select.svelte';
  import { LANGUAGES, getLanguage } from '@lang/index';
  import { globalLang } from '@stores/language.service';
  import { derived, type Readable } from 'svelte/store';
  import { NotificationService } from '@stores/notification.service';
  import type { Language } from '@interfaces';
  import { randomUUID } from '@helpers/strings';
  import { navigate } from 'svelte-routing';

  let localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
    set( getLanguage( $lang ) );
  });

  const dataService = DataService.getInstance();
  const notService = NotificationService.getInstance();
  const isElectron = !!(window as any).electronAPI;

  let date: string, itv: NodeJS.Timer;
  let progress = 0;

  function handleProgress(p: number) {
    progress = Math.round(p * 100) / 100;
  }
  
  function handleDone() {
    notService.addNotification({
      header: $localLang.SETTINGS.update,
      text: $localLang.SETTINGS.updateCompleted,
      actions: [
        { text: $localLang.global.accept, callback: () => {} },
        { text: $localLang.global.restartNow, callback: () => dataService.close() },
      ],
      timeout: 5000,
      key: randomUUID(),
    });
  }

  onMount(() => {
    date = moment().format('hh:mm a');

    itv = setInterval(() => {
      date = moment().format('hh:mm a');
    }, 1000);

    dataService.on('download-progress', handleProgress);
    dataService.on('update-downloaded', handleDone);
  });

  onDestroy(() => {
    clearInterval(itv);
    dataService.off('download-progress', handleProgress);
    dataService.off('update-downloaded', handleDone);
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

<section class="w-full h-8 shadow-sm bg-backgroundLv1 text-gray-400 fixed z-50 mb-3 select-none flex items-center">
  <button on:click={ () => navigate('/') }>
    <img draggable="false" src="/assets/logo-100.png" alt="" width="100%" height="100%" class="ml-1 w-8 flex my-auto">
  </button>
  
  <h4 class="ml-1 max-sm:hidden">CubeDB</h4>

  <div class="absolute right-0 top-0 flex h-8 items-center">
    {#if progress} <span class="mr-2 text-yellow-500"> { progress + "%" } </span> {/if}

    <Select class="h-[2rem] mr-4"
      items={ LANGUAGES } label={e => e[1].name } bind:value={ $globalLang } transform={e => e[1].code} onChange={ updateLang }/>
      
    {#if isElectron}
      <span>{date}</span>
      
      <button class="ml-2 cursor-pointer" on:click={ minimize }>
        <Minus />
      </button>
      <button class="ml-2 mr-1 cursor-pointer" on:click={ close }>
        <Close height="100%"/>
      </button>
    {/if}
  </div>
</section>