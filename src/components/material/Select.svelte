<script lang="ts">
  import WcaCategory from "@components/wca/WCACategory.svelte";
  import { weakRandomUUID } from "@helpers/strings";
  import ExpandIcon from "@icons/ChevronDown.svelte";

  import { Button, Dropdown, DropdownDivider, DropdownItem } from "flowbite-svelte";
  import { createEventDispatcher, onMount } from "svelte";

  type Side = "top" | "right" | "bottom" | "left";
  type Alignment = "start" | "end";
  type Placement = `${Side}-${Alignment}`;

  let cl = "";
  export { cl as class };
  export let placeholder: string = "";
  export let value: any = placeholder;
  export let items: readonly any[];
  export let onChange = (item: any, pos: number, arr: readonly any[]) => {};
  export let label = (item?: any) => (item || "").toString();
  export let transform = (item: any, pos?: number, arr?: readonly any[]) => item.value;
  export let hasIcon: null | ((v: any) => any) = null;
  export let disabled = (item: any, pos?: number, arr?: readonly any[]) => false;
  export let placement: Side | Placement = "bottom";
  export let useFixed = false;
  export let iconComponent: any = WcaCategory;
  export let iconKey = "icon";
  export let iconSize: string | null = "1.2rem";
  export let preferIcon = false;

  const selectID = "s" + weakRandomUUID().replace(/-/g, "");
  const dispatch = createEventDispatcher();

  let showOptions = false;
  let mounted = false;

  function findValuePosition() {
    for (let i = 0, maxi = items.length; i < maxi; i += 1) {
      if (transform(items[i], i, items) === value) {
        return i;
      }
    }

    return -1;
  }

  function handleClick() {
    let list = document.querySelector(`#${selectID}`);

    if (!list) return;

    let pos = findValuePosition();

    if (pos > -1) {
      list.children[0].children[pos * 2].scrollIntoView({ block: "nearest" });
    }
  }

  function emitStatus(st: boolean) {
    st && dispatch("open");
    !st && dispatch("close");
  }

  onMount(() => (mounted = true));

  $: emitStatus(showOptions);
</script>

<Button color="alternative" class={"gap-1 h-9 py-1 px-2 " + cl} on:click={handleClick}>
  {#if items.some((a, p, i) => transform(a, p, i) === value)}
    {@const item = items.find((e, p, i) => transform(e, p, i) === value)}

    {#if hasIcon && iconComponent}
      {@const iconProps = Object.assign(iconSize ? { size: iconSize } : {}, {
        [iconKey]: hasIcon(item),
      })}

      <svelte:component this={iconComponent} {...iconProps} noFallback />
    {/if}

    {#if !(hasIcon && iconComponent && preferIcon)}
      {label(item)}
    {/if}
  {:else}
    {placeholder}
  {/if}

  <ExpandIcon size="1.2rem" class="ml-auto" />
</Button>

<Dropdown
  bind:open={showOptions}
  id={selectID}
  containerClass={"max-h-[20rem] overflow-y-auto z-50 w-max " + (useFixed ? "!fixed" : "")}
  {placement}
>
  {#each items as item, pos}
    {#if pos}
      <DropdownDivider />
    {/if}

    <DropdownItem
      class={`flex items-center gap-2 py-2 px-2
        ` +
        (disabled(item, pos, items) ? " text-gray-500 pointer-events-none select-none " : " ") +
        (transform(item, pos, items) === value
          ? "bg-primary-600 text-white dark:hover:bg-primary-400"
          : "")}
      on:click={() => {
        if (disabled(item, pos, items)) return;

        showOptions = false;
        value = transform(item, pos, items);
        onChange(item, pos, items);
      }}
    >
      {#if hasIcon && iconComponent}
        {@const iconProps = Object.assign(iconSize ? { size: iconSize } : {}, {
          [iconKey]: hasIcon(item),
        })}
        <svelte:component this={iconComponent} {...iconProps} noFallback />
      {/if}

      {#if label(item).trim()}
        {label(item)}
      {:else}
        &nbsp;
      {/if}
    </DropdownItem>
  {/each}
</Dropdown>
