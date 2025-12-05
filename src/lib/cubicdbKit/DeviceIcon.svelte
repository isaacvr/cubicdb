<script lang="ts">
  import type { IDevice } from "$lib/interfaces/devices.types";
  import type { Device } from "$lib/timer/adaptors/devices";
  import {
    BluetoothIcon,
    BluetoothOffIcon,
    CableIcon,
    KeyboardIcon,
    RectangleEllipsisIcon,
    UnplugIcon,
    UsbIcon,
    WholeWordIcon,
    WifiIcon,
  } from "lucide-svelte";

  interface DeviceIconProps {
    device: Device;
    size?: string;
  }

  let { device = $bindable(), size = $bindable("1.2rem") }: DeviceIconProps = $props();

  function getDeviceIcon(device: Device) {
    if (!device || !device.type) {
      console.log("DEVICE: ", device);
      return UnplugIcon;
    }

    switch (device.type) {
      case "gan_icarry": {
        return device.isConnected ? BluetoothIcon : BluetoothOffIcon;
      }
      case "manual_entry": {
        return RectangleEllipsisIcon;
      }
      // case "network_timer": {
      //   return WifiIcon;
      // }
      case "qiyi_smart_timer": {
        return BluetoothIcon;
      }
      case "stackmat": {
        return CableIcon;
      }
      // case "usb_timer": {
      //   return UsbIcon;
      // }
      case "virtual_cube_keyboard": {
        return WholeWordIcon;
      }
    }

    return KeyboardIcon;
  }

  let Icon = $derived(getDeviceIcon(device));
</script>

<Icon {size} />
