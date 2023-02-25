<script lang="ts">
  import { NotificationService } from "@stores/notification.service";
  import Button from "./material/Button.svelte";
  import Select from "./material/Select.svelte";

  const notService = NotificationService.getInstance();

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

  let appFont = localStorage.getItem('app-font') || DEFAULT_APP_FONT;
  let timerFont = localStorage.getItem('timer-font') || DEFAULT_TIMER_FONT;

  function save() {
    localStorage.setItem('app-font', appFont);
    localStorage.setItem('timer-font', timerFont);
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
</script>

<main class="container-mini text-gray-400 bg-white bg-opacity-10 m-4 p-4 rounded-md">
  <h1 class="text-center text-gray-300 text-3xl">Settings</h1>
  <hr/>

  <!-- App font -->
  <h2 class="text-center text-blue-300 text-2xl mb-4 mt-4">Application font</h2>
  <div class="flex items-center justify-center gap-4">
    <Select items={ FONTS } bind:value={ appFont } label={(e) => e.name}/>
    <p
      style="font-family: { appFont };"
      class="text-base bg-black bg-opacity-60 p-2 rounded-md text-gray-300">R U R F Dw2 L'</p>
  </div>
  <hr/>

  <!-- Timer font -->
  <h2 class="text-center text-green-300 text-2xl mb-4 mt-4">Timer font</h2>
  <div class="flex items-center justify-center gap-4">
    <Select items={ FONTS } bind:value={ timerFont } label={(e) => e.name}/>
    <p
      style="font-family: { timerFont };"
      class="bg-black bg-opacity-60 p-2 rounded-md text-gray-300 text-6xl">10.34</p>
  </div>
  <hr/>
  
  <!-- Actions -->
  <div class="actions flex gap-4 items-center justify-center mt-8">
    <Button class="text-gray-300 bg-green-700" on:click={ save }>Save</Button>
    <Button class="text-gray-300 bg-orange-700" on:click={ reset }>Reset</Button>
  </div>
</main>

<style lang="postcss">
  hr {
    @apply w-full h-px bg-gray-400 border-none mt-6;
  }
</style>