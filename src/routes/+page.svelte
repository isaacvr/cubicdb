<script lang="ts">
  import { localLang } from "@stores/language.service";
  import { screen } from "@stores/screen.store";
  import { CubicDBICON } from "@constants";
</script>

<main class="container-mini relative">
  <ul class="w-full grid place-items-center" class:isMobile={$screen.isMobile}>
    <!-- Tutorials -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/tutorials">
        <img class="mx-auto" src="/assets/tutorials.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.tutorials}</h2>
      </a>
    </li>

    <!-- Algorithms -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/algorithms">
        <img class="mx-auto" src="/assets/algorithms.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.algorithms}</h2>
      </a>
    </li>

    <!-- Timer -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/timer">
        <img class="mx-auto" src="/assets/timer.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.timer}</h2>
      </a>
    </li>

    <!-- Reconstructions -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/reconstructions">
        <img class="mx-auto" src="/assets/reconstructions.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.reconstructions}</h2>
      </a>
    </li>

    <!-- Battle -->
    <!-- <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/battle">
        <img class="mx-auto" src="/assets/battle.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.battle}</h2>
      </a>
    </li> -->

    <!-- PLL Recognition -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/pll-trainer">
        <img class="mx-auto" src="/assets/pll.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.pll_recognition}</h2>
      </a>
    </li>

    <!-- Simulator -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/simulator">
        <img class="mx-auto" src="/assets/megaminx.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.simulator}</h2>
      </a>
    </li>

    <!-- Contest -->
    <!-- <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/contest">
        <img class="mx-auto" src={CubicDBICON} alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.contest}</h2>
      </a>
    </li> -->

    <!-- Tools -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/tools">
        <img class="mx-auto" src="/assets/tools.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.tools}</h2>
      </a>
    </li>

    <!-- Import / Export -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/import-export">
        <img class="mx-auto" src="/assets/import-export.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.importExport}</h2>
      </a>
    </li>

    <!-- Settings -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/settings">
        <img class="mx-auto" src="/assets/settings.png" alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.settings}</h2>
      </a>
    </li>

    <!-- About -->
    <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/about-cubicdb">
        <img class="mx-auto" src={CubicDBICON} alt="" />
        <h2 class="text-sm text-center">{$localLang.HOME.about}</h2>
      </a>
    </li>

    <!-- Remote -->
    <!-- <li>
      <a class="flex flex-col items-center justify-between w-full h-full" href="/remote">
        <img class="mx-auto" src={CubicDBICON} alt="" />
        <h2 class="text-sm text-center">Remote</h2>
      </a>
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
      hover:shadow-2xl relative;

    background-color: var(--th-backgroundLevel1);
    color: var(--th-text);
  }

  ul li:hover {
    background-color: var(--th-backgroundLevel2);
    box-shadow: 0 1rem 3rem -1rem var(--th-primary);
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
