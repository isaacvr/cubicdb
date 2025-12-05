<script lang="ts">
  import type { Device } from "$lib/interfaces/devices.types";
  import Simulator from "$lib/simulator/Simulator.svelte";
  import { type InputContext, type TimerContext } from "@interfaces";
  import type { Writable } from "svelte/store";

  interface VirtualInputProps {
    inputContext: InputContext;
    context: TimerContext;
    device: Writable<Device>;
  }

  let { inputContext = $bindable(), context = $bindable() }: VirtualInputProps = $props();

  const {} = inputContext;
  const {} = context;
</script>

<Simulator contained enableDrag={false} selectedPuzzle="rubik" order={3} />
