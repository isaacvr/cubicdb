<script lang="ts">
  import { onMount } from "svelte";
  import type { NotificationAction } from "@interfaces";
  import { NotificationService } from "@stores/notification.service";
  import { Avatar } from "$lib/cubicdbKit";
  import { CubicDBICON } from "@constants";
  import { fly } from "svelte/transition";
  import Button from "$lib/cubicdbKit/Button.svelte";

  interface NotificationProps {
    key?: string;
    timeout?: number;
    header?: string;
    text?: string;
    html?: string;
    icon?: any;
    fixed?: boolean;
    actions?: NotificationAction[];
  }

  let {
    key = $bindable(""),
    timeout = $bindable(500),
    header = $bindable("Header"),
    text = $bindable("Text"),
    html = $bindable(""),
    icon = $bindable(CubicDBICON),
    fixed = $bindable(false),
    actions = $bindable([]),
  }: NotificationProps = $props();

  let open = true;
  let tm: any;
  let notService = NotificationService.getInstance();

  function close() {
    if (!open) return;

    !fixed && clearTimeout(tm);
    open = false;

    setTimeout(() => {
      notService.removeNotification(key);
    }, 100);
  }

  onMount(() => {
    // Avoid notifications that can't close and have no actions
    if (actions.length === 0) {
      fixed = false;
    }

    if (!fixed) {
      tm = setTimeout(close, timeout);
    }
  });
</script>

<div out:fly={{ x: 200 }} class="alert bg-base-100">
  {#if icon}
    {#if typeof icon === "string"}
      <Avatar src={icon} class="bg-base-300 tx-text aspect-square" />
    {:else}
      {@const Icon = icon}
      <Icon size="1.2rem" class="bg-base-300 tx-text aspect-square" />
    {/if}
  {/if}

  <div class="ms-3 text-sm font-normal tx-text">
    <span class="text-lg font-semibold tx-text">{header}</span>
    <div class="mt-2 mb-2 text-sm font-normal">{text}</div>
    <div bind:innerHTML={html} contenteditable="false"></div>

    {#if (actions || []).length}
      <div class="flex gap-2 mt-4">
        {#each actions || [] as action}
          <Button
            color={action.color}
            onclick={(e: any) => {
              action.callback(e);
              close();
            }}
          >
            {action.text}
          </Button>
        {/each}
      </div>
    {/if}
  </div>
</div>
