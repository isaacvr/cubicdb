<script lang="ts">
  import DeviceIcon from "$lib/cubicdbKit/DeviceIcon.svelte";
  import type { Device } from "$lib/interfaces/devices.types";
  import { localLang } from "$lib/stores/language.service";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  let devices: Writable<Device[]> = getContext("devices");
</script>

<div class="shaded-card h-full">
  <h1 class="text-center text-2xl">{$localLang.HOME.devices}</h1>

  <ul
    class="content overflow-y-auto overflow-x-clip grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]
      grid-rows-[repeat(auto-fit,6.2rem)] gap-2"
  >
    {#each $devices as device (device.id)}
      <li class="h-[6rem] btn w-full shaded-card hover:bg-base-100 gap-2 grid grid-cols-[30%,70%]">
        <div class="w-10 m-auto">
          <DeviceIcon type={device.type} size="100%" />
        </div>
        <div class="session-content flex flex-col text-left h-full">
          <span class="font-normal h-min">{device.name}</span>
          <span class="!text-xs font-light bg-base-100 w-fit px-1 py-0 rounded-sm scale-90">
            info
          </span>
        </div>
      </li>
    {/each}
  </ul>
</div>

<!-- Device
  - connected: boolean
  - name: string
  - protocol: "keyboard" | "wifi" | "bluetooth" | "usb" | "network"
  - mac: string
  - ip: string
  -  -->
