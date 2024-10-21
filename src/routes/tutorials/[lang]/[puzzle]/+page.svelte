<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    goto("/tutorials", { replaceState: true });
  });
</script>
