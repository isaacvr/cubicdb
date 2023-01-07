<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Link } from 'svelte-routing';
  import { globalHistory } from 'svelte-routing/src/history';

  let parts = [];

  function updateParts(v) {
    let arr = v.split('?')[0].split('/').filter(e => e != '');

    parts.length = 0;
    parts = [
      { link: '/', name: 'Home' },
      ...arr.map((e, p) => ({
        link: "/" + arr.slice(0, p + 1).join('/'),
        name: e
      })),
    ];
  }

  let hSub = globalHistory.listen(({ location }) => {
    updateParts(location.pathname || '');
  });

  updateParts(window.location.pathname);

  onDestroy(() => {
    hSub();
  });
</script>

<nav class="w-full px-5 inline-flex mt-10 select-none fixed z-10">
  {#each parts as part}
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-white bg-opacity-10 text-gray-400"
  to="{part.link}"> {part.name} </Link>
  {/each}
</nav>