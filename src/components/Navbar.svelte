<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Link } from 'svelte-routing';
  import { currentPath } from '../stores/path';

  let parts = [
    { link: '/', name: "Home" },
    { link: '/', name: "Home" },
    { link: '/', name: "Home" },
    { link: '/', name: "Home" },
  ];

  let pathSub;

  onMount(() => {
    pathSub = currentPath.subscribe((v) => {
      let arr = v.split('?')[0].split('/').filter(e => e != '');

      parts.length = 0;
      parts = [
        { link: '/', name: 'Home' },
        ...arr.map((e, p) => ({
          link: "/" + arr.slice(0, p + 1).join('/'),
          name: e
        })),
      ];
    });
  });

  onDestroy(() => {
    pathSub();
  });
</script>

<nav class="w-full px-5 inline-flex mt-10 select-none fixed z-10">
  {#each parts as part}
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-white bg-opacity-10 text-gray-400"
  to="{part.link}"> {part.name} </Link>
  {/each}
</nav>