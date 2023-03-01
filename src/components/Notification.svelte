<script lang="ts">
  import Button from '@material/Button.svelte';
  import { onMount } from 'svelte';
  import type { NotificationAction } from '@interfaces';
  import SettingsIcon from '@icons/Settings.svelte';
  import CloseIcon from '@icons/Close.svelte';
  import { NotificationService } from '@stores/notification.service';
  
  export let key: string;
  export let timeout = 5000;
  export let header = 'Header';
  export let text = 'Text';
  export let fixed = false;
  export let actions: NotificationAction[] = [];
  
  let closed = false;
  let tm: NodeJS.Timer;
  let notService = NotificationService.getInstance();

  function close () {
    if ( closed ) return;

    closed = true;
    !fixed && clearTimeout(tm);

    setTimeout(() => notService.removeNotification(key), 300);
  }

  onMount(() => {
    // Avoid notifications that can't close and have no actions
    if ( actions.length === 0 ) {
      fixed = false;
    }

    if ( !fixed ) {
      tm = setTimeout(close, timeout);
    }
  });
</script>

<div
  class="notification relative rounded-md shadow-md p-2 grid bg-gray-800 text-gray-300 right-0
    transition-all duration-300 pointer-events-auto
  "
  class:closed={ closed }>
  <div id="icon">
    <slot name="icon"> <SettingsIcon size="1.2rem"/> </slot>
  </div>
  
  {#if !fixed}
    <button class="w-max absolute top-2 right-2" on:click={ close }> <CloseIcon size="1.2rem"/> </button>
  {/if}

  <div id="content">
    <div id="header">{ header }</div>
    <div id="text">{ text }</div>
    <div id="actions">
      {#each actions || [] as action}
        <Button flat on:click={ (e) => { action.callback(e); close(); }}>{ action.text }</Button>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .notification {
    grid-template-columns: 3rem 1fr;
  }

  .notification.closed {
    @apply opacity-100 -right-72;
  }

  #icon {
    @apply flex items-center justify-center;
  }

  #header {
    @apply font-bold text-lg;
  }

  #actions {
    @apply flex gap-2;
  }
</style>