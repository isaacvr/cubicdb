<script lang="ts">
  import { NotificationService } from "@stores/notification.service";
  import { onDestroy, onMount } from "svelte";
  import Select from "@material/Select.svelte";
  import { DataService } from "@stores/data.service";
  import { version } from "@stores/version.store";
  import { randomUUID } from "@helpers/strings";
  import { timer } from "@helpers/timer";
  import type { Display } from "electron";
  import { CubeDBICON } from "@constants";
  import { Button, Card, Heading, Span, Spinner, TabItem, Table, TableBody, TableBodyCell, TableBodyRow, Tabs } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  
  // ICONS
  import ScreenIcon from '@icons/Monitor.svelte';
  import TextIcon from '@icons/Text.svelte';
  import UpdateIcon from '@icons/Update.svelte';
  import StorageIcon from '@icons/Harddisk.svelte';
  import type { ICacheDB, IStorageInfo } from "@interfaces";
  import { byteToString } from "@helpers/math";

  const notService = NotificationService.getInstance();

  let dataService = DataService.getInstance();

  const FONTS = [
    { name: 'Ubuntu', value: 'Ubuntu' },
    { name: 'Ropa Sans', value: 'RopaSans' },
    { name: 'Bree Serif', value: 'BreeSerif' },
    { name: 'CQ Mono', value: 'CQMono' },
    { name: 'Raleway', value: 'Raleway' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'LCD4', value: 'lcd4' },
    { name: 'Monaco', value: 'Monaco' },
  ];

  const DEFAULT_APP_FONT = 'Ubuntu';
  const DEFAULT_TIMER_FONT = 'Ubuntu';

  let appFont = localStorage.getItem('app-font') || DEFAULT_APP_FONT;
  let timerFont = localStorage.getItem('timer-font') || DEFAULT_TIMER_FONT;
  let canCheckUpdate = true;
  let dTime = 10587;
  let itv: NodeJS.Timeout;
  let displays: Display[] = [];
  let storage: IStorageInfo = {
    algorithms: 0, cache: 0, sessions: 0, solves: 0, tutorials: 0
  };
  
  function save() {
    localStorage.setItem('app-font', appFont);
    localStorage.setItem('timer-font', timerFont);
    document.documentElement.style.setProperty('--app-font', appFont);
    document.documentElement.style.setProperty('--timer-font', timerFont);

    notService.addNotification({
      key: randomUUID(),
      header: $localLang.global.saved,
      text: $localLang.global.settingsSaved,
      timeout: 2000,
      icon: CubeDBICON,
    });

  }

  function reset() {
    appFont = DEFAULT_APP_FONT;
    timerFont = DEFAULT_TIMER_FONT;
    save();
  }

  function checkUpdate() {
    canCheckUpdate = false;
    dataService.update('check').then(res => {
      if ( !res ) return;

      let p1 = $version.split(".").map(Number);
      let p2 = res.split(".").map(Number);

      let cmp = (a: number[], b: number[]) => {
        if ( a.length < b.length ) return -1;
        if ( a.length > b.length ) return 1;

        for (let i = 0, maxi = a.length; i < maxi; i += 1){
          if ( a[i] < b[i] ) return -1;
          if ( a[i] > b[i] ) return 1;
        }

        return 0;
      };

      if ( cmp(p2, p1) <= 0 ) {
        notService.addNotification({
          header: $localLang.SETTINGS.alreadyUpdated,
          text: $localLang.SETTINGS.alreadyUpdatedText,
          fixed: true,
          actions: [
            { text: $localLang.global.accept, callback: () => {} }
          ],
          key: randomUUID(),
          icon: CubeDBICON,
        });
      } else {
        notService.addNotification({
          header: `${ $localLang.SETTINGS.updateAvailable } (${ res })`,
          text: $localLang.SETTINGS.updateAvailableText,
          fixed: true,
          actions: [
            { text: $localLang.global.cancel, callback: () => {}, color: 'alternative' },
            { text: $localLang.global.update, callback: updateNow, color: 'purple' },
          ],
          key: randomUUID(),
          icon: CubeDBICON,
        });
      }
    }).catch((err) => {
      notService.addNotification({
        header: $localLang.SETTINGS.updateError,
        text: $localLang.SETTINGS.updateErrorText,
        timeout: 2000,
        key: randomUUID(),
        icon: CubeDBICON,
      });

      console.dir(err);
    }).finally(() => canCheckUpdate = true);
  }

  function updateNow() {
    dataService.update('download').then(() => {
      console.log('Downloaded');
    })
    .catch(err => {
      console.log('update error: ');
      console.dir(err);
    });
  }

  function updateDisplays() {
    dataService.getAllDisplays().then(res => {
      let cnt = 1;

      displays = res.sort((a, b) => a.label < b.label ? -1 : 1).map(s => {
        s.label = s.label || ($localLang.SETTINGS.screen + ' ' + (cnt++));
        return s;
      });

    });
  }

  function useDisplay(id: number) {
    dataService.useDisplay(id);
  }

  async function updateStorage() {
    try {
      storage = await dataService.getStorageInfo();
    } catch {}
  }

  async function clearCache(db: ICacheDB) {
    try {
      await dataService.clearCache(db);
      await updateStorage();
    } catch{}
  }

  onMount(() => {
    updateDisplays();
    updateStorage();

    itv = setInterval(() => {
      dTime = Math.random() * 20000;
    }, 2000);
  });    

  onDestroy(() => {
    clearInterval(itv);
  });

  $: $localLang && updateDisplays();
</script>

<Card class="mx-auto w-full max-w-4xl mt-8">
  <Heading tag="h2" class="text-center text-3xl">{ $localLang.SETTINGS.title }</Heading>
  
  <Tabs divider>
    <TabItem open activeClasses="text-yellow-500 p-4 border-b-2 border-b-yellow-500">
      <div slot="title" class="flex items-center gap-2">
        <TextIcon size="1.2rem"/> { $localLang.SETTINGS.appFont }
      </div>

      <div class="flex flex-wrap justify-around">
        <div>
          <!-- App font -->
          <Heading tag="h3" class="text-center text-green-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.appFont }</Heading>
          <div class="flex items-center justify-center gap-4">
            <Select items={ FONTS } bind:value={ appFont } label={(e) => e.name}/>
            <p
              style="font-family: { appFont };"
              class="text-base bg-black bg-opacity-60 p-2 rounded-md text-gray-300">R U R F Dw2 L'</p>
          </div>
        </div>
  
        <div>
          <!-- Timer font -->
          <Heading tag="h3" class="text-center text-blue-300 text-2xl mb-4 mt-4">{ $localLang.SETTINGS.timerFont }</Heading>
          <div class="flex items-center justify-center gap-4">
            <Select items={ FONTS } bind:value={ timerFont } label={(e) => e.name}/>
            <p
              style="font-family: { timerFont };"
              class="bg-black bg-opacity-60 p-2 rounded-md text-gray-300 text-4xl">{ timer(dTime, true) }</p>
          </div>
        </div>
      </div>
    </TabItem>

    {#if dataService.isElectron }
      <TabItem activeClasses="text-yellow-500 p-4 border-b-2 border-b-yellow-500">
        <div slot="title" class="flex items-center gap-2">
          <ScreenIcon size="1.2rem"/> { $localLang.SETTINGS.screen }
        </div>

        <!-- Displays -->
        <div class="flex flex-col items-center justify-center gap-4">
          <div class="flex justify-center gap-2">
            {#each displays as display}
              <Button color="alternative" class="gap-2" on:click={ () => useDisplay(display.id) }>
                <ScreenIcon size="1.2rem"/>
                { display.label }
              </Button>
            {/each}
          </div>
      
          <div>
            <Button on:click={ updateDisplays }>{ $localLang.global.update }</Button>
          </div>
        </div>
      </TabItem>

      <TabItem activeClasses="text-yellow-500 p-4 border-b-2 border-b-yellow-500">
        <div slot="title" class="flex items-center gap-2">
          <UpdateIcon size="1.2rem"/> { $localLang.SETTINGS.update }
        </div>

        <!-- Updates -->
        <div class="flex items-center justify-center gap-4">
          <div class="flex items-center justify-center gap-2">
            { $localLang.SETTINGS.version }: <mark>{ $version }</mark>
            <Button on:click={ () => canCheckUpdate && checkUpdate() }>
              {#if !canCheckUpdate}
                <Spinner size="4" color="white"/>
              {:else}
                { $localLang.SETTINGS.checkUpdate }
              {/if}
            </Button>
          </div>
        </div>
      </TabItem>
    {/if}

   <TabItem activeClasses="text-yellow-500 p-4 border-b-2 border-b-yellow-500">
      <div slot="title" class="flex items-center gap-2">
        <StorageIcon size="1.2rem"/> { $localLang.global.storage }
      </div>

      <Span class="flex justify-center text-lg">
        { $localLang.global.storage }: { byteToString( Object.entries(storage).reduce((acc, e) => acc + e[1], 0) ) }
      </Span>

      <Table striped shadow>
        <TableBody>
          {#each [
            { name: $localLang.global.images, length: storage.cache, db: 'Cache' },
            { name: $localLang.global.algorithms, length: storage.algorithms, db: 'Algorithms' },
            { name: $localLang.global.sessions, length: storage.sessions, db: 'Sessions' },
            { name: $localLang.global.solves, length: storage.solves, db: 'Solves' },
            { name: $localLang.global.tutorials, length: storage.tutorials, db: 'Tutorials' },
          ].filter(s => s.length) as st}
            <TableBodyRow>
              <TableBodyCell>{ st.name }</TableBodyCell>
              <TableBodyCell>{ byteToString( st.length ) }</TableBodyCell>
              <TableBodyCell>
                <Button on:click={ () => {
                    // @ts-ignore
                    clearCache(st.db)
                  }} color="alternative"> { $localLang.global.clear } </Button>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </TabItem>
  </Tabs>

  <hr />

  <!-- Actions -->
  <div class="actions flex gap-4 items-center justify-center mt-8">
    <Button color="green" on:click={ save }>{ $localLang.global.save }</Button>
    <Button color="purple" on:click={ reset }>{ $localLang.global.reset }</Button>
  </div>
</Card>

<style lang="postcss">
  hr {
    @apply w-full h-px bg-gray-700 border-none mt-6;
  }
</style>