<script lang="ts">
  import type { Language } from "@interfaces";
  import { getLanguage, LANGUAGES } from "@lang/index";
  import { globalLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
    import { UpdateService } from "@stores/update.service";
    import { onDestroy } from "svelte";
  import { derived, type Readable } from "svelte/store";
  import Button from "./material/Button.svelte";
  import Select from "./material/Select.svelte";

  const notService = NotificationService.getInstance();

  let finalLang = $globalLang;

  let localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
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
  const DEFAULT_TIMER_FONT = 'CQMono';

  let language = $globalLang;
  let appFont = localStorage.getItem('app-font') || DEFAULT_APP_FONT;
  let timerFont = localStorage.getItem('timer-font') || DEFAULT_TIMER_FONT;
  let canCheckUpdate = true;
  
  function save() {
    localStorage.setItem('app-font', appFont);
    localStorage.setItem('timer-font', timerFont);
    localStorage.setItem('language', language);
    finalLang = language;
    document.documentElement.style.setProperty('--app-font', appFont);
    document.documentElement.style.setProperty('--timer-font', timerFont);

    notService.addNotification({
      key: crypto.randomUUID(),
      header: 'Saved',
      text: 'Settings saved',
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

    UpdateService.checkForUpdates()
      .then(res => {
        canCheckUpdate = true;

        if ( res ) {
          notService.addNotification({
            header: $localLang.SETTINGS.updateAvailable,
            text: $localLang.SETTINGS.updateAvailableText,
            fixed: true,
            actions: [
              { text: $localLang.SETTINGS.cancelAction, callback: () => {} },
              { text: $localLang.SETTINGS.updateAction, callback: updateNow },
            ],
            key: crypto.randomUUID(),
          });
        } else {
          notService.addNotification({
            header: $localLang.SETTINGS.alreadyUpdated,
            text: $localLang.SETTINGS.alreadyUpdatedText,
            timeout: 2000,
            key: crypto.randomUUID(),
          });
        }
      })
      .catch(() => {
        canCheckUpdate = true;
        notService.addNotification({
          header: $localLang.SETTINGS.updateError,
          text: $localLang.SETTINGS.updateErrorText,
          timeout: 2000,
          key: crypto.randomUUID(),
        });
      });
  }

  function updateNow() {
    UpdateService.update().then(v => {
      notService.addNotification({
        key: crypto.randomUUID(),
        header: $localLang.SETTINGS.update,
        text: v ? $localLang.SETTINGS.updateCompleted : $localLang.SETTINGS.updateFailed,
        timeout: 2000,
      });

      console.log("UPDATE: ", v);
    })
    .catch(() => {
      canCheckUpdate = true;
      notService.addNotification({
        header: $localLang.SETTINGS.updateError,
        text: $localLang.SETTINGS.updateErrorText,
        timeout: 2000,
        key: crypto.randomUUID(),
      });
    });
  }

  onDestroy(() => {
    $globalLang = finalLang;
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
      class="bg-black bg-opacity-60 p-2 rounded-md text-gray-300 text-6xl">10.34</p>
  </div>
  <hr/>

  <!-- Updates -->
  <h2 class="text-center text-violet-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.update }</h2>
  <div class="flex items-center justify-center gap-4">
    <div class="flex items-center justify-center gap-2">
      { $localLang.SETTINGS.version }: <mark>{ VERSION }</mark>
      <Button class="bg-blue-700 text-gray-300" on:click={ () => canCheckUpdate && checkUpdate() }>
        { $localLang.SETTINGS.checkUpdate }
      </Button>
    </div>
  </div>
  <hr/>
  
  <!-- Actions -->
  <div class="actions flex gap-4 items-center justify-center mt-8">
    <Button class="text-gray-300 bg-green-700" on:click={ save }>{ $localLang.SETTINGS.save }</Button>
    <Button class="text-gray-300 bg-orange-700" on:click={ reset }>{ $localLang.SETTINGS.reset }</Button>
  </div>
</main>

<style lang="postcss">
  hr {
    @apply w-full h-px bg-gray-400 border-none mt-6;
  }
</style>