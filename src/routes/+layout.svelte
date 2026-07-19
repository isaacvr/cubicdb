<script lang="ts">
  import "../font.css";
  import "../themes/index.css";
  import "../daisyuiOverrides.css";

  import moment from "moment";
  import { onDestroy, onMount, untrack } from "svelte";
  import { localLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
  import { screen } from "@stores/screen.store";
  // import { DOMAIN } from "@constants";
  import { ArrowUpRightDownLeftOutline } from "flowbite-svelte-icons";
  import { browser } from "$app/environment";
  import type { INotification } from "@interfaces";
  import Notification from "@components/Notification.svelte";
  import { goto } from "$app/navigation";
  // import { type Unsubscriber } from "svelte/store";
  import type { LayoutServerData } from "./$types";
  import { getTitleMeta } from "$lib/meta/title";
  import { dataService } from "$lib/data-services/data.service";
  import CubicDbLogo from "@components/CubicDBLogo.svelte";

  // Icons
  import {
    TimerIcon,
    HammerIcon,
    HeartIcon,
    InfoIcon,
    SettingsIcon,
    ArrowDownUpIcon,
    Rotate3DIcon,
    DumbbellIcon,
    BlocksIcon,
    LibraryIcon,
    BrainCogIcon,
    MinusIcon,
    XIcon,
    MonitorSmartphoneIcon,
  } from "lucide-svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import TimerSessionIcon from "$lib/timer/TimerSessionIcon.svelte";
  import { page } from "$app/state";
  import type { IDevice } from "$lib/interfaces/devices.types";
  import { StackmatInput } from "$lib/timer/adaptors/Stackmat";
  import { GANInput } from "$lib/timer/adaptors/GAN";
  import { devices } from "@stores/devices.store";
  import { sessionController } from "$lib/controllers/SessionController";
  import EventDebugPanel from "$lib/components/EventDebugPanel.svelte";
  import NavigationDrawer from "@components/NavigationDrawer.svelte";
  import { createTimerApplicationRuntime } from "$lib/timer/TimerApplicationRuntime";
  import { setTimerApplicationContext } from "$lib/timer/context/timerApplicationContext";

  let { data, children }: { data: LayoutServerData; children: any } = $props();
  const timerApplication = createTimerApplicationRuntime();
  setTimerApplicationContext(timerApplication);

  $dataService.theme.applyTheme($dataService.theme.currentTheme, false);

  let notifications: INotification[] = $state([]);
  const notService = NotificationService.getInstance();

  const sessions = sessionController.sessions;
  let date: string = $state("");
  let itv: any;
  let progress = $state(0);
  let parts: { link: string; name: string }[] = $state([]);
  let navigationCollapsed = $state(false);
  // let jsonld = $state("");

  function handleProgress(p: number) {
    progress = Math.round(p * 100) / 100;
  }

  function handleDone() {
    notService.addNotification({
      header: $localLang.SETTINGS.update,
      text: $localLang.SETTINGS.updateCompleted,
      actions: [
        { text: $localLang.global.accept, callback: () => {}, color: "primary" },
        {
          text: $localLang.global.restart,
          callback: () => $dataService.config.close(),
          color: "urgent",
        },
      ],
      fixed: true,
    });
  }

  // function cancelUpdate() {
  //   $dataService.config
  //     .cancelUpdate()
  //     .then(() => {
  //       progress = 0;
  //     })
  //     .catch(err => {
  //       console.log("ERROR: ", err);
  //     });
  // }

  function minimize() {
    $dataService.config.minimize();
  }

  function close() {
    $dataService.config.close();
  }

  function fullScreen() {
    document.documentElement.requestFullscreen();
  }

  // function updateJSONLD() {
  //   jsonld = `<${"script"} type="application/ld+json">${JSON.stringify({
  //     "@context": "https://schema.org",
  //     "@type": "WebApplication",
  //     name: data.title,
  //     description: data.description,
  //     applicationCategory: "Utility",
  //     operatingSystem: "all",
  //     url: `${DOMAIN}/timer`,
  //     offers: {
  //       "@type": "Offer",
  //       price: "0",
  //       priceCurrency: "USD",
  //     },
  //   })}</${"script"}>`;
  // }

  // updateJSONLD();

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

    // nSub = notService.notificationSub.subscribe(v => {
    //   notifications = v;
    // });

    $dataService.on("download-progress", handleProgress);
    $dataService.on("update-downloaded", handleDone);

    handleResize();

    sessionController
      .loadSessions()
      .then(res => {
        $sessions = res;
      })
      .catch(err => console.log("ERROR", err));

    let it = setInterval(() => {
      if ($dataService.config.ready) {
        let savedDevices: any[] = $dataService.config.configMap.get("devices") || [];

        savedDevices.forEach(sd => {
          let type: IDevice["type"] = sd.type;

          if (type === "gan_icarry") {
            let gn = new GANInput();
            gn.fromJSON(sd);
            $devices = [...$devices, gn];
          } else if (type === "stackmat") {
            let st = new StackmatInput();
            st.fromJSON(sd);
            $devices = [...$devices, st];
          }
        });

        clearInterval(it);
      }
    }, 500);
  });

  onDestroy(() => {
    clearInterval(itv);
    $dataService.off("download-progress", handleProgress);
    $dataService.off("update-downloaded", handleDone);
    void timerApplication.destroy();
  });

  $effect(() => {
    const rt = page.url;

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
  <!-- {@html jsonld || ""} -->
</svelte:head>

<svelte:window onresize={handleResize} />

<div class="layout cdb-app-background" data-navigation-collapsed={navigationCollapsed}>
  <div class="navbar-shell draggable custom-cursor">
    <div class="navbar-logo px-2">
      <CubicDbLogo />
    </div>

    <div class="navbar-content">
      <div class="breadcrumbs text-sm mr-auto">
        <ul>
          {#each parts as part, pos (pos)}
            {#if parts[0].link === "/timer" && pos === 1}
              {@const session = $sessions.find(s => s._id === part.name)}

              <li class="cursor-pointer last-of-type:font-bold">
                <a href={part.link} class="gap-1">
                  <TimerSessionIcon icon={session?.settings.sessionType} size="1.2rem" />
                  {session?.name || ""}
                </a>
              </li>

              <!-- <Dropdown
              bind:open={dropdownOpen}
              containerClass="max-h-[20rem] overflow-y-auto overflow-x-hidden rounded-md
                z-50 w-max bg-base-200"
              id="layout-session-dropdown"
              onshow={({ detail }) => {
                if (detail) {
                  $sessions = $sessions.sort(nameCmp);

                  tick().then(() => {
                    let elem = document.querySelector("#layout-session-dropdown .active");
                    if (!elem) return;
                    elem.scrollIntoView({ block: "center" });
                  });
                }
              }}
            >
              {#each $sessions as ss}
                <DropdownItem
                  href={"/timer/" + ss._id}
                  onclick={() => (dropdownOpen = false)}
                  class={"flex items-center gap-2 py-2 px-2 text-base-content hover:bg-base-100 rounded-md " +
                    (ss._id === part.name ? "active bg-base-100 font-bold hover:bg-primary" : "")}
                >
                  <TimerSessionIcon icon={ss.settings.sessionType} size="1.2rem" />
                  {ss.name}
                </DropdownItem>
              {/each}
            </Dropdown> -->
            {:else}
              <li class="cursor-pointer last-of-type:font-bold">
                <a href={part.link}>{part.name}</a>
              </li>
            {/if}
          {/each}
          <!-- <li class="cursor-pointer hover:underline font-bold">{data.title}</li>
        <li class="cursor-pointer hover:underline">3x3</li> -->
        </ul>
      </div>

      {#if progress}
        <div role="button" class="mr-2 tx-emphasis cursor-default">{progress + "%"}</div>
        <!-- <Popover class="z-50 bg-base-200">
        <span class="flex justify-center">{$localLang.global.downloading}</span>
        <progress class="w-[10rem] my-3 progress" value={progress} max={100}></progress>
        <Button class="py-2 w-full" onclick={cancelUpdate}>
          {$localLang.global.cancel}
        </Button>
      </Popover> -->
      {/if}

      <Button type="tertiary" size="sm" icon>
        <MonitorSmartphoneIcon />
      </Button>

      <!-- <Dropdown
      containerClass="max-h-[20rem] overflow-y-auto overflow-x-hidden rounded-md
        z-50 w-max bg-base-200"
    >
      {#each $devices as device}
        <DropdownItem
          class={"flex items-center gap-2 py-2 px-2 text-base-content hover:bg-base-100 rounded-md"}
        >
          <DeviceIcon {device} />
          {device.name}

          {#if device.type === "gan_icarry" && !device.isConnected}
            <button
              onclick={() =>
                reconnect(device as GANInput, device.macAddress).catch(() =>
                  console.log("Error al conectar")
                )}
            >
              <CirclePowerIcon />
            </button>
          {:else}
            <input
              type="checkbox"
              class="toggle ml-auto"
              bind:checked={device.enabled}
              disabled={device.id.startsWith("cubicdb:device")}
            />
          {/if}
        </DropdownItem>
      {/each}
    </Dropdown> -->

      <div class="w-0 mx-2 rounded-full h-6 border border-primary"></div>

      {#if $dataService.isElectron && $screen.width > 640}
        <span class="text-sm">{date}</span>

        <div class="w-0 mx-2 rounded-full h-6 border border-primary"></div>

        <Button
          type="tertiary"
          size="sm"
          icon
          aria-label={$localLang.global.minimize}
          onclick={minimize}
        >
          <MinusIcon size="1.2rem" />
        </Button>

        <Button type="danger" size="sm" icon onclick={close}>
          <XIcon size="1.2rem" />
        </Button>
      {:else if browser && !document.fullscreenElement}
        <Button type="tertiary" size="sm" icon onclick={fullScreen}>
          <ArrowUpRightDownLeftOutline size="sm" />
        </Button>
        <!-- <Tooltip>{$localLang.global.fullScreen}</Tooltip> -->
      {/if}
    </div>
  </div>

  <NavigationDrawer {parts} bind:collapsed={navigationCollapsed} />

  <div class="content">
    {@render children?.()}
  </div>

  <div class="footer-content shaded-card p-0! gr-id place-items-center hidden">
    <ul class="flex gap-1">
      <li><Button size="sm"><TimerIcon size="1rem" /></Button></li>
      <li><Button size="sm"><HammerIcon size="1rem" /></Button></li>
      <li><Button size="sm"><HeartIcon size="1rem" /></Button></li>
      <li><Button size="sm"><InfoIcon size="1rem" /></Button></li>
      <li><Button size="sm"><SettingsIcon size="1rem" /></Button></li>
      <li><Button size="sm"><ArrowDownUpIcon size="1rem" /></Button></li>
      <li><Button size="sm"><Rotate3DIcon size="1rem" /></Button></li>
      <li><Button size="sm"><DumbbellIcon size="1rem" /></Button></li>
      <li><Button size="sm"><BlocksIcon size="1rem" /></Button></li>
      <li><Button size="sm"><LibraryIcon size="1rem" /></Button></li>
      <li><Button size="sm"><BrainCogIcon size="1rem" /></Button></li>
      <li><Button size="sm"><MinusIcon size="1rem" /></Button></li>
    </ul>
  </div>
</div>

<div class="toast toast-middle toast-end z-50">
  {#each notifications as nt (nt.key)}
    <Notification {...nt} fixed={nt.fixed}></Notification>
  {/each}
</div>

<EventDebugPanel />

<style lang="postcss">
  @reference "@src/themes/index.css";

  /* .notification-container {
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
  } */

  .layout {
    display: grid;
    grid-template-areas:
      "navbar navbar"
      "navigation content"
      "footer footer";

    grid-template-columns: var(--cdb-side-nav-width-expanded) minmax(0, 1fr);
    /* grid-template-rows: 2.5rem calc(100svh - 5rem) 2.5rem; */
    grid-template-rows: 2.5rem calc(100svh - 2.5rem);

    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

  .layout[data-navigation-collapsed="true"] {
    grid-template-columns: var(--cdb-side-nav-width-collapsed) minmax(0, 1fr);
  }

  .navbar-shell {
    grid-area: navbar;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
  }

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: end;
    padding-right: 0.5rem;
  }

  .content {
    grid-area: content;
    overflow: auto;
    padding-block: 0.5rem;
  }

  .footer-content {
    grid-area: footer;
  }

  .draggable {
    @apply select-none;
    -webkit-app-region: drag;
  }

  .draggable > * {
    -webkit-app-region: no-drag;
  }
</style>
