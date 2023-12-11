<script lang="ts">
  import type { Language } from '@interfaces';
  import { globalLang } from '@stores/language.service';
  import { getLanguage } from '@lang/index';
  import { Link, navigate } from 'svelte-routing';
  import { useLocation } from 'svelte-routing';
  import { derived, type Readable } from 'svelte/store';
  import type { RouteLocation } from 'svelte-routing/types/Route';
  import MenuIcon from '@icons/Menu.svelte';
  import { DataService } from '@stores/data.service';

  const loc = useLocation();
  const cl = `rounded-sm shadow-md uppercase p-1 bg-backgroundLv2 hover:bg-purple-700 hover:text-gray-300
    transition-all duration-200  
  `;
  
  let parts: any[] = [];
  let expanded = false;
  let isMobile = DataService.getInstance().isMobile;
  
  let localLang: Readable<Language> = derived(globalLang, ($lang) => getLanguage( $lang ));

  $: expanded = $isMobile && expanded;

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

{#if parts.length }
  <nav class="w-max ml-28 max-sm:ml-14 select-none text-gray-400 fixed z-[2000]">
    <button class="md:hidden" on:click={ () => expanded = !expanded }> <MenuIcon size="2rem"/> </button>

    <!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
    <div on:click={ () => expanded = false } class:expanded class:isMobile={ $isMobile } class="backdrop max-md:bg-black
      max-md:bg-opacity-90 grid place-items-center max-md:fixed inset-0 md:visible">
      <div class="flex items-center justify-center gap-1 max-sm:flex-col">
        <Link class={cl}
        to="/" on:click={() => expanded = false }> { $localLang.NAVBAR.home } </Link>
      
        {#each parts as part}
          <div class="max-md:hidden">/</div>
          <div class="md:hidden text-yellow-400 text-xs">☼</div>
          <Link class={cl} on:click={() => expanded = false }
          to="{part.link}"> {part.name} </Link>
        {/each}
      </div>
    </div>
  </nav>
{/if}

<style>
  .backdrop.isMobile:not(.expanded) {
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
  }
</style>