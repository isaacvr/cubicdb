<script lang="ts">
  import WcaCategory from "@components/wca/WCACategory.svelte";
  import { getColorByName } from "@constants";
  import { mod } from "@helpers/math";
  import { weakRandomUUID } from "@helpers/strings";
  import type { Placement, Side } from "@interfaces";
  import { Dropdown, DropdownDivider, DropdownItem } from "flowbite-svelte";
  import { createEventDispatcher, onMount, tick } from "svelte";
  import { ChevronDown } from "lucide-svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";

  interface SelectProps {
    class?: string;
    type?: "color" | "select";
    placeholder?: string;
    value?: any;
    items: readonly any[];
    onChange?: (item: any, pos: number, arr: readonly any[]) => void;
    label?: (item: any, pos: number) => string;
    transform?: (item: any, pos?: number, arr?: readonly any[]) => any;
    hasIcon?: null | ((v: any) => any);
    disabled?: (item: any, pos: number, arr?: readonly any[]) => boolean;
    placement?: Side | Placement;
    useFixed?: boolean;
    IconComponent?: any;
    iconKey?: string;
    iconSize?: string | null;
    preferIcon?: boolean;
    [key: string]: any;
  }

  let {
    class: cl = "",
    type = "select",
    placeholder = "",
    value = $bindable(""),
    items = [],
    onChange = (item: any, pos: number, arr: readonly any[]) => {},
    label = (item: any, pos: number): string => (item || "").toString(),
    transform = (item: any, pos?: number, arr?: readonly any[]) => item.value,
    hasIcon = null,
    disabled = (item: any, pos: number, arr?: readonly any[]) => false,
    placement = "bottom",
    useFixed = false,
    IconComponent = WcaCategory,
    iconKey = "icon",
    iconSize = "1.2rem",
    preferIcon = false,
    ...otherProps
  }: SelectProps = $props();

  const selectID = "s" + weakRandomUUID().replace(/-/g, "");
  const dispatch = createEventDispatcher();

  let showOptions = $state(false);
  let mounted = false;
  let gridW = $state(1);
  let focused = 0;
  let lastWord = "";
  let lastTime = 0;

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
      focused = pos;
      list.children[0].children[pos * 2].scrollIntoView({ block: "nearest" });
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

<Button
  class={"gap-1 h-9 py-1 px-2 input font-normal text-sm text-base-content " + cl}
  onclick={handleClick}
  {...otherProps}
>
  {#if items.some((a, p, i) => transform(a, p, i) === value)}
    {@const item = items.reduce(
      (acc, e, p, i) => (transform(e, p, i) === value ? [e, p] : acc),
      [null, -1]
    )}

    {#if hasIcon && IconComponent}
      {@const iconProps = Object.assign(iconSize ? { size: iconSize } : {}, {
        [iconKey]: hasIcon(item[0]),
      })}

      <IconComponent {...iconProps} noFallback></IconComponent>
    {/if}

    {#if !(hasIcon && IconComponent && preferIcon)}
      {#if type === "color"}
        <div
          class="color w-4 h-4"
          style={"background-color: " + getColorByName(label(item[0], item[1])) + ";"}
        ></div>
      {:else}
        {label(item[0], item[1])}
      {/if}
    {/if}
  {:else}
    {placeholder}
  {/if}

  <ChevronDown size="1.3rem" class="ml-auto" />
</Button>

<Dropdown
  bind:open={showOptions}
  trigger="click"
  id={selectID}
  containerClass={`max-h-[20rem] overflow-y-auto overflow-x-hidden rounded-md
    z-50 w-max bg-base-200 ` +
    (useFixed ? " !fixed " : "") +
    (type === "color"
      ? " [&>ul]:grid-cols-[repeat(var(--grid-w),1fr)] [&>ul]:grid [&>ul>div]:hidden  "
      : "")}
  {placement}
  style={"--grid-w: " + gridW}
>
  {#each items as item, pos}
    {#if pos}
      <li class="divider my-1 h-0 !border-red-500"></li>
    {/if}

    <DropdownItem
      class={`flex items-center gap-2 py-2 px-2 text-base-content hover:bg-base-100 rounded-md
        ` +
        (disabled(item, pos, items)
          ? " [&>div]:opacity-40 pointer-events-none select-none "
          : " ") +
        (transform(item, pos, items) === value ? " bg-base-100 hover:bg-primary " : " ")}
      on:click={() => {
        if (disabled(item, pos, items)) return;

        showOptions = false;
        value = transform(item, pos, items);
        onChange(item, pos, items);
      }}
    >
      {#if hasIcon && IconComponent}
        {@const iconProps = Object.assign(iconSize ? { size: iconSize } : {}, {
          [iconKey]: hasIcon(item),
        })}

        <IconComponent {...iconProps} noFallback></IconComponent>
      {/if}

      {#if label(item, pos).trim()}
        {#if type === "color"}
          <div
            class="color w-4 h-4"
            style={"background-color: " + getColorByName(label(item, pos)) + ";"}
          ></div>
        {:else}
          {label(item, pos)}
        {/if}
      {:else}
        &nbsp;
      {/if}
    </DropdownItem>
  {/each}
</Dropdown>
