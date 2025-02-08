<script lang="ts">
  import type { Device } from "$lib/interfaces/devices.types";
  import {
    BluetoothIcon,
    CableIcon,
    KeyboardIcon,
    RectangleEllipsisIcon,
    UsbIcon,
    WifiIcon,
  } from "lucide-svelte";

  interface DeviceIconProps {
    type: Device["type"];
    size?: string;
  }

  let { type = $bindable(), size = $bindable("1.2rem") }: DeviceIconProps = $props();

  function getDeviceIcon(type: Device["type"]) {
    switch (type) {
      case "gan_icarry": {
        return BluetoothIcon;
      }
      case "manual_entry": {
        return RectangleEllipsisIcon;
      }
      case "network_timer": {
        return WifiIcon;
      }
      case "qiyi_smart_timer": {
        return BluetoothIcon;
      }
      case "stackmat": {
        return CableIcon;
      }
      case "usb_timer": {
        return UsbIcon;
      }
      case "virtual_cube_keyboard": {
        return UsbIcon;
      }
    }

    return KeyboardIcon;
  }

  let Icon = $derived(getDeviceIcon(type));
</script>

<Icon {size} />
