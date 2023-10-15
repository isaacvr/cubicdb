<script lang="ts">
  import type { Language } from '@interfaces';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { Link, navigate } from 'svelte-routing';
  import { useLocation } from 'svelte-routing';
  import { derived, type Readable } from 'svelte/store';
  import type { RouteLocation } from 'svelte-routing/types/Route';

  const loc = useLocation();
  
  let parts: any[] = [];
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  function updateParts(rt: RouteLocation) {
    parts.length = 0;

    if ( !rt ) {
      navigate("/");
      return;
    }

    let arr = rt.pathname.split('/').filter(s => s);

    parts = [
      ...arr.map((e: string, p: number) => ({
        link: "/" + arr.slice(0, p + 1).join('/'),
        name: $localLang.NAVBAR.routeMap(e)
      })),
    ];
  }

  $: $localLang, updateParts( $loc );
</script>

<nav class="w-max px-5 inline-flex mt-10 select-none fixed z-10">
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-backgroundLv1 text-gray-400"
  to="/"> { $localLang.NAVBAR.home } </Link>

  {#each parts as part}
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-backgroundLv1 text-gray-400"
  to="{part.link}"> {part.name} </Link>
  {/each}
</nav>