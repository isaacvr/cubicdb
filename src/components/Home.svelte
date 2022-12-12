<script lang="ts">
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { Link } from "svelte-routing";
  import { CubeMode } from "@constants";
  import { generateCubeBundle } from "@helpers/cube-draw";

  let cards = [
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
      puzzle: Puzzle.fromSequence("z2", { type: 'rubik', mode: CubeMode.GRAY, order: [2] }, true)
    }, {
      title: "PLL Recognition",
      route: "/pll-trainer",
      timer: true,
      ready: false,
      cube: '/assets/pll.png',
    }, {
      title: 'Import / Export',
      route: '/import_export',
      cube: '/assets/logo.png',
      ready: true,
      timer: false,
    }
  ];

  let cubes = cards.reduce((ac, e) => {
    if ( e.puzzle ) {
      ac.push(e.puzzle);
    }
    return ac;
  }, []);

  let subsc = generateCubeBundle(cubes, null, false, true).subscribe((c) => {
    console.log("c: ", c);
    if ( c === '__complete__' ) {
      subsc();
      
      for (let i = 0, maxi = cards.length; i < maxi; i += 1) {
        cards[i].ready = true;
        if ( cards[i].puzzle ) {
          cards[i].cube = (<any> cards[i].puzzle).img;
        }
      }
    }
  });
</script>

<main class="container-mini">
  <ul class="w-full grid gap-4 place-items-center">
    {#each cards as card }
      <Link to={ card.route }>
        <li class="w-40 h-48 text-center shadow-md rounded-md select-none cursor-pointer
        transition-all duration-200 flex flex-col items-center justify-between py-3
        bg-white bg-opacity-10 text-gray-400

        hover:rotate-3 hover:shadow-lg">
          <img class="w-32 h-32" src={card.cube} alt={card.title}>
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