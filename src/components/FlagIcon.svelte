<script lang="ts">
  import { Es, Us } from 'svelte-flag-icons';

  export let icon: string = 'EN';
  export let role: string = 'img';
  export let size: string = '24';
  export let ariaLabel: string = '';
</script>

{#if icon === 'EN'}
  <Us {role} {size} {ariaLabel} class="pointer-events-none" />
{:else if icon === 'ES'}
  <Es {role} {size} {ariaLabel} class="pointer-events-none" />
{/if}