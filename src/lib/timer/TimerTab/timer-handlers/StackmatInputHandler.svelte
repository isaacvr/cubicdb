<script lang="ts">
  import type { Device } from "$lib/interfaces/devices.types";
  import { type InputContext, type TimerContext } from "@interfaces";
  import { WifiIcon, WifiOffIcon } from "lucide-svelte";
  import { localLang } from "$lib/stores/language.service";
  import type { Writable } from "svelte/store";
  import KeyboardInputHandler from "./KeyboardInputHandler.svelte";

  interface VirtualInputProps {
    inputContext: InputContext;
    context: TimerContext;
    device: Writable<Device>;
  }

  let {
    inputContext = $bindable(),
    context = $bindable(),
    device = $bindable(),
  }: VirtualInputProps = $props();

  const {} = inputContext;
  const {} = context;
</script>

<KeyboardInputHandler {context} {inputContext} {device} showActions={false} />

<span class="text-sm flex gap-2 items-center">
  {$localLang.TIMER.stackmatStatus}:

  <span
    class={$device.type === "stackmat" && $device.isConnected ? "text-green-600" : "text-red-600"}
  >
    {#if $device.type === "stackmat" && $device.isConnected}
      <WifiIcon size="1.2rem" />
    {:else}
      <WifiOffIcon size="1.2rem" />
    {/if}
  </span>

  <br />
</span>
