<script lang="ts">
  import type { Language } from '@interfaces';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { getContext } from 'svelte';
  import { Link, navigate } from 'svelte-routing';
  import { ROUTER } from 'svelte-routing/src/contexts';
  import { derived, type Readable } from 'svelte/store';

  const { activeRoute } = getContext(ROUTER) as any;
  let parts: any[] = [];

  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  function updateParts(ar: any) {
    parts.length = 0;

    if ( !ar ) {
      navigate("/");
      return;
    }

    let arr = (ar.route._path as string).split('?')[0].split('/').map((s: string) => {
      if ( s === '*' ) return s.replace("*", ar.params['*'] || "");
      if ( s[0] === ':' ) return ar.params[ s.slice(1) ];
      return s;
    })
      .join('/').split('/')
      .filter(s => s)
      .map(s => $localLang.NAVBAR.routeMap(s));

    parts = [
      ...arr.map((e: string, p: number) => ({
        link: "/" + arr.slice(0, p + 1).join('/'),
        name: e
      })),
    ];
  }

  $: $localLang, updateParts( $activeRoute );
</script>

<nav class="w-full px-5 inline-flex mt-10 select-none fixed z-10">
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-white bg-opacity-10 text-gray-400"
  to="/"> { $localLang.NAVBAR.home } </Link>

  {#each parts as part}
  <Link class="mr-1 rounded-sm shadow-md uppercase p-2 bg-white bg-opacity-10 text-gray-400"
  to="{part.link}"> {part.name} </Link>
  {/each}
</nav>