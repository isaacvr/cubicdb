<script lang="ts">
  import { Link } from "svelte-routing";
  import { localLang } from "@stores/language.service";
  import { screen } from "@stores/screen.store";
</script>

<main class="container-mini relative">
  <ul class="w-full grid place-items-center" class:isMobile={$screen.isMobile}>
    <!-- Tutorials -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/tutorials">
        <img class="mx-auto" src="/assets/tutorials.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.tutorials}</h2>
      </Link>
    </li>

    <!-- Algorithms -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/algorithms">
        <img class="mx-auto" src="/assets/algorithms.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.algorithms}</h2>
      </Link>
    </li>

    <!-- Timer -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/timer">
        <img class="mx-auto" src="/assets/timer.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.timer}</h2>
      </Link>
    </li>

    <!-- Reconstructions -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/reconstructions">
        <img class="mx-auto" src="/assets/reconstructions.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.reconstructions}</h2>
      </Link>
    </li>

    <!-- Battle -->
    <!-- <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/battle">
        <img class="mx-auto" src="/assets/battle.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.battle}</h2>
      </Link>
    </li> -->

    <!-- PLL Recognition -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/pll-trainer">
        <img class="mx-auto" src="/assets/pll.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.pll_recognition}</h2>
      </Link>
    </li>

    <!-- Simulator -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/simulator">
        <img class="mx-auto" src="/assets/megaminx.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.simulator}</h2>
      </Link>
    </li>

    <!-- Contest -->
    <!-- <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/contest">
        <img class="mx-auto" src="/assets/logo_dark.svg" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.contest}</h2>
      </Link>
    </li> -->

    <!-- Tools -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/tools">
        <img class="mx-auto" src="/assets/tools.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.tools}</h2>
      </Link>
    </li>

    <!-- Import / Export -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/import-export">
        <img class="mx-auto" src="/assets/import-export.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.importExport}</h2>
      </Link>
    </li>

    <!-- Settings -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/settings">
        <img class="mx-auto" src="/assets/settings.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.settings}</h2>
      </Link>
    </li>

    <!-- About -->
    <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/cubicdb">
        <img class="mx-auto" src="/assets/logo_dark.svg" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.about}</h2>
      </Link>
    </li>

    <!-- Remote -->
    <!-- <li>
      <Link class="flex flex-col items-center justify-between w-full h-full" to="/remote">
        <img class="mx-auto" src="/assets/logo_dark.svg" alt="" />
        <h2 class="text-sm text-center">Remote</h2>
      </Link>
    </li> -->
  </ul>
</main>

<style lang="postcss">
  ul {
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    row-gap: 2rem;
    padding-bottom: 1rem;
  }

  ul.isMobile {
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    row-gap: 1rem;
  }

  ul li {
    @apply w-40 h-48 max-w-[12rem] shadow-md rounded-md select-none cursor-pointer
      transition-all duration-200 grid place-items-center justify-center py-3 px-2
      bg-backgroundLv1 hover:shadow-2xl hover:bg-backgroundLv2 hover:shadow-primary-900 relative;
  }

  ul img {
    @apply w-32 h-32 object-contain;
  }

  ul.isMobile li {
    @apply w-36 h-44;
  }

  ul.isMobile img {
    @apply w-32 h-32;
  }
</style>
