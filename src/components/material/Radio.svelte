<script lang="ts">
  // export let checked = true;
  export let name = "";
  export let value: any = null;
</script>

<input type="radio" {name} {value} class="wrapper m-0 p-0" />

<style lang="postcss">
  .wrapper {
    @apply flex items-center justify-center h-4 w-4
    shadow-sm rounded-full
    hover:cursor-pointer transition-all duration-100;
  }
</style>
