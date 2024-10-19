<script lang="ts">
  import { NotificationService } from "@stores/notification.service";
  import { onDestroy, onMount } from "svelte";
  import Select from "@material/Select.svelte";
  import { DataService } from "@stores/data.service";
  import { version } from "@stores/version.store";
  import { replaceParams } from "@helpers/strings";
  import { timer } from "@helpers/timer";
  import type { Display } from "electron";
  import {
    Button,
    Card,
    Heading,
    Span,
    Spinner,
    TabItem,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    Tabs,
    Tooltip,
  } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import type { ICacheDB, IStorageInfo, Language } from "@interfaces";
  import { byteToString } from "@helpers/math";
  import Modal from "@components/Modal.svelte";

  // ICONS
  import ScreenIcon from "@icons/Monitor.svelte";
  import TextIcon from "@icons/Text.svelte";
  import UpdateIcon from "@icons/Update.svelte";
  import StorageIcon from "@icons/Harddisk.svelte";
  import CleanIcon from "@icons/DeleteAlert.svelte";
  import { browser } from "$app/environment";

  const notService = NotificationService.getInstance();

  let dataService = DataService.getInstance();

  const FONTS = [
    { name: "Ubuntu", value: "Ubuntu" },
    { name: "Ropa Sans", value: "RopaSans" },
    { name: "Bree Serif", value: "BreeSerif" },
    { name: "CQ Mono", value: "CQMono" },
    { name: "Raleway", value: "Raleway" },
    { name: "Roboto", value: "Roboto" },
    { name: "LCD4", value: "lcd4" },
    { name: "Monaco", value: "Monaco" },
  ];

  const DEFAULT_APP_FONT = "Ubuntu";
  const DEFAULT_TIMER_FONT = "Ubuntu";
  const DEFAULT_ZOOM_FACTOR = 100;
  const tabActiveClass = "text-primary-400 p-4 border-b-2 border-b-primary-400";
  const ZOOM_FACTORS = [25, 50, 75, 100, 125, 150, 175, 200];

  let appFont = browser ? localStorage.getItem("app-font") || DEFAULT_APP_FONT : DEFAULT_APP_FONT;

  let timerFont = browser
    ? localStorage.getItem("timer-font") || DEFAULT_TIMER_FONT
    : DEFAULT_TIMER_FONT;

  let zoomFactor: number = ~~(browser
    ? localStorage.getItem("zoom-factor") || DEFAULT_ZOOM_FACTOR
    : DEFAULT_ZOOM_FACTOR);

  let initialZoomFactor = zoomFactor;
  let canCheckUpdate = true;
  let canCheckAlgs = true;
  let canCheckTuts = true;
  let canCheckRecs = true;
  let dTime = 10587;
  let itv: NodeJS.Timeout;
  let displays: Display[] = [];
  let storage: IStorageInfo = {
    algorithms: 0,
    cache: 0,
    vcache: 0,
    sessions: 0,
    solves: 0,
    tutorials: 0,
    reconstructions: 0,
  };

  let storeList: any[] = [];
  let showDelete = false;
  let sDb: ICacheDB = "Cache";
  let sName = "";
  let algVersion = "0.0.0";
  let tutVersion = "0.0.0";
  let recVersion = "0.0.0";

  function save() {
    localStorage.setItem("app-font", appFont);
    localStorage.setItem("timer-font", timerFont);
    localStorage.setItem("zoom-factor", "" + zoomFactor);
    document.documentElement.style.setProperty("--app-font", appFont);
    document.documentElement.style.setProperty("--timer-font", timerFont);
    document.documentElement.style.setProperty("--zoom-factor", "" + zoomFactor);

    initialZoomFactor = zoomFactor;

    notService.addNotification({
      header: $localLang.global.saved,
      text: $localLang.global.settingsSaved,
      timeout: 2000,
    });
  }

  function reset() {
    appFont = DEFAULT_APP_FONT;
    timerFont = DEFAULT_TIMER_FONT;
    zoomFactor = DEFAULT_ZOOM_FACTOR;
    save();
  }

  function cmpVersions(v1: string, v2: string) {
    let a = v1.split(".").map(Number);
    let b = v2.split(".").map(Number);

    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;

    for (let i = 0, maxi = a.length; i < maxi; i += 1) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }

    return 0;
  }

  function sendUpdateError() {
    notService.addNotification({
      header: $localLang.SETTINGS.updateError,
      text: $localLang.SETTINGS.updateErrorText,
      timeout: 2000,
    });
  }

  function sendAlreadyUpdated(name: string) {
    notService.addNotification({
      header: $localLang.SETTINGS.alreadyUpdated,
      text: replaceParams($localLang.SETTINGS.alreadyUpdatedText, [name]),
      fixed: true,
      actions: [{ text: $localLang.global.accept, callback: () => {} }],
    });
  }

  function sendUpdateAvailable(name: string, v: string, cb: (m: MouseEvent) => void) {
    notService.addNotification({
      header: `${$localLang.SETTINGS.updateAvailable} (${v})`,
      text: replaceParams($localLang.SETTINGS.updateAvailableText, [name]),
      fixed: true,
      actions: [
        { text: $localLang.global.cancel, callback: () => {}, color: "alternative" },
        { text: $localLang.global.update, callback: cb, color: "purple" },
      ],
    });
  }

  function sendNeedsUpdate(name: string, minVersion: string) {
    notService.addNotification({
      header: $localLang.SETTINGS.updateAvailable,
      text: replaceParams($localLang.SETTINGS.needsUpdate, [name, minVersion]),
      fixed: true,
      actions: [{ text: $localLang.global.accept, callback: () => {} }],
    });
  }

  function sendWillRestart() {
    notService.addNotification({
      header: $localLang.global.done,
      text: $localLang.global.willRestart,
    });
  }

  function checkUpdate() {
    canCheckUpdate = false;
    dataService
      .update("check")
      .then(res => {
        if (!res) return;

        if (cmpVersions($version, res) >= 0) {
          sendAlreadyUpdated("CubicDB");
        } else {
          sendUpdateAvailable("CubicDB", res, updateNow);
        }
      })
      .catch(err => {
        sendUpdateError();
        console.dir(err);
      })
      .finally(() => (canCheckUpdate = true));
  }

  function updateNow() {
    dataService
      .update("download")
      .then(() => {
        console.log("Downloaded");
      })
      .catch(err => {
        console.log("update error: ");
        console.dir(err);
      });
  }

  function updatePart(pr: Promise<any>, errorStr: string) {
    pr.then(() => sendWillRestart()).catch(err => {
      console.log(errorStr);
      console.dir(err);
    });
  }

  function updateAlgs() {
    updatePart(dataService.updateAlgorithms(), "update algs error: ");
  }

  function updateTuts() {
    updatePart(dataService.updateTutorials(), "update tuts error: ");
  }

  function updateRecs() {
    updatePart(dataService.updateReconstructions(), "update recs error: ");
  }

  function updateDisplays() {
    dataService.getAllDisplays().then(res => {
      let cnt = 1;

      displays = res
        .sort((a, b) => (a.label < b.label ? -1 : 1))
        .map(s => {
          s.label = s.label || $localLang.SETTINGS.screen + " " + cnt++;
          return s;
        });
    });
  }

  function useDisplay(id: number) {
    dataService.useDisplay(id);
  }

  function updateStorageNames() {
    storeList = [
      { name: "images", clean: true, length: storage.cache, db: "Cache" },
      { name: "videos", clean: true, length: storage.vcache, db: "VCache" },
      { name: "sessions", clean: true, length: storage.sessions, db: "Sessions" },
      { name: "solves", clean: true, length: storage.solves, db: "Solves" },
      { name: "algorithms", clean: false, length: storage.algorithms, db: "Algorithms" },
      { name: "tutorials", clean: false, length: storage.tutorials, db: "Tutorials" },
      {
        name: "reconstructions",
        clean: false,
        length: storage.reconstructions,
        db: "Reconstructions",
      },
    ].filter(s => s.length);
  }

  async function updateStorage() {
    try {
      storage = await dataService.getStorageInfo();
      updateStorageNames();
    } catch {}
  }

  async function clearCache(db: ICacheDB) {
    showDelete = false;

    try {
      await dataService.clearCache(db);
      await updateStorage();
    } catch {}
  }

  function preClearCache(db: ICacheDB, name: string) {
    sDb = db;
    sName = name;
    showDelete = true;
  }

  function getName(name: string) {
    return $localLang.global[name as keyof Language["global"]];
  }

  function updateZoom() {
    document.documentElement.style.setProperty("--zoom-factor", "" + zoomFactor);
  }

  async function getVersions() {
    let versions = await Promise.all([
      dataService.algorithmsVersion(),
      dataService.tutorialsVersion(),
      dataService.reconstructionsVersion(),
    ]);

    algVersion = versions[0].version;
    tutVersion = versions[1].version;
    recVersion = versions[2].version;
  }

  async function checkPart(
    pr: Promise<{ minVersion: string; version: string }>,
    name: string,
    callback: any
  ) {
    return pr.then(res => {
      console.log("NAME_RES: ", name, res);
      if (res.version === "0.0.0") {
        return sendUpdateError();
      }

      let cmpRes = cmpVersions(algVersion, res.version);

      if (cmpRes >= 0) {
        return sendAlreadyUpdated(name);
      }

      let cmpvRes = cmpVersions(res.minVersion, $version);

      if (cmpvRes > 0) {
        return sendNeedsUpdate(name, res.minVersion);
      }

      sendUpdateAvailable(name, res.version, callback);
    });
  }

  function checkAlgs() {
    canCheckAlgs = false;
    checkPart(dataService.checkAlgorithms(), $localLang.HOME.algorithms, updateAlgs).finally(
      () => (canCheckAlgs = true)
    );
  }

  function checkTuts() {
    canCheckTuts = false;
    checkPart(dataService.checkTutorials(), $localLang.HOME.tutorials, updateTuts).finally(
      () => (canCheckTuts = true)
    );
  }

  function checkRecs() {
    canCheckRecs = false;
    checkPart(
      dataService.checkReconstructions(),
      $localLang.HOME.reconstructions,
      updateRecs
    ).finally(() => (canCheckRecs = true));
  }

  onMount(() => {
    updateDisplays();
    updateStorage();
    getVersions();

    itv = setInterval(() => {
      dTime = Math.random() * 20000;
    }, 2000);
  });

  onDestroy(() => {
    clearInterval(itv);
    browser && document.documentElement.style.setProperty("--zoom-factor", "" + initialZoomFactor);
  });

  $: $localLang && [updateDisplays(), updateStorageNames()];
</script>

<Card class="mx-auto w-[calc(100%-2rem)] max-w-4xl mt-8">
  <Heading tag="h2" class="text-center text-3xl">{$localLang.SETTINGS.title}</Heading>

  <Tabs divider>
    <TabItem open activeClasses={tabActiveClass}>
      <div slot="title" class="flex items-center gap-2">
        <TextIcon size="1.2rem" />
        {$localLang.SETTINGS.appFont}
      </div>

      <div class="flex flex-wrap justify-around">
        <!-- App font -->
        <div class="grid">
          <Heading tag="h3" class="text-center text-green-300 text-2xl mb-4 mt-4">
            {$localLang.SETTINGS.appFont}
          </Heading>
          <div class="flex items-center justify-center gap-4">
            <Select items={FONTS} bind:value={appFont} label={e => e.name} />
            <p
              style="font-family: {appFont};"
              class="text-base bg-black bg-opacity-60 p-2 rounded-md text-gray-300"
            >
              R U R F Dw2 L'
            </p>
          </div>
        </div>

        <!-- Timer font -->
        <div class="grid">
          <Heading tag="h3" class="text-center text-blue-300 text-2xl mb-4 mt-4">
            {$localLang.SETTINGS.timerFont}
          </Heading>
          <div class="flex items-center justify-center gap-4">
            <Select items={FONTS} bind:value={timerFont} label={e => e.name} />
            <p
              style="font-family: {timerFont};"
              class="bg-black bg-opacity-60 p-2 rounded-md text-gray-300 text-4xl"
            >
              {timer(dTime, true)}
            </p>
          </div>
        </div>

        <!-- Zoom Factor -->
        <div class="grid">
          <Heading tag="h3" class="text-center text-blue-300 text-2xl mb-4 mt-4">
            {$localLang.SETTINGS.zoomFactor}
          </Heading>

          <Select
            bind:value={zoomFactor}
            items={ZOOM_FACTORS}
            transform={e => e}
            label={e => e + "%"}
            onChange={updateZoom}
          />
        </div>
      </div>
    </TabItem>

    {#if dataService.isElectron}
      <!-- Displays -->
      <TabItem activeClasses={tabActiveClass}>
        <div slot="title" class="flex items-center gap-2">
          <ScreenIcon size="1.2rem" />
          {$localLang.SETTINGS.screen}
        </div>

        <div class="flex flex-col items-center justify-center gap-4">
          <div class="flex justify-center gap-2">
            {#each displays as display}
              <Button color="alternative" class="gap-2" on:click={() => useDisplay(display.id)}>
                <ScreenIcon size="1.2rem" />
                {display.label}
              </Button>
            {/each}
          </div>

          <div>
            <Button on:click={updateDisplays}>{$localLang.global.update}</Button>
          </div>
        </div>
      </TabItem>

      <!-- Updates -->
      <TabItem activeClasses={tabActiveClass}>
        <div slot="title" class="flex items-center gap-2">
          <UpdateIcon size="1.2rem" />
          {$localLang.SETTINGS.update}
        </div>

        <div class="grid gap-4 place-items-center w-max mx-auto">
          <!-- CubicDB -->
          <div class="flex w-full gap-4 items-center">
            <span>{$localLang.SETTINGS.version} (CubicDB):</span>
            <mark class="ml-auto">{$version}</mark>
            <Button on:click={() => canCheckUpdate && checkUpdate()}>
              {#if !canCheckUpdate}
                <Spinner size="4" color="white" />
              {:else}
                <UpdateIcon size="1.2rem" />
              {/if}
            </Button>
            <Tooltip>{$localLang.SETTINGS.checkUpdate}</Tooltip>
          </div>

          <!-- Algorithms -->
          <div class="flex w-full gap-4 items-center">
            <span>{$localLang.HOME.algorithms}:</span>
            <mark class="ml-auto">{algVersion}</mark>
            <Button on:click={() => canCheckAlgs && checkAlgs()}>
              {#if !canCheckAlgs}
                <Spinner size="4" color="white" />
              {:else}
                <UpdateIcon size="1.2rem" />
              {/if}
            </Button>
            <Tooltip>{$localLang.SETTINGS.checkUpdate}</Tooltip>
          </div>

          <!-- Tutorials -->
          <div class="flex w-full gap-4 items-center">
            <span>{$localLang.HOME.tutorials}:</span>
            <mark class="ml-auto">{tutVersion}</mark>
            <Button on:click={() => canCheckTuts && checkTuts()}>
              {#if !canCheckTuts}
                <Spinner size="4" color="white" />
              {:else}
                <UpdateIcon size="1.2rem" />
              {/if}
            </Button>
            <Tooltip>{$localLang.SETTINGS.checkUpdate}</Tooltip>
          </div>

          <!-- Reconstructions -->
          <div class="flex w-full gap-4 items-center">
            <span>{$localLang.HOME.reconstructions}:</span>
            <mark class="ml-auto">{recVersion}</mark>
            <Button on:click={() => canCheckRecs && checkRecs()}>
              {#if !canCheckRecs}
                <Spinner size="4" color="white" />
              {:else}
                <UpdateIcon size="1.2rem" />
              {/if}
            </Button>
            <Tooltip>{$localLang.SETTINGS.checkUpdate}</Tooltip>
          </div>
        </div>
      </TabItem>
    {/if}

    <TabItem activeClasses={tabActiveClass}>
      <div slot="title" class="flex items-center gap-2">
        <StorageIcon size="1.2rem" />
        {$localLang.global.storage}
      </div>

      <Span class="flex justify-center text-lg">
        {$localLang.global.storage}: {byteToString(
          Object.entries(storage).reduce((acc, e) => acc + e[1], 0)
        )}
      </Span>

      <Table striped shadow>
        <TableBody>
          {#each storeList as st}
            <TableBodyRow>
              <TableBodyCell>{getName(st.name)}</TableBodyCell>
              <TableBodyCell>{byteToString(st.length)}</TableBodyCell>
              <TableBodyCell>
                {#if st.clean}
                  <Button on:click={() => preClearCache(st.db, st.name)} color="alternative" shadow>
                    <CleanIcon size="1.2rem" />
                  </Button>

                  <Tooltip placement="left">{$localLang.global.clear}</Tooltip>
                {/if}
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
    <Button color="green" on:click={save}>{$localLang.global.save}</Button>
    <Button color="purple" on:click={reset}>{$localLang.global.reset}</Button>
  </div>
</Card>

<Modal bind:show={showDelete} onClose={() => (showDelete = false)} closeOnClickOutside>
  <h1 class="text-gray-400 mb-4 text-lg">
    {$localLang.global.deleteWarning.replace("$1", getName(sName))}
  </h1>
  <div class="flex justify-evenly">
    <Button
      color="alternative"
      ariaLabel={$localLang.global.cancel}
      on:click={() => (showDelete = false)}
    >
      {$localLang.global.cancel}
    </Button>

    <Button color="red" ariaLabel={$localLang.global.delete} on:click={() => clearCache(sDb)}>
      {$localLang.global.delete}
    </Button>
  </div>
</Modal>

<style lang="postcss">
  hr {
    @apply w-full h-px bg-gray-700 border-none mt-6;
  }
</style>
