<script lang="ts">
  export let title = "Title";
  export let label = "Label";
  export let bgColor = "bg-gray-600";
  export let pColor = "bg-blue-400";
  export let value = 0;
  export let total = 0;

  let perc = 0;
  $: perc = total === 0 ? 0 : value * 100 / total;
</script>

<div class="grid w-full gap-2">
  <div class="flex justify-between">
    <span class="text-left">{ title }</span> <span class="ml-auto flex">{ label }</span>
  </div>
  <div class="meter w-full h-3 { bgColor || "" } rounded-full transition-all duration-200">
    <div
      class="h-full progress { pColor || "" } rounded-full shadow-md transition-all duration-200"
      style="width: { perc }%;"></div>
  </div>
</div>