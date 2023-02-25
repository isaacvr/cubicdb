<script lang="ts">
    import type { map } from '@helpers/math';
  import { getContext } from 'svelte';
  import { Link, navigate } from 'svelte-routing';
  import { ROUTER } from 'svelte-routing/src/contexts';

  const { activeRoute } = getContext(ROUTER) as any;
  let parts: any[] = [];

  function updateParts(ar: any) {
    parts.length = 0;
    parts = [
      { link: '/', name: 'Home' }
    ];

    if ( !ar ) {
      navigate("/");
      return;
    }

    let arr = ar.route._path.split('?')[0].split('/').map((s: string) => {
      if ( s === '*' ) return s.replace("*", ar.params['*'] || "");
      if ( s[0] === ':' ) return ar.params[ s.slice(1) ];
      return s;
    }).slice(1);

    parts = [
      ...parts,
      ...arr.map((e: string, p: number) => ({
        link: "/" + arr.slice(0, p + 1).join('/'),
        name: e
      })),
    ];
  }

  $: updateParts($activeRoute);

</script>

<nav class="w-full px-5 inline-flex mt-10 select-none fixed z-10">
  {#each parts as part}
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-white bg-opacity-10 text-gray-400"
  to="{part.link}"> {part.name} </Link>
  {/each}
</nav>