<script context="module">
  export async function load({ error, status }: any) {
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
</script>

<h1>{$page.status}</h1>
<h2>{JSON.stringify($page.error, null, 2)}</h2>
