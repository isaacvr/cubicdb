<script lang="ts">
  import type { Tab } from "@interfaces";
  import { Button } from "flowbite-svelte";

  import { setContext } from "svelte";
  import { writable } from "svelte/store";

  const selectedTab = writable(0);

  let tabs: Tab[] = [];
  let cl = "";

  export { cl as class };
  export let onChange = (tab?: number) => {};

  setContext("TABS", {
    registerTab(tab: Tab) {
      tabs.push(tab);
      tabs.forEach((e, p) => (e.index = p));
      tabs = tabs;
    },

    unregisterTab(tab: Tab) {
      let pos = tabs.indexOf(tab);
      tabs.splice(pos, 1);

      $selectedTab = $selectedTab === tab.index ? 0 : $selectedTab;

      tabs.forEach((e, p) => (e.index = p));
      tabs = tabs;
    },

    selectedTab,
  });

  function selectTab(tab: Tab) {
    $selectedTab = tab.index;
    onChange(tab.index);
  }

  export function prevTab() {
    let p = Math.max(0, $selectedTab - 1);
    selectTab(tabs[p]);
  }

  export function nextTab() {
    let p = Math.min(tabs.length - 1, $selectedTab + 1);
    selectTab(tabs[p]);
  }
</script>

<main class={`w-full ` + (cl || "")}>
  <section class="flex relative" style="--len: {tabs.length};">
    <slot />
  </section>
  <footer class="flex mt-auto border-t border-t-gray-700 gap-1 px-2 py-1">
    {#each tabs as tab}
      <Button
        color="none"
        ariaLabel={tab.ariaLabel}
        class="rounded-lg w-full
        {tab.index === $selectedTab
          ? 'bg-blue-600 text-white hover:bg-blue-500 z-10 '
          : 'bg-backgroundLv1 hover:bg-backgroundLv2'}"
        on:click={() => selectTab(tab)}
      >
        {#if tab.icon}
          <svelte:component this={tab.icon} />
        {/if}
        {tab.name}
      </Button>
    {/each}
  </footer>
</main>

<style>
  main {
    display: grid;
    grid-template-rows: 1fr auto;
    overflow: hidden;
  }
</style>
