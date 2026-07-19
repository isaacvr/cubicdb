<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { dataService } from "$lib/data-services/data.service";
  import { localLang } from "$lib/stores/language.service";
  import { GANInput } from "$lib/timer/adaptors/GAN";
  import { copyToClipboard } from "@helpers/strings";
  import type { BluetoothDeviceData } from "@interfaces";
  import { devices } from "@stores/devices.store";
  import { PlusIcon } from "lucide-svelte";
  import { getContext, onDestroy, onMount } from "svelte";

  interface GANPairingProps {
    onselected?: Function;
  }

  let { onselected }: GANPairingProps = $props();

  let searching = $state(false);
  let connecting = $state(false);
  let error = $state(false);
  let errorStr = $state("");
  let doneConnecting = $state(false);
  let input = new GANInput();
  let deviceList: BluetoothDeviceData[] = $state([
    // { deviceName: "Device 1", deviceId: "joiajsio1", connected: false },
    // { deviceName: "Device 2", deviceId: "joiajsio2", connected: false },
    // { deviceName: "Device 3", deviceId: "joiajsio3", connected: false },
    // { deviceName: "Device 4", deviceId: "joiajsio4", connected: false },
  ]);
  let selectedDevice: BluetoothDeviceData | null = $state(null);
  // let selectedDevice: BluetoothDeviceData | null = $state({
  //   connected: true,
  //   deviceId: "AB:12:34:5E:E9:87",
  //   deviceName: "GANic69H",
  // });

  function search() {
    searching = true;
    connecting = false;
    error = false;

    $dataService.config.cancelBluetoothRequest();

    let searchTime = performance.now();

    $dataService.config
      .searchBluetooth(input)
      .then(() => {})
      .catch(err => {
        console.dir(err);

        let diff = performance.now() - searchTime;

        if (diff < 20 && err.name === "NotFoundError") {
          error = true;
          errorStr = $localLang.DEVICES.errors.bluetoothDisabled;
        }
      })
      .finally(() => {
        searching = false;
      });
  }

  function handleBluetoothEvent(...args: any[]) {
    if (args[0] === "device-list") {
      deviceList = args[1];
    }
  }

  onMount(() => {
    $dataService.on("bluetooth", handleBluetoothEvent);
    $dataService.config.cancelBluetoothRequest();
  });

  onDestroy(() => {
    $dataService.off("bluetooth", handleBluetoothEvent);
  });
</script>

<div class="flex gap-2 justify-center w-fit mx-auto">
  <Button
    class="grow"
    type="warning"
    bind:loading={searching}
    onclick={search}
    disabled={searching}
  >
    {$localLang.global.search}
  </Button>
  {#if searching}
    <Button
      class="grow"
      type="secondary"
      onclick={() => $dataService.config.cancelBluetoothRequest()}
    >
      {$localLang.global.cancel}
    </Button>
  {/if}
</div>

{#if error}
  <span class="text-yellow-300">
    {errorStr}
  </span>
{/if}

{#if deviceList.length > 0 && !doneConnecting}
  <div class="shaded-card">
    <h3 class="text-center text-lg">{$localLang.HOME.devices}</h3>
    <ul class="grid gap-1">
      {#each deviceList as device (device.deviceId)}
        <li
          class="flex gap-4 items-center justify-between border border-base-100 rounded-md text-xs pl-2"
        >
          {device.deviceName}
          <Button
            class="py-1"
            onclick={() => {
              searching = false;
              connecting = true;
              error = false;

              $dataService.config
                .connectBluetoothDevice(device.deviceId)
                .then(() => {
                  doneConnecting = true;
                  selectedDevice = device;
                })
                .catch(err => {
                  console.dir(err);
                })
                .finally(() => {
                  connecting = false;
                });
            }}>{device.connected ? $localLang.TIMER.disconnect : $localLang.TIMER.connect}</Button
          >
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if doneConnecting && selectedDevice}
  <div class="shaded-card grid gap-2">
    <h3 class="text-center text-lg">{selectedDevice.deviceName}</h3>
    <div class="text-center">
      MAC:
      <button
        class="text-success bg-base-300 p-1 rounded-md"
        onclick={() => {
          copyToClipboard(selectedDevice!.deviceId);
        }}>{selectedDevice.deviceId}</button
      >
    </div>
    <input
      bind:value={selectedDevice.deviceName}
      type="text"
      class="input text-sm"
      placeholder={$localLang.global.name}
    />

    <Button
      class="capitalize"
      type="secondary"
      onclick={() => {
        input.name = selectedDevice!.deviceName;
        input.macAddress = selectedDevice!.deviceId;
        $devices = [...$devices, input];
        onselected?.();
        $dataService.config.saveDevices($devices);
      }}
    >
      <PlusIcon size="1.2rem" />
      {$localLang.DEVICES.addDevice}
    </Button>
  </div>
{/if}
