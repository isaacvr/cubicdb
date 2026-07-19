<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import DeviceIcon from "$lib/cubicdbKit/DeviceIcon.svelte";
  import type { IDevice } from "$lib/interfaces/devices.types";
  import { localLang } from "$lib/stores/language.service";
  import { GANInput, reconnect } from "$lib/timer/adaptors/GAN";
  import { QiYiSmartTimerInput } from "$lib/timer/adaptors/QY-Timer";
  import Select from "@components/material/Select.svelte";
  import Modal from "@components/Modal.svelte";
  import { PlusIcon, Rotate3DIcon } from "lucide-svelte";
  import GanPairing from "./components/GANPairing.svelte";
  import BatteryIndicator from "@components/BatteryIndicator.svelte";
  import type { Device } from "$lib/timer/adaptors/devices";
  import { devices } from "@stores/devices.store";
  import { twMerge } from "tailwind-merge";

  let showModal = $state(false);
  const availableDevices: IDevice["type"][] = [
    "gan_icarry",
    // "network_timer",
    // "qiyi_smart_timer",
    "usb_timer",
  ];
  const deviceList = [new GANInput(), new QiYiSmartTimerInput()];
  let selectedDevice: IDevice["type"] = $state(availableDevices[0]);
  let deviceIndex: number = $state(-1);
  let showModalDevice = $derived(deviceIndex > -1);
  let device: Device | null = $state(null);

  $effect(() => {
    device = deviceIndex < 0 ? null : $devices[deviceIndex];
  });
</script>

{#snippet defaultDevice(device: IDevice)}
  <span class="font-bold text-lg h-min">{device.name}</span>
{/snippet}

<div class="shaded-card h-full">
  <h1 class="text-center text-2xl">{$localLang.HOME.devices}</h1>

  <Button class="mx-auto my-2" onclick={() => (showModal = true)}>
    <PlusIcon />
    {$localLang.global.add}
  </Button>

  <ul
    class="content overflow-y-auto overflow-x-clip grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]
      grid-rows-[repeat(auto-fit,6.2rem)] gap-2 p-2"
  >
    {#each $devices as device, pos (device.id)}
      <li>
        <button
          onclick={() => (deviceIndex = pos)}
          class={twMerge(
            "h-[6rem] btn w-full shaded-card hover:bg-base-100 gap-2 grid grid-cols-[30%,70%]",
            device.enabled ? "" : "!bg-gray-950 text-gray-500"
          )}
        >
          <div class="w-10 m-auto">
            <DeviceIcon device={$devices[pos]} size="100%" />
          </div>
          <div class="relative session-content flex flex-col justify-center gap-1 text-left h-full">
            {#if device.type === "gan_icarry"}
              <span class="font-bold text-lg h-min">{device.name}</span>
              <span class="font-normal text-xs h-min bg-base-300 w-fit p-1 text-secondary">
                {device.macAddress}
              </span>
              {#if device.hasGyroscope}
                <Rotate3DIcon
                  class="absolute top-0 left-0 -translate-x-[100%] translate-y-[40%] scale-50 stroke-accent"
                />
              {/if}
            {:else}
              {@render defaultDevice(device)}
            {/if}
          </div>
        </button>
      </li>
    {/each}
  </ul>
</div>

<Modal bind:show={showModal} class="gap-2">
  <h2 class="text-center text-xl mb-2">{$localLang.global.add}</h2>

  <div class="grid gap-2">
    <Select
      bind:value={selectedDevice}
      items={availableDevices}
      label={(_, p) => deviceList[p].name}
      transform={e => e}
      IconComponent={DeviceIcon}
      iconKey="type"
      iconSize="1.2rem"
      hasIcon={e => e}
    />

    {#if selectedDevice === "gan_icarry"}
      <GanPairing onselected={() => (showModal = false)} />
    {/if}
  </div>
</Modal>

<Modal bind:show={showModalDevice} class="gap-2" onclose={() => (deviceIndex = -1)}>
  <h2 class="text-center text-xl mb-2">{$devices[deviceIndex].name}</h2>
  {#if device instanceof GANInput}
    <div class="overflow-x-auto border border-base-100 rounded-md shadow-md bg-base-100">
      <table class="table table-zebra">
        <tbody>
          <tr><td>Device Name</td><td>{device.deviceName}</td></tr>
          <tr><td>MAC Address</td><td>{device.macAddress}</td></tr>
          <tr>
            <td>Battery</td>
            <td><BatteryIndicator percent={device.batteryLevel} showPercent /></td>
          </tr>
          <tr><td>Hardware Version</td><td>{device.hardwareVersion}</td></tr>
          <tr><td>Software Version</td><td>{device.softwareVersion}</td></tr>
          <tr><td>Giroscope</td><td>{device.hasGyroscope ? "✅" : "❌"}</td></tr>
          {#if device.isConnected}
            <tr>
              <td> Enabled</td>
              <td>
                <div class="border border-primary rounded-md w-fit h-[2.1rem] scale-75">
                  <input
                    type="checkbox"
                    bind:checked={$devices[deviceIndex].enabled}
                    class="toggle toggle-primary"
                  />
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-center mx-auto gap-2 mt-4">
      <Button type="danger" onclick={() => {}}>
        {$localLang.global.delete}
      </Button>
      {#if !device.isConnected}
        <Button
          onclick={() =>
            reconnect(device as GANInput, (device as GANInput).macAddress)
              .then(() => {
                console.log("CONECTADO");
              })
              .catch(() => alert("Error al conectar"))}
        >
          {$localLang.TIMER.connect}
        </Button>
      {/if}
    </div>
  {/if}
</Modal>
