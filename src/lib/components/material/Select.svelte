<script lang="ts">
  import CubeCategory from "@components/wca/CubeCategory.svelte";
  import { getColorByName } from "@constants";
  import { mod } from "@helpers/math";
  import { weakRandomUUID } from "@helpers/strings";
  import type { Placement, Side } from "@interfaces";
  import { Dropdown, DropdownItem } from "$lib/cubicdbKit";
  import { createEventDispatcher, onMount, tick, untrack } from "svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { twMerge } from "tailwind-merge";
  import { ChevronDownIcon } from "lucide-svelte";

  interface SelectProps {
    class?: string;
    placeholder?: string;
    value?: any;
    items: readonly any[];
    onChange?: (item: any, pos: number, arr: readonly any[]) => void;
    label?: (item: any, pos: number) => string;
    transform?: (item: any, pos?: number, arr?: readonly any[]) => any;
    hasIcon?: null | ((v: any) => any);
    disabled?: (item: any, pos: number, arr?: readonly any[]) => boolean;
    placement?: Side | Placement;
    IconComponent?: any;
    iconKey?: string;
    iconSize?: string | null;
    preferIcon?: boolean;
    [key: string]: any;
  }

  let {
    class: cl = $bindable(""),
    placeholder = "",
    value = $bindable(),
    items = [],
    onChange = (item: any, pos: number, arr: readonly any[]) => {},
    label = (item: any, pos: number): string => (item || "").toString(),
    transform = (item: any, pos?: number, arr?: readonly any[]) => item.value,
    hasIcon = null,
    disabled = (item: any, pos: number, arr?: readonly any[]) => false,
    placement = "bottom",
    IconComponent = CubeCategory,
    iconKey = "icon",
    iconSize = "1.2rem",
    preferIcon = false,
  }: SelectProps = $props();

  const selectID = "s" + weakRandomUUID().replace(/-/g, "");
  const dispatch = createEventDispatcher();

  let list: HTMLUListElement | null;
  let dropdown: HTMLDetailsElement | null;

  let showOptions = $state(false);
  let mounted = false;
  let gridW = $state(1);
  let focused = 0;
  let lastWord = "";
  let lastTime = 0;

  function getItemValue(item: any, pos: number) {
    return transform(item, pos, items);
  }

  function isSameValue(a: any, b: any) {
    return Object.is(a, b);
  }

  function findValuePosition() {
    for (let i = 0, maxi = items.length; i < maxi; i += 1) {
      if (isSameValue(getItemValue(items[i], i), value)) {
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
      focused = pos;
      list.children[pos].scrollIntoView({ block: "center" });
      tick().then(() => focusElement(list));
    }
  }

  function emitStatus(st: boolean) {
    st && dispatch("open");
    !st && dispatch("close");

    st && (focused = findValuePosition());
  }

  function updateGridW(list: readonly any[]) {
    gridW = Math.ceil(Math.sqrt(list.length));
  }

  function focusElement(list: any) {
    let elem = (list.children[0].children[focused * 2] as HTMLLIElement)
      .firstElementChild as HTMLButtonElement;
    if (!elem) return;
    elem.focus();
  }

  function handleKeydown(ev: KeyboardEvent) {
    if (!showOptions) return;
    if (ev.code === "Escape") {
      showOptions = false;
      return;
    }

    if (ev.code === "Space") {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    if (!/^(Key[A-Z]|ArrowUp|ArrowDown|Digit|Numpat)/.test(ev.code)) return;

    let list = document.querySelector(`#${selectID}`);
    if (!list) return;

    if (ev.code === "ArrowUp" || ev.code === "ArrowDown") {
      ev.preventDefault();
      focused = mod(
        ev.code === "ArrowUp" ? focused - 1 : focused + 1,
        Math.floor(list.children[0].children.length / 2) + 1
      );

      tick().then(() => focusElement(list));
      return;
    }

    let data = items.map((it, p) => ({
      label: (label(it, p) || "").trim().toLowerCase(),
      disabled: disabled(it, p, items),
      value: transform(it, p, items),
    }));

    if (!data.length) return;

    let letter = /^(Digit|Numpad)/.test(ev.code)
      ? ev.code.slice(-1)
      : ev.code.slice(3).toLowerCase();

    let toFind = performance.now() - lastTime > 700 ? letter : lastWord + letter;
    lastTime = performance.now();

    let ini = mod(focused + (toFind.length === 1 ? 1 : 0), data.length);

    for (let i = 0, maxi = data.length; i < maxi; i += 1) {
      let p = mod(ini + i, data.length);

      if (data[p].label.startsWith(toFind)) {
        lastWord = toFind;
        focused = p;
        tick().then(() => focusElement(list));
        return;
      }
    }

    toFind = letter;
    ini = mod(focused + 1, data.length);

    for (let i = 0, maxi = data.length; i < maxi; i += 1) {
      let p = mod(ini + i, data.length);

      if (data[p].label.startsWith(toFind)) {
        ev.preventDefault();
        lastWord = toFind;
        focused = p;
        tick().then(() => focusElement(list));
        return;
      }
    }

    lastWord = "";
  }

  onMount(() => (mounted = true));

  $effect(() => emitStatus(showOptions));
  $effect(() => updateGridW(items));
</script>

<svelte:window onkeydown={handleKeydown} />

<details
  class={twMerge("dropdown", `dropdown-${placement}`)}
  bind:this={dropdown}
  data-dropdown={selectID}
>
  <summary
    class={twMerge("btn border border-base-content/20 rounded-lg! gap-1 h-9 py-1 px-2 ", cl)}
    onclick={handleClick}
  >
    {#if items.some((a, p) => isSameValue(getItemValue(a, p), value))}
      {@const item = items.reduce(
        (acc, e, p) => (isSameValue(getItemValue(e, p), value) ? [e, p] : acc),
        [null, -1]
      )}

      {#if hasIcon && IconComponent}
        {@const iconProps = Object.assign(iconSize ? { size: iconSize } : {}, {
          [iconKey]: hasIcon(item[0]),
        })}

        <IconComponent {...iconProps} class="pointer-events-none" noFallback />
      {/if}

      {#if !(hasIcon && IconComponent && preferIcon)}
        {label(item[0], item[1])}
      {/if}
    {:else}
      {placeholder}
    {/if}

    <ChevronDownIcon size="1.2rem" class="ml-auto" />
  </summary>

  <ul
    id={selectID}
    bind:this={list}
    class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm
      max-h-80 overflow-x-hidden overflow-y-auto grid"
  >
    {#each items as item, pos}
      <li>
        <button
          class={`flex items-center gap-2 py-2 px-2 text-gray-300
          ` +
            (disabled(item, pos, items)
              ? " text-gray-500 [&>div]:opacity-40 pointer-events-none select-none "
              : " ") +
            (isSameValue(getItemValue(item, pos), value)
              ? " bg-primary-600 text-gray-100 hover:bg-primary-400 "
              : " ")}
          onclick={e => {
            e.preventDefault();
            if (disabled(item, pos, items)) return;
            value = untrack(() => getItemValue(item, pos));
            onChange(item, pos, items);
            (dropdown?.children[0] as any).blur();
            (e.target as any).blur();
            dropdown?.removeAttribute("open");
          }}
        >
          {#if hasIcon && IconComponent}
            {@const iconProps = Object.assign(iconSize ? { size: iconSize } : {}, {
              [iconKey]: hasIcon(item),
            })}
            <IconComponent {...iconProps} noFallback />
          {/if}

          {#if (label(item, pos) || "").toString().trim()}
            {label(item, pos)}
          {:else}
            &nbsp;
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</details>
