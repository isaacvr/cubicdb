<script lang="ts">
  import { localLang } from "@stores/language.service";
  import { twMerge } from "tailwind-merge";
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
    MonitorSmartphoneIcon,
  } from "lucide-svelte";

  interface INavigationDrawerProps {
    parts: { link: string; name: string }[];
  }

  let { parts }: INavigationDrawerProps = $props();
</script>

<!-- list item snippet -->
{#snippet listItem(
  type: number,
  dash: number,
  href: string,
  Icon: any,
  key: keyof typeof $localLang.HOME
)}
  {@const colorType = [
    "hover:text-success",
    "hover:text-warning",
    "hover:text-info",
    "hover:text-error",
  ]}
  <li>
    <a
      class={twMerge(
        "svg-container",
        colorType[type],
        parts.length && parts[0].link === href ? "bg-primary/20!" : ""
      )}
      style={`--dash: ${dash};`}
      {href}
    >
      <Icon size="1.2rem" />
      {$localLang.HOME[key]}
    </a>
  </li>
{/snippet}

<div class="navigation outline outline-primary flex flex-col justify-between overflow-auto">
  <!-- Normal Pages -->
  <ul class="menu w-full">
    {@render listItem(0, 50, "/timer", TimerIcon, "timer")}
    {@render listItem(0, 70, "/algorithms", BrainCogIcon, "algorithms")}
    {@render listItem(0, 16, "/tutorials", LibraryIcon, "tutorials")}
    {@render listItem(0, 65, "/reconstructions", BlocksIcon, "reconstructions")}
    {@render listItem(0, 40, "/training", DumbbellIcon, "training")}
    {@render listItem(0, 43, "/simulator", Rotate3DIcon, "simulator")}
  </ul>

  <div class="divider h-0 my-0"></div>

  <!-- Tool-like stuff -->
  <ul class="menu w-full">
    {@render listItem(1, 30, "/tools", HammerIcon, "tools")}
    {@render listItem(1, 16, "/import-export", ArrowDownUpIcon, "importExport")}
    {@render listItem(1, 67, "/devices", MonitorSmartphoneIcon, "devices")}
    {@render listItem(1, 67, "/settings", SettingsIcon, "settings")}
  </ul>

  <div class="divider h-0 my-0"></div>

  <!-- Other -->
  <ul class="menu w-full mt-auto pb-0">
    {@render listItem(3, 60, "/support", HeartIcon, "support")}
    {@render listItem(2, 62, "/about-cubicdb", InfoIcon, "about")}
  </ul>

  <!-- <Select
      class="h-4! py-0! mb-3 mx-2 mt-1"
      items={LANGUAGES}
      bind:value={$globalLang}
      transform={e => e[1].code}
      label={e => e[1].name}
      hasIcon={e => e[2]}
      IconComponent={FlagIcon}
      onChange={() => {
        const global = $dataService.config.global;
        global.lang = $globalLang;
        $dataService.config.saveConfig();
      }}
      placement="right"
      aria-label={$localLang.global.selectLanguage}
    /> -->
</div>

<style>
  .navigation {
    grid-area: navigation;
    width: 15rem;
  }
</style>
