<script lang="ts">
  interface Tab {
    name: string;
    id: string;
    index: number;
    icon: any;
  }

  import { getContext, onMount, onDestroy } from 'svelte';
  import { TABS } from './TabGroup.svelte';

  export let name: string;
  export let icon: any = null;
  const id = Math.random().toString();
  const { registerTab, unregisterTab, selectedTab } = getContext(TABS) as any;
  let tab: Tab = { name: "", id: "", index: 0, icon: null };

  onMount(() => {
    tab = { name, id, index: 0, icon };
    registerTab(tab);
  });

  onDestroy(() => {
    unregisterTab(tab);
  });
</script>

<section
  class="absolute w-full h-full inset-0 flex"
  style="--index: {tab.index}; --selected-tab: {$selectedTab};">
  <slot/>
</section>

<style>
  section {
    transition: left 200ms;
    left: calc((var(--index, 0) - var(--selected-tab, 0)) * 100%);
  }
</style>