<script lang="ts">
  import { Link } from "svelte-routing";
  import { generateCubeBundle } from "@helpers/cube-draw";
  import { globalLang } from "@stores/language.service";
  import { getLanguage } from "@lang/index";
  import type { Card } from "@interfaces";
  import type { Puzzle } from "@classes/puzzle/puzzle";

  let cards: Card[] = [];

  function updateTexts() {
    const HOME = getLanguage( $globalLang ).HOME;

    const showPrivate = false;

    cards = [
      {
        title: HOME.tutorials,
        route: "/tutorials",
        ready: true,
        timer: false,
        cube: '/assets/tutorials.png',
      }, {
        title: HOME.algorithms,
        route: "/algorithms",
        timer: false,
        ready: true,
        cube: '/assets/algorithms.png',
      }, {
        title: 'Algorithm Handler',
        route: "/algorithms-admin",
        timer: false,
        ready: showPrivate,
        cube: '/assets/algorithms-admin.png',
      }, {
        title: HOME.timer,
        route: "/timer",
        timer: true,
        ready: true,
        cube: '/assets/timer.png',
      }, {
        title: HOME.battle,
        route: "/battle",
        ready: showPrivate,
        cube: '/assets/battle.png',
      }, {
        title: HOME.pll_recognition,
        route: "/pll-trainer",
        timer: true,
        ready: true,
        cube: '/assets/pll.png',
      }, {
        title: HOME.simulator,
        route: "/simulator",
        timer: true,
        ready: true,
        cube: '/assets/megaminx.png',
      }, {
        title: HOME.settings,
        route: "/settings",
        timer: false,
        ready: true,
        cube: '/assets/settings.png'
      }, {
        title: HOME.importExport,
        route: '/import-export',
        cube: '/assets/import-export.png',
        ready: true,
        timer: false,
      }, {
        title: HOME.contest,
        route: '/contest',
        cube: '/assets/logo-500.png',
        ready: showPrivate,
        // puzzle: new Puzzle({ type: 'redi' })
      }, {
        title: 'CubeDB',
        route: '/cubedb',
        cube: '/assets/logo-500.png',
        ready: true,
        timer: false,
      }
    ].filter(c => c.ready);

    let cubes = cards.reduce((ac: Puzzle[], e) => {
      if ( e.puzzle ) {
        ac.push(e.puzzle);
      }
      return ac;
    }, []);
  
    generateCubeBundle(cubes, undefined, false, true).then(gen => {
      let subsc = gen.subscribe((c) => {
        if ( c === null ) {
          subsc();
          cards = cards;
        }
      });
    });
  };

  $: $globalLang, updateTexts();

</script>

<main class="container-mini">
  <ul class="w-full grid gap-4 place-items-center">
    {#each cards as card (card.route)}
      <li class="w-40 h-48 text-center shadow-md rounded-md select-none cursor-pointer
      transition-all duration-200 flex flex-col items-center justify-between py-3
      bg-white bg-opacity-10 text-gray-400

      hover:rotate-3 hover:shadow-lg">
        <Link to={ card.route }>
          <img class="w-32 h-32 mx-auto" src={card.puzzle ? card.puzzle.img : card.cube} alt={ card.title }>
          <h2>{card.title}</h2>
        </Link>
      </li>
    {/each}
  </ul>
</main>

<style lang="postcss">
  ul:not(.no-grid) {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    row-gap: 2rem;
  }
</style>