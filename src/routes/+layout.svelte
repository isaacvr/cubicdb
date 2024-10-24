<script lang="ts">
  import "../App.css";

  import moment from "moment";
  import Minus from "@icons/Minus.svelte";
  import Close from "@icons/Close.svelte";
  import { onDestroy, onMount } from "svelte";
  // import { DataService } from "@stores/data.service";
  import {
    Breadcrumb,
    BreadcrumbItem,
    Button,
    Navbar,
    NavHamburger,
    NavUl,
    Popover,
    Span,
    Progressbar,
    Tooltip,
  } from "flowbite-svelte";
  import { LANGUAGES } from "@lang/index";
  import { globalLang, localLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
  import { screen } from "@stores/screen.store";
  import { CubicDBICON, DOMAIN } from "@constants";
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
  import { applyTheme } from "$lib/themes/manageThemes";
  import { DEFAULT_THEME } from "$lib/themes/default";

  export let data: LayoutServerData;

  let notifications: INotification[] = [];
  const notService = NotificationService.getInstance();

  let nSub: Unsubscriber;

  let date: string, itv: any;
  let progress = 0;
  let parts: { link: string; name: string }[] = [];
  let jsonld = "";

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

  function updateParts(rt: URL) {
    parts.length = 0;

    if (!rt) {
      goto("/");
      return;
    }

    let arr = rt.pathname.split("/").filter(s => s);

    parts = arr.map((e: string, p: number) => ({
      link: "/" + arr.slice(0, p + 1).join("/"),
      name: getTitleMeta(e, $localLang).title,
    }));
  }

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

    applyTheme(DEFAULT_THEME);

    handleResize();
  });

  onDestroy(() => {
    clearInterval(itv);
    $dataService.off("download-progress", handleProgress);
    $dataService.off("update-downloaded", handleDone);
  });

  $: $localLang, updateParts($page.url);
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  {@html jsonld}
</svelte:head>

<svelte:window on:resize={handleResize} />

<div class="relative py-6">
  <Navbar
    let:hidden
    let:toggle
    class="justify-between fixed top-0 left-0 w-full z-50 border-b p-2"
    fluid
  >
    <a href="/">
      <div class="flex">
        <img
          draggable="false"
          src={CubicDBICON}
          alt=""
          width="100%"
          height="100%"
          class="ml-1 w-8 flex my-auto"
        />
        <Span class="self-center whitespace-nowrap text-base font-semibold ml-2">CubicDB</Span>
      </div>
    </a>

    {#if parts.length}
      {#if !$screen.isMobile && !hidden && Boolean(toggle())}
        &nbsp;
      {/if}

      <NavUl
        key="path-list"
        {hidden}
        class="order-2 md:order-1"
        ulClass="md:p-0 max-md:p-4"
        on:click={() => !hidden && toggle()}
      >
        <Breadcrumb>
          <BreadcrumbItem home href="/" on:click={() => !hidden && toggle()}></BreadcrumbItem>
          {#each parts as part}
            <BreadcrumbItem href={part.link} on:click={() => !hidden && toggle()}>
              {part.name.toUpperCase()}
            </BreadcrumbItem>
          {/each}
        </Breadcrumb>
      </NavUl>
    {/if}

    <div class="flex order-1 md:order-2">
      <div {hidden} class="flex ml-auto items-center">
        {#if progress}
          <span class="mr-2 text-yellow-500 cursor-default"> {progress + "%"} </span>
          <Popover>
            <Span class="flex justify-center">{$localLang.global.downloading}</Span>
            <Progressbar {progress} divClass="w-[10rem] my-3" />
            <Button color="red" class="py-2 w-full" on:click={cancelUpdate}
              >{$localLang.global.cancel}</Button
            >
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
            iconComponent={FlagIcon}
            onChange={() => localStorage.setItem("language", $globalLang)}
            preferIcon
            aria-label={$localLang.global.selectLanguage}
          />
        {/if}

        {#if $dataService.isElectron && $screen.width > 640}
          <span>{date}</span>

          <Button
            color="none"
            class="ml-2 cursor-pointer rounded-sm hover:bg-primary-600 hover:text-white"
            aria-label={$localLang.global.minimize}
            on:click={minimize}
          >
            <Minus />
          </Button>

          <Button
            color="none"
            class="cursor-pointer rounded-sm hover:bg-red-600 hover:text-white"
            aria-label={$localLang.global.close}
            on:click={close}
          >
            <Close height="100%" />
          </Button>
        {:else if browser && !document.fullscreenElement}
          <Button color="alternative" class="p-2" on:click={fullScreen}>
            <ArrowUpRightDownLeftOutline size="sm" />
          </Button>
          <Tooltip>{$localLang.global.fullScreen}</Tooltip>
        {/if}
      </div>

      {#if parts.length}
        <NavHamburger class="!p-1" menuClass="h-full w-full shrink-0" on:click={toggle} />
      {/if}
    </div>
  </Navbar>
</div>

<slot />

<div class="notification-container">
  {#each notifications as nt (nt.key)}
    <Notification {...nt} fixed={nt.fixed} />
  {/each}
</div>

<style>
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
</style>
