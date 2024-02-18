<script lang="ts">
  export let component: any;
	export let params = {};
</script>

{#await component.then ? component : component() then resolvedComponent}
  <svelte:component this={resolvedComponent.default} {params} />
{/await}