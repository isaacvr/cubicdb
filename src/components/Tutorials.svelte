<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Tutorial } from '../interfaces';
  import { Link } from 'svelte-routing';
  import { DataService } from '../stores/data.service';
  import { currentPath } from '../stores/path';
  import Plus from 'svelte-material-icons/Plus.svelte';
  import Button from './material/Button.svelte';

  let dataService = DataService.getInstance();

  let tutorials = {};
  let keys = [];

  let tutSub = dataService.tutSub.subscribe((t) => {
    if ( !t ) return;
    
    console.log("TUTORIALS: ", t);

    switch(t[0]) {
      case 'get-tutorials': {
        let tut = <Tutorial[]> t[1];

        tutorials = tut.reduce((acc, e) => {
          !acc[e.puzzle] && (acc[e.puzzle] = []);
          acc[e.puzzle].push(e);
          return acc;
        }, {});

        keys = Object.keys(tutorials);

        keys.forEach(k => tutorials[k].sort((a, b) => a.level < b.level ? -1 : 1))
        break;
      }

      case 'update-tutorial': {
        let tut = <Tutorial> t[1];
        let pos = tutorials[tut.puzzle].reduce((r, e, p) => e._id === tut._id ? p : r, -1);
        tutorials[tut.puzzle][pos] = tut;
        break;
      }
    }
  });

  onMount(() => {
    dataService.getTutorials();
  });

  onDestroy(() => {
    tutSub();
  });

</script>

<section class="container-mini">
  <Button><Plus />Add Tutorial</Button>
</section>

{#each keys as k}
  <section class="container-mini grid grid-cols-1">
    <h2 class="text-gray-400 font-bold">{k}</h2>
    <div class="flex">
      {#each tutorials[k] as t}
        <Link to="{ $currentPath + '/' + t.puzzle + '/' + t.titleLower + '?id=' + t._id }"
          class="m-1.5 text-gray-400 p-2.5 shadow-md bg-purple-900"
        >{t.title}
        </Link>
      {/each}
    </div>
  </section>
{/each}

<style>
  h2 {
    font-size: 1.2rem;
  }
</style>