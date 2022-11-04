<script lang="ts">
  import { Link } from "svelte-routing";

  let cards = [
    {
      title: "Tutorials",
      route: "/tutorials",
      ready: false,
      timer: false,
      cube: '/public/assets/logo.png',
      // puzzle: Puzzle.fromSequence("z2", { type: 'rubik', mode: CubeMode.NORMAL, order: [3] }, true)
    }, {
      title: "Algorithms",
      route: "/algorithms",
      timer: false,
      ready: false,
      cube: '/public/assets/logo.png',
      // puzzle: Puzzle.fromSequence("F R' F' R U R U' R' z2", { type: 'rubik', mode: CubeMode.ZBLL, order: [3] }, true)
    }, {
      title: "Timer",
      route: "/timer",
      timer: true,
      ready: false,
      cube: '/public/assets/logo.png',
      // puzzle: Puzzle.fromSequence("z2", { type: 'rubik', mode: CubeMode.NORMAL, order: [3] }, true)
    }, {
      title: "Puzzle simulator",
      route: "/simulator",
      timer: true,
      ready: false,
      cube: '/public/assets/logo.png',
      // puzzle: Puzzle.fromSequence(pochscramble(10, 7), { type: 'megaminx', mode: CubeMode.NORMAL, order: [3] }, true)
    }, {
      title: "Settings",
      route: "/settings",
      timer: false,
      ready: false,
      cube: '/public/assets/logo.png',
      // puzzle: Puzzle.fromSequence("z2", { type: 'rubik', mode: CubeMode.GRAY, order: [2] }, true)
    }, {
      title: "PLL Recognition",
      route: "/pll-trainer",
      timer: true,
      ready: false,
      cube: '/public/assets/logo.png',
      // puzzle: Puzzle.fromSequence("M2 U M2 U2 M2 U M2 z2", { type: 'rubik', mode: CubeMode.PLL, order: [3] }, true)
    }, {
      title: 'Import / Export',
      route: '/import_export',
      cube: '/public/assets/logo.png',
      ready: true,
      timer: false,
    }
  ];
</script>

<main>
  <ul class="
    w-full p-5 grid gap-4 place-items-center
  ">
    {#each cards as card }  
      <Link to={ card.route }>
        <li class="w-40 h-48 text-center shadow-md rounded-md select-none cursor-pointer transition-all duration-200 flex flex-col items-center justify-between py-3 bg-white bg-opacity-30

        hover:rotate-3 hover:shadow-lg
        ">
          <img class="
            w-32 h-32
          " src={card.cube} alt={card.title}>
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