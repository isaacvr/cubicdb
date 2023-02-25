<script lang="ts">
  import { Link } from "svelte-routing";
  import { generateCubeBundle } from "@helpers/cube-draw";
  import type { Card } from "@interfaces";
  import { Puzzle } from "@classes/puzzle/puzzle";
    import { CubeMode } from "@constants";

  let cards: Card[] = [
    {
      title: "Tutorials",
      route: "/tutorials",
      ready: false,
      timer: false,
      cube: '/assets/cube.png',
    }, {
      title: "Algorithms",
      route: "/algorithms",
      timer: false,
      ready: false,
      cube: '/assets/pll.png',
    }, {
      title: "Timer",
      route: "/timer",
      timer: true,
      ready: false,
      cube: '/assets/cube.png',
    }, /*{
      title: "Battle",
      route: "/battle",
      ready: true,
      cube: '/assets/cube.png',
    },*/ {
      title: "PLL Recognition",
      route: "/pll-trainer",
      timer: true,
      ready: false,
      cube: '/assets/pll.png',
    }, {
      title: "Puzzle simulator",
      route: "/simulator",
      timer: true,
      ready: false,
      cube: '/assets/megaminx.png',
    }, {
      title: "Settings",
      route: "/settings",
      timer: false,
      ready: false,
      cube: '/assets/logo.png',
      puzzle: new Puzzle({ type: 'rubik', mode: CubeMode.GRAY, order: [2] })
    }, {
      title: 'Import / Export',
      route: '/import-export',
      cube: '/assets/logo.png',
      ready: true,
      timer: false,
    }, {
      title: 'Contest',
      route: '/contest',
      cube: '/assets/logo.png',
      ready: true,
      puzzle: new Puzzle({ type: 'redi' })
    }
  ];

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
  })
</script>

<main class="container-mini">
  <ul class="w-full grid gap-4 place-items-center">
    {#each cards as card }
      <Link to={ card.route }>
        <li class="w-40 h-48 text-center shadow-md rounded-md select-none cursor-pointer
        transition-all duration-200 flex flex-col items-center justify-between py-3
        bg-white bg-opacity-10 text-gray-400

        hover:rotate-3 hover:shadow-lg">
          <img class="w-32 h-32" src={card.puzzle ? card.puzzle.img : card.cube} alt={card.title}>
          <h2>{card.title}</h2>
        </li>
      </Link>
    {/each}
  </ul>
</main>

<style lang="postcss">
  ul:not(.no-grid) {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    row-gap: 2rem;
  }
</style>