<script lang="ts">
  /// Svelte Stuff
  import { Route, Router } from 'svelte-routing';
  import { AlgorithmSequence } from '@classes/AlgorithmSequence';

  /// Components
  import Frame from '@components/Frame.svelte';
  import Navbar from '@components/Navbar.svelte';
  import Home from '@components/Home.svelte';
  import Tutorials from '@components/Tutorials.svelte';
  import Timer from '@components/timer/Timer.svelte';
  import PllRecognition from '@components/PllRecognition.svelte';
  import Algorithms from '@components/Algorithms.svelte';
  import Simulator from '@components/Simulator.svelte';
  import TutorialParser from '@components/TutorialParser.svelte';
  import ImportExport from '@components/import-export/ImportExport.svelte';
  import Battle from '@components/battle/Battle.svelte';
  import Notification from '@components/Notification.svelte';
  import Settings from '@components/Settings.svelte';
  import { NotificationService } from '@stores/notification.service';
  import type { INotification } from '@interfaces';
  import type { Unsubscriber } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { globalLang } from '@stores/language.service';
  import AlgorithmsAdmin from '@components/AlgorithmsAdmin.svelte';
  import CubeDb from '@components/CubeDB.svelte';
  import Tools from '@components/Tools.svelte';

  // Premium Stuff
  import Contest from '@pcomponents/Contest.svelte';
  import Particles from '@pcomponents/Particles.svelte';

  let notService = NotificationService.getInstance();
  let notifications: INotification[] = [];
  let nSub: Unsubscriber;

  function handlePopState(ev: any) {
    console.log("POP_STATE: ", ev);
  }

  function handleHashChange(ev: any) {
    console.log("HASH_CHANGE: ", ev);
  }

  onMount(() => {
    nSub = notService.notificationSub.subscribe((v) => {
      notifications = v;
    });

    let lang = localStorage.getItem('language') || 'en-EN';
    localStorage.setItem('language', lang);
    
    globalLang.update(() => lang);

    // @ts-ignore
    window.algSequence = new AlgorithmSequence("L' U L2 U2 B2 D B2 U L2 U B2 R2 U2 F U F2 U L2 F U L'");
  });

  onDestroy(() => {
    nSub();
  });
</script>

<svelte:window on:popstate={ handlePopState } on:hashchange={ handleHashChange }/>

<Router>
  <!-- <Particles /> -->

  <Frame />
  <Navbar />

  <main class="pt-24 absolute w-full h-full overflow-x-hidden">
    <Route path="/" component={ Home }/>
    <Route path="/tutorials" component={ Tutorials }/>
    <Route path="/tutorials/:something" component={ Tutorials }/>
    <Route path="/tutorials/:puzzle/:tutorial" component={ TutorialParser }/>
    <Route path="/algorithms/*" component={ Algorithms }/>
    <Route path="/algorithms-admin" component={ AlgorithmsAdmin }/>
    <Route path="/timer" component={ Timer }/>
    <Route path="/battle" component={ Battle }/>
    <Route path="/pll-trainer" component={ PllRecognition }/>
    <Route path="/simulator" component={ Simulator }/>
    <Route path="/contest" component={ Contest }/>
    <Route path="/import-export" component={ ImportExport }/>
    <Route path="/settings" component={ Settings }/>
    <Route path="/cubedb" component={ CubeDb }/>
    <Route path="/tools" component={ Tools }/>
  </main>

  <!-- Notifications -->
  <section class="notification-container fixed top-0 right-0 h-full pr-2
    flex flex-col gap-4 justify-center text-gray-400 pointer-events-none">
    {#each notifications as nt (nt.key)}
      <Notification {...nt} fixed={ nt.fixed }/>
    {/each}
  </section>
</Router>

<style>
  .notification-container {
    width: max-content;
    max-width: 25rem;
  }
</style>