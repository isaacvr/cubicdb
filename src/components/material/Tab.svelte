<script>
  import { getContext, onMount, onDestroy } from 'svelte';
  import { TABS } from './TabGroup.svelte';

  export let name;
  export let icon = null;
  const id = Math.random().toString();
  const { registerTab, unregisterTab, selectedTab } = getContext(TABS);
  let tab = {};

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