<script lang="ts">
  import type { Scrambler } from "@interfaces";
  import I222 from "./I222.svelte";
  import I333 from "./I333.svelte";
  import I333fm from "./I333fm.svelte";
  import I333mbf from "./I333mbf.svelte";
  import I333ni from "./I333ni.svelte";
  import I333oh from "./I333oh.svelte";
  import I444bld from "./I444bld.svelte";
  import I444wca from "./I444wca.svelte";
  import I555bld from "./I555bld.svelte";
  import I555wca from "./I555wca.svelte";
  import I666wca from "./I666wca.svelte";
  import I777wca from "./I777wca.svelte";
  import Iclkwca from "./Iclkwca.svelte";
  import Imgmp from "./Imgmp.svelte";
  import Ipyrso from "./Ipyrso.svelte";
  import Iskbso from "./Iskbso.svelte";
  import Isqrs from "./Isqrs.svelte";
  import { createEventDispatcher } from "svelte";
  import { ICONS } from "@constants";
  import I333Cross from "./I333Cross.svelte";
  import FundamentalsIcon from "@icons/HumanMaleBoardPoll.svelte";

  export let icon: any = "333";
  export let size = "2rem";
  export let selected = false;
  export let width = size;
  export let height = size;
  export let color = "currentColor";
  export let ariaLabel = "";
  export let ariaHidden = false;
  export let title = "";
  export let desc = "";
  export let buttonClass = "";
  export let noFallback = false;
  export let tabindex = -1;

  const dispatch = createEventDispatcher();

  let cl = "";
  export { cl as class };

  function handleClick(ev: MouseEvent) {
    dispatch("click", ev);
  }

  function findIcon(ic: string): Scrambler | "fundamentals" | null {
    if (ic === "fundamentals") return ic;

    for (let i = 0, maxi = ICONS.length; i < maxi; i += 1) {
      let scr = ICONS[i].scrambler;

      if (ic === scr) {
        return scr;
      } else if (Array.isArray(scr) && scr.indexOf(ic) > -1) {
        return ICONS[i].icon;
      }
    }

    return null;
  }

  let iconMap = {
    "222so": I222,
    "333": I333,
    "333cross": I333Cross,
    "333fm": I333fm,
    "333ni": I333ni,
    r3ni: I333mbf,
    "333oh": I333oh,
    "444bld": I444bld,
    "444wca": I444wca,
    "555wca": I555wca,
    "555bld": I555bld,
    "666wca": I666wca,
    "777wca": I777wca,
    clkwca: Iclkwca,
    mgmp: Imgmp,
    pyrso: Ipyrso,
    skbso: Iskbso,
    sqrs: Isqrs,
    fundamentals: FundamentalsIcon,
  } as any;
</script>

<button
  type="button"
  {tabindex}
  class={"rounded-md p-1 grid place-items-center w-fit cursor-default " + buttonClass}
  class:selected
  on:click={handleClick}
>
  {#if findIcon(icon)}
    <svelte:component
      this={iconMap[findIcon(icon) || "333"]}
      {size}
      {width}
      {height}
      {color}
      {ariaLabel}
      {ariaHidden}
      {title}
      {desc}
      class={cl}
    />
  {:else if !noFallback}
    <I333 {size} {width} {height} {color} {ariaLabel} {ariaHidden} {title} {desc} class={cl} />
  {/if}
</button>

<style lang="postcss">
  .selected {
    @apply bg-primary-800 text-white;
  }
</style>
