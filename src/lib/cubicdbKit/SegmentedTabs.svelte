<script lang="ts">
  import { twMerge } from "tailwind-merge";

  type IconComponent = any;

  export interface SegmentedTabItem {
    id: string;
    label: string;
    icon?: IconComponent;
    disabled?: boolean;
  }

  interface SegmentedTabsProps {
    items: SegmentedTabItem[];
    selected: string;
    onSelect?: (item: SegmentedTabItem, event: MouseEvent) => void;
    class?: string;
  }

  let {
    items,
    selected,
    onSelect = () => {},
    class: customClass = "",
  }: SegmentedTabsProps = $props();
</script>

<div role="tablist" class={twMerge("cdb-segmented-tabs", customClass)}>
  {#each items as item (item.id)}
    {@const Icon = item.icon}
    <button
      role="tab"
      type="button"
      class="cdb-segmented-tab"
      aria-selected={item.id === selected}
      disabled={item.disabled}
      onclick={event => onSelect(item, event)}
    >
      {#if Icon}
        <Icon size={16} />
      {/if}
      <span>{item.label}</span>
    </button>
  {/each}
</div>
