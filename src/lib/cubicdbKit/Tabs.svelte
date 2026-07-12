<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import { writable } from "svelte/store";
  import { twMerge } from "tailwind-merge";

  interface TabRegistration {
    id: string;
    title: string;
    content: Snippet;
    activeClasses?: string;
    open?: boolean;
  }

  interface TabsProps {
    divider?: boolean;
    class?: string;
    defaultClass?: string;
    contentClass?: string;
    children?: Snippet;
  }

  let {
    divider = false,
    class: customClass = "",
    defaultClass = "",
    contentClass = "",
    children,
  }: TabsProps = $props();

  let items = $state<TabRegistration[]>([]);
  const activeTab = writable(0);

  function register(item: TabRegistration) {
    items = [...items, item];
    if (item.open || items.length === 1) {
      activeTab.set(items.findIndex(entry => entry.id === item.id));
    }
  }

  function unregister(id: string) {
    items = items.filter(item => item.id !== id);
  }

  setContext("cubicdb-tabs", { register, unregister, activeTab });
</script>

<div class={twMerge("w-full", customClass)}>
  <div class={twMerge("tabs mb-4 flex flex-wrap gap-2", divider && "tabs-boxed", defaultClass)}>
    {#each items as item, index (item.id)}
      <button
        class={twMerge(
          "tab rounded-lg border border-base-300 px-4 py-2",
          $activeTab === index ? item.activeClasses || "tab-active bg-base-100" : "bg-base-200/40"
        )}
        onclick={() => activeTab.set(index)}
      >
        {item.title}
      </button>
    {/each}
  </div>

  <div class={contentClass}>
    {#if items[$activeTab]}
      {@render items[$activeTab].content()}
    {/if}
  </div>

  <div class="hidden">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
