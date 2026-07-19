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
    PanelLeftCloseIcon,
    PanelLeftOpenIcon,
  } from "lucide-svelte";
  import IconButton from "$lib/cubicdbKit/IconButton.svelte";

  interface INavigationDrawerProps {
    parts: { link: string; name: string }[];
    collapsed?: boolean;
  }

  let { parts, collapsed = $bindable(false) }: INavigationDrawerProps = $props();

  function isActive(href: string) {
    return parts.length > 0 && parts[0].link === href;
  }
</script>

<!-- list item snippet -->
{#snippet listItem(
  type: number,
  dash: number,
  href: string,
  Icon: any,
  key: keyof typeof $localLang.HOME
)}
  <li>
    <a
      class={twMerge("svg-container cdb-side-nav-item")}
      style={`--dash: ${dash};`}
      {href}
      aria-current={isActive(href) ? "page" : undefined}
      data-active={isActive(href)}
      data-accent={type === 3 ? "support" : undefined}
      title={collapsed ? $localLang.HOME[key] : undefined}
    >
      <Icon size="1.25rem" />
      <span class="cdb-side-nav-label">{$localLang.HOME[key]}</span>
    </a>
  </li>
{/snippet}

<div class="navigation cdb-side-nav" data-collapsed={collapsed}>
  <!-- Normal Pages -->
  <ul class="cdb-side-nav-section">
    {@render listItem(0, 50, "/timer", TimerIcon, "timer")}
    {@render listItem(0, 70, "/algorithms", BrainCogIcon, "algorithms")}
    {@render listItem(0, 16, "/tutorials", LibraryIcon, "tutorials")}
    {@render listItem(0, 65, "/reconstructions", BlocksIcon, "reconstructions")}
    {@render listItem(0, 40, "/training", DumbbellIcon, "training")}
    {@render listItem(0, 43, "/simulator", Rotate3DIcon, "simulator")}
  </ul>

  <div class="divider h-0 my-0"></div>

  <!-- Tool-like stuff -->
  <ul class="cdb-side-nav-section">
    {@render listItem(1, 30, "/tools", HammerIcon, "tools")}
    {@render listItem(1, 16, "/import-export", ArrowDownUpIcon, "importExport")}
    {@render listItem(1, 67, "/devices", MonitorSmartphoneIcon, "devices")}
    {@render listItem(1, 67, "/settings", SettingsIcon, "settings")}
  </ul>

  <div class="divider h-0 my-0"></div>

  <!-- Other -->
  <ul class="cdb-side-nav-section" data-placement="bottom">
    {@render listItem(3, 60, "/support", HeartIcon, "support")}
    {@render listItem(2, 62, "/about-cubicdb", InfoIcon, "about")}
  </ul>

  <IconButton
    class="cdb-side-nav-toggle"
    icon={collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon}
    label={collapsed ? "Expand navigation" : "Collapse navigation"}
    onclick={() => (collapsed = !collapsed)}
  />

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
