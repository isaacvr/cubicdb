<script lang="ts">
  import type { Language } from "@interfaces";
  import { getLanguage, LANGUAGES } from "@lang/index";
  import { globalLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
  import { onDestroy, onMount } from "svelte";
  import { derived, type Readable, type Unsubscriber } from "svelte/store";
  import Button from "./material/Button.svelte";
  import Select from "./material/Select.svelte";
  import { DataService } from "@stores/data.service";

  import { version } from "@stores/version.store";
  import { randomUUID } from "@helpers/strings";
  import { timer } from "@helpers/timer";

  const notService = NotificationService.getInstance();

  let finalLang = $globalLang;
  let dataService = DataService.getInstance();
  let uSub: Unsubscriber;
  let language = $globalLang;

  let localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
    language = $lang;
    set( getLanguage( $lang ) );
  });

  const FONTS = [
    { name: 'Ubuntu', value: 'Ubuntu' },
    { name: 'Ropa Sans', value: 'RopaSans' },
    { name: 'Bree Serif', value: 'BreeSerif' },
    { name: 'CQ Mono', value: 'CQMono' },
    { name: 'Raleway', value: 'Raleway' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'LCD4', value: 'lcd4' },
  ];

  const DEFAULT_APP_FONT = 'Ubuntu';
  const DEFAULT_TIMER_FONT = 'Ubuntu';

  let appFont = localStorage.getItem('app-font') || DEFAULT_APP_FONT;
  let timerFont = localStorage.getItem('timer-font') || DEFAULT_TIMER_FONT;
  let canCheckUpdate = true;
  let dTime = 10587;
  let itv: NodeJS.Timer;
  
  function save() {
    localStorage.setItem('app-font', appFont);
    localStorage.setItem('timer-font', timerFont);
    localStorage.setItem('language', language);
    finalLang = language;
    document.documentElement.style.setProperty('--app-font', appFont);
    document.documentElement.style.setProperty('--timer-font', timerFont);

    notService.addNotification({
      key: randomUUID(),
      header: $localLang.SETTINGS.saved,
      text: $localLang.SETTINGS.settingsSaved,
      timeout: 2000,
    });

  }

  function reset() {
    appFont = DEFAULT_APP_FONT;
    timerFont = DEFAULT_TIMER_FONT;
    save();
  }

  function setLanguage() {
    $globalLang = language;
  }

  function checkUpdate() {
    canCheckUpdate = false;
    dataService.update('check');
  }

  function updateNow() {
    dataService.update('download');
  }

  onMount(() => {
    uSub = dataService.updateSub.subscribe((ev) => {
      if ( !ev ) return;

      console.log("UPDATE: ", ev);

      switch( ev.type ) {
        case 'check': {
          canCheckUpdate = true;

          let res = ev.data[0];
          let vs = ev.data[1];

          if ( res === 'error' ) {
            notService.addNotification({
              header: $localLang.SETTINGS.updateError,
              text: $localLang.SETTINGS.updateErrorText,
              timeout: 2000,
              key: randomUUID(),
            });
          } else if ( res ) {
            if ( $version === vs ) {
              notService.addNotification({
                header: $localLang.SETTINGS.alreadyUpdated,
                text: $localLang.SETTINGS.alreadyUpdatedText,
                fixed: true,
                actions: [
                  { text: $localLang.global.accept, callback: () => {} }
                ],
                key: randomUUID(),
              });
            } else {
              notService.addNotification({
                header: `${ $localLang.SETTINGS.updateAvailable } (${ vs })`,
                text: $localLang.SETTINGS.updateAvailableText,
                fixed: true,
                actions: [
                  { text: $localLang.global.cancel, callback: () => {} },
                  { text: $localLang.global.update, callback: updateNow },
                ],
                key: randomUUID(),
              });
            }
          } else {
            notService.addNotification({
              header: $localLang.SETTINGS.alreadyUpdated,
              text: $localLang.SETTINGS.alreadyUpdatedText,
              timeout: 2000,
              key: randomUUID(),
            });
          }

          break;
        }
      }
    });

    itv = setInterval(() => {
      dTime = Math.random() * 20000;
    }, 2000);
  });    

  onDestroy(() => {
    $globalLang = finalLang;
    uSub();
    clearInterval(itv);
  }); 
</script>

<main class="container-mini text-gray-400 bg-white bg-opacity-10 m-4 p-4 rounded-md">
  <h1 class="text-center text-gray-300 text-3xl">{ $localLang.SETTINGS.title }</h1>
  <hr/>

  <!-- Language -->
  <h2 class="text-center text-yellow-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.language }</h2>
  <div class="flex items-center justify-center gap-4">
    <Select items={ LANGUAGES } bind:value={ language }
      label={(e) => e[1].name}
      transform={(e) => e[1].code}
      onChange={ setLanguage }/>
  </div>
  <hr/>

  <!-- App font -->
  <h2 class="text-center text-green-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.appFont }</h2>
  <div class="flex items-center justify-center gap-4">
    <Select items={ FONTS } bind:value={ appFont } label={(e) => e.name}/>
    <p
      style="font-family: { appFont };"
      class="text-base bg-black bg-opacity-60 p-2 rounded-md text-gray-300">R U R F Dw2 L'</p>
  </div>
  <hr/>

  <!-- Timer font -->
  <h2 class="text-center text-blue-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.timerFont }</h2>
  <div class="flex items-center justify-center gap-4">
    <Select items={ FONTS } bind:value={ timerFont } label={(e) => e.name}/>
    <p
      style="font-family: { timerFont };"
      class="bg-black bg-opacity-60 p-2 rounded-md text-gray-300 text-6xl">{ timer(dTime, true) }</p>
  </div>
  <hr/>

  <!-- Updates -->
  <h2 class="text-center text-violet-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.update }</h2>
  <div class="flex items-center justify-center gap-4">
    <div class="flex items-center justify-center gap-2">
      { $localLang.SETTINGS.version }: <mark>{ $version }</mark>
      <Button class="bg-blue-700 text-gray-300 grid justify-center relative"
        on:click={ () => canCheckUpdate && checkUpdate() } loading={ !canCheckUpdate }>
        { $localLang.SETTINGS.checkUpdate }
      </Button>
    </div>
  </div>
  <hr/>
  
  <!-- Actions -->
  <div class="actions flex gap-4 items-center justify-center mt-8">
    <Button class="text-gray-300 bg-green-700" on:click={ save }>{ $localLang.global.save }</Button>
    <Button class="text-gray-300 bg-orange-700" on:click={ reset }>{ $localLang.global.reset }</Button>
  </div>
</main>

<style lang="postcss">
  hr {
    @apply w-full h-px bg-gray-400 border-none mt-6;
  }
</style>