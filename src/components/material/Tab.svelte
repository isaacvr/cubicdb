<script lang="ts">
  import type { Tab } from '@interfaces';
  import { getContext, onMount, onDestroy } from 'svelte';
  import { TABS } from './TabGroup.svelte';

  export let name: string;
  export let icon: any = null;
  export let ariaLabel = '';
  const id = Math.random().toString();
  const { registerTab, unregisterTab, selectedTab } = getContext(TABS) as any;
  let tab: Tab = { name: "", id: "", index: 0, icon: null, ariaLabel };

  onMount(() => {
    tab = { name, id, index: 0, icon, ariaLabel };
    registerTab(tab);
  });

  onDestroy(() => {
    unregisterTab(tab);
  });
</script>

<section
  class="absolute w-full h-full inset-0 flex { tab.index != $selectedTab ? 'invisible' : '' }"
  style="--index: {tab.index}; --selected-tab: {$selectedTab};">
  <slot/>
</section>

<style>
  section {
    /* transition: left 200ms; */
    left: calc((var(--index, 0) - var(--selected-tab, 0)) * 100%);
  }
</style>