<script lang="ts">
  import "../font.css";
  import "../App.css";
  import "../daisyuiOverrides.css";
  import "../theme.scss";

  import moment from "moment";
  import { onDestroy, onMount, untrack } from "svelte";
  import { Popover, Tooltip } from "flowbite-svelte";
  import { LANGUAGES } from "@lang/index";
  import { globalLang, localLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
  import { screen } from "@stores/screen.store";
  import { DOMAIN } from "@constants";
  import FlagIcon from "../lib/components/FlagIcon.svelte";
  import { ArrowUpRightDownLeftOutline } from "flowbite-svelte-icons";
  import Select from "@material/Select.svelte";
  import { browser } from "$app/environment";
  import type { INotification } from "@interfaces";
  import Notification from "@components/Notification.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { Unsubscriber } from "svelte/store";
  import type { LayoutServerData } from "./$types";
  import { getTitleMeta } from "$lib/meta/title";
  import { dataService } from "$lib/data-services/data.service";
  import CubicDbLogo from "@components/CubicDBLogo.svelte";

  // Icons
  import {
    Timer,
    Hammer,
    Heart,
    Info,
    Settings,
    ArrowDownUp,
    Rotate3D,
    Dumbbell,
    Blocks,
    Library,
    BrainCog,
    Minus,
    X,
  } from "lucide-svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";

  let { data, children }: { data: LayoutServerData; children: any } = $props();

  $dataService.theme.applyTheme($dataService.theme.currentTheme, false);

  let notifications: INotification[] = $state([]);
  const notService = NotificationService.getInstance();

  let nSub: Unsubscriber;

  let date: string = $state("");
  let itv: any;
  let progress = $state(0);
  let parts: { link: string; name: string }[] = $state([]);
  let jsonld = $state("");

  function handleProgress(p: number) {
    progress = Math.round(p * 100) / 100;
  }

  function handleDone() {
    notService.addNotification({
      header: $localLang.SETTINGS.update,
      text: $localLang.SETTINGS.updateCompleted,
      actions: [
        { text: $localLang.global.accept, callback: () => {}, color: "alternative" },
        {
          text: $localLang.global.restart,
          callback: () => $dataService.config.close(),
          color: "purple",
        },
      ],
      fixed: true,
    });
  }

  function cancelUpdate() {
    $dataService.config
      .cancelUpdate()
      .then(() => {
        progress = 0;
      })
      .catch(err => {
        console.log("ERROR: ", err);
      });
  }

  function minimize() {
    $dataService.config.minimize();
  }

  function close() {
    $dataService.config.close();
  }

  function fullScreen() {
    document.documentElement.requestFullscreen();
  }

  function updateJSONLD() {
    jsonld = `<${"script"} type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: data.title,
      description: data.description,
      applicationCategory: "Utility",
      operatingSystem: "all",
      url: `${DOMAIN}/timer`,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    })}</${"script"}>`;
  }

  updateJSONLD();

  function handleResize() {
    $screen = {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768,
    };
  }

  onMount(() => {
    date = moment().format("hh:mm a");

    itv = setInterval(() => {
      date = moment().format("hh:mm a");
    }, 1000);

    nSub = notService.notificationSub.subscribe(v => {
      notifications = v;
    });

    $dataService.on("download-progress", handleProgress);
    $dataService.on("update-downloaded", handleDone);

    handleResize();
  });

  onDestroy(() => {
    clearInterval(itv);
    $dataService.off("download-progress", handleProgress);
    $dataService.off("update-downloaded", handleDone);
  });

  $effect(() => {
    const rt = $page.url;

    let titleMeta = getTitleMeta(rt.pathname, $localLang);

    data = {
      title: titleMeta.title,
      description: titleMeta.description,
    };

    untrack(() => {
      parts.length = 0;

      if (!rt) {
        goto("/", { replaceState: true });
        return;
      }

      let arr = rt.pathname.split("/").filter(s => s);
      parts = arr.map((e: string, p: number) => ({
        link: "/" + arr.slice(0, p + 1).join("/"),
        name: getTitleMeta(e, $localLang).title,
      }));
    });
  });
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  {@html jsonld}
</svelte:head>

<svelte:window on:resize={handleResize} />

<div class="layout" id="cubicdb-layout">
  <div class="topbar-logo px-2">
    <CubicDbLogo />
  </div>

  <div class="topbar-content">
    <h1 class="mr-auto text-white text-lg">{data.title}</h1>
    {#if progress}
      <div role="button" class="mr-2 tx-emphasis cursor-default">{progress + "%"}</div>
      <Popover class="z-50 bg-base-200">
        <span class="flex justify-center">{$localLang.global.downloading}</span>
        <progress class="w-[10rem] my-3 progress" value={progress} max={100}></progress>
        <Button class="py-2 w-full" on:click={cancelUpdate}>
          {$localLang.global.cancel}
        </Button>
      </Popover>
    {/if}

    {#if browser}
      <Select
        class="mr-2 px-2"
        items={LANGUAGES}
        bind:value={$globalLang}
        transform={e => e[1].code}
        label={e => e[1].name}
        hasIcon={e => e[2]}
        IconComponent={FlagIcon}
        onChange={() => localStorage.setItem("language", $globalLang)}
        preferIcon
        aria-label={$localLang.global.selectLanguage}
      />
    {/if}

    {#if $dataService.isElectron && $screen.width > 640}
      <span class="text-sm">{date}</span>

      <div class="w-0 mx-2 rounded-full h-6 border border-primary"></div>

      <Button
        class="bg-transparent text-base-content hover:bg-neutral border-none px-3"
        aria-label={$localLang.global.minimize}
        onclick={minimize}
      >
        <Minus size="1.2rem" />
      </Button>

      <Button
        class="bg-transparent text-base-content hover:bg-error border-none px-3"
        onclick={close}
      >
        <X size="1.2rem" />
      </Button>
    {:else if browser && !document.fullscreenElement}
      <Button class="p-2" on:click={fullScreen}>
        <ArrowUpRightDownLeftOutline size="sm" />
      </Button>
      <Tooltip>{$localLang.global.fullScreen}</Tooltip>
    {/if}
  </div>

  <div class="navigation flex flex-col justify-between overflow-auto">
    <ul class="menu">
      <li>
        <a class="svg-container hover:text-success text-primary" style="--dash: 50;" href="/timer">
          <Timer size="1.2rem" />
          {$localLang.HOME.timer}
        </a>
      </li>
      <li>
        <a
          class="svg-container hover:text-success text-secondary"
          style="--dash: 70;"
          href="/algorithms"
        >
          <BrainCog size="1.2rem" />
          {$localLang.HOME.algorithms}
        </a>
      </li>
      <li>
        <a
          class="svg-container hover:text-success text-accent"
          style="--dash: 16;"
          href="/tutorials"
        >
          <Library size="1.2rem" />
          {$localLang.HOME.tutorials}
        </a>
      </li>
      <li>
        <a
          class="svg-container hover:text-success text-success"
          style="--dash: 65;"
          href="/reconstructions"
        >
          <Blocks size="1.2rem" />
          {$localLang.HOME.reconstructions}
        </a>
      </li>
      <li>
        <a class="svg-container hover:text-success text-info" style="--dash: 40;" href="/training">
          <Dumbbell size="1.2rem" />
          {$localLang.HOME.training}
        </a>
      </li>
      <li>
        <a
          class="svg-container hover:text-success text-warning"
          style="--dash: 43;"
          href="/simulator"
        >
          <Rotate3D size="1.2rem" />
          {$localLang.HOME.simulator}
        </a>
      </li>
    </ul>

    <div class="divider h-0 my-0"></div>

    <ul class="menu">
      <li>
        <a class="svg-container hover:text-warning text-error" style="--dash: 30;" href="/tools">
          <Hammer size="1.2rem" />
          {$localLang.HOME.tools}
        </a>
      </li>
      <li>
        <a class="svg-container hover:text-warning" style="--dash: 16;" href="/import-export">
          <ArrowDownUp size="1.2rem" />
          {$localLang.HOME.importExport}
        </a>
      </li>
      <li>
        <a class="svg-container hover:text-warning" style="--dash: 67;" href="/">
          <Settings size="1.2rem" />
          {$localLang.HOME.settings}
        </a>
      </li>
    </ul>

    <div class="divider h-0 my-0"></div>

    <ul class="menu mt-auto pb-0">
      <li>
        <a class="svg-container hover:text-error" style="--dash: 60;" href="/">
          <Heart size="1.2rem" />
          {$localLang.HOME.support}
        </a>
      </li>
      <li>
        <a class="svg-container hover:text-info" style="--dash: 62;" href="/">
          <Info size="1.2rem" />
          {$localLang.HOME.about}
        </a>
      </li>
    </ul>
  </div>

  <div class="content">
    {@render children()}
  </div>

  <div class="footer-content shaded-card !p-0 gr-id place-items-center hidden">
    <ul class="flex gap-1">
      <li><Button size="sm"><Timer size="1rem"></Timer></Button></li>
      <li><Button size="sm"><Hammer size="1rem"></Hammer></Button></li>
      <li><Button size="sm"><Heart size="1rem"></Heart></Button></li>
      <li><Button size="sm"><Info size="1rem"></Info></Button></li>
      <li><Button size="sm"><Settings size="1rem"></Settings></Button></li>
      <li><Button size="sm"><ArrowDownUp size="1rem"></ArrowDownUp></Button></li>
      <li><Button size="sm"><Rotate3D size="1rem"></Rotate3D></Button></li>
      <li><Button size="sm"><Dumbbell size="1rem"></Dumbbell></Button></li>
      <li><Button size="sm"><Blocks size="1rem"></Blocks></Button></li>
      <li><Button size="sm"><Library size="1rem"></Library></Button></li>
      <li><Button size="sm"><BrainCog size="1rem"></BrainCog></Button></li>
      <li><Button size="sm"><Minus size="1rem"></Minus></Button></li>
    </ul>
  </div>
</div>

<div class="notification-container">
  {#each notifications as nt (nt.key)}
    <Notification {...nt} fixed={nt.fixed}></Notification>
  {/each}
</div>

<style lang="postcss">
  .notification-container {
    max-width: 25rem;
    position: fixed;
    right: 0;
    top: 3rem;
    height: calc(100% - 3rem);
    width: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    justify-content: center;
    z-index: 50;
  }

  .layout {
    display: grid;
    grid-template-areas:
      "topbarLogo topbarContent"
      "navigation content"
      "footer footer";

    grid-template-columns: auto 1fr;
    /* grid-template-rows: 2.5rem calc(100svh - 5rem) 2.5rem; */
    grid-template-rows: 2.5rem calc(100svh - 2.5rem);

    height: 100%;
    overflow: hidden;
  }

  .topbar-logo {
    grid-area: topbarLogo;
  }

  .topbar-content {
    grid-area: topbarContent;
    display: flex;
    align-items: center;
    justify-content: end;
    padding-right: 0.5rem;
  }

  .navigation {
    grid-area: navigation;
    width: 15rem;
  }

  .content {
    grid-area: content;
    overflow: auto;
    padding-block: 0.5rem;
  }

  .footer-content {
    grid-area: footer;
  }
</style>
