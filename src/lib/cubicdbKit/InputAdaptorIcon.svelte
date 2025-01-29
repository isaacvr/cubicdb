<script lang="ts">
  import type { TimerInput } from "@interfaces";
  import { BoxIcon, HandIcon, KeyboardIcon, RectangleEllipsisIcon } from "lucide-svelte";

  interface InputAdaptorIconProps {
    icon: TimerInput;
    size: string;
  }

  let { icon = $bindable(), size = $bindable() }: InputAdaptorIconProps = $props();
</script>

{#if icon === "Keyboard"}
  <KeyboardIcon bind:size />
{:else if icon === "Manual"}
  <RectangleEllipsisIcon bind:size />
{:else if icon === "StackMat"}
  <HandIcon bind:size />
{:else if icon === "QY-Timer"}
  <HandIcon bind:size />
{:else if icon === "GAN Cube"}
  <BoxIcon bind:size />
{:else if icon === "Virtual"}
  <BoxIcon bind:size />
{/if}
