<script context="module">
  export async function load({ error, status }) {
    return {
      props: {
        error,
        status,
      },
    };
  }
</script>

<script lang="ts">
  import { page } from "$app/stores";

  export let error;
  export let status;
</script>

<h1>{$page.status}</h1>
<h2>{$page.error}</h2>
