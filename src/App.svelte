<script lang="ts">
  /// Svelte Stuff
  import { Route, Router } from 'svelte-routing';

  /// Components
  import Frame from '@components/Frame.svelte';
  import Notification from '@components/Notification.svelte';
  import Lazy from '@components/Lazy.svelte';
  import Home from '@components/Home.svelte';
  // import Tutorials from '@components/Tutorials.svelte';
  // import TutorialParser from '@components/TutorialParser.svelte';
  // import Timer from '@components/timer/Timer.svelte';
  // import PllRecognition from '@components/PllRecognition.svelte';
  // import Simulator from '@components/Simulator.svelte';
  // import ImportExport from '@components/import-export/ImportExport.svelte';
  // import Battle from '@components/battle/Battle.svelte';
  // import Settings from '@components/Settings.svelte';
  // import AlgorithmsAdmin from '@components/AlgorithmsAdmin.svelte';
  // import CubeDb from '@components/CubeDB.svelte';
  // import Tools from '@components/tools/Tools.svelte';
  // import Reconstruction from '@components/Reconstruction.svelte';
  
  import { NotificationService } from '@stores/notification.service';
  import type { INotification } from '@interfaces';
  import type { Unsubscriber } from 'svelte/store';
  import { onDestroy, onMount } from 'svelte';
  import { globalLang, localLang } from '@stores/language.service';

  // Premium Stuff
  // import Contest from '@pcomponents/Contest.svelte';
  import { screen } from '@stores/screen.store';
  import { DataService } from '@stores/data.service';
  import { version } from '@stores/version.store';
  import { randomUUID } from '@helpers/strings';
  import { CubeDBICON } from '@constants';
  // import Particles from '@pcomponents/Particles.svelte';
  // import Space from '@pcomponents/Space.svelte';

  let dataService = DataService.getInstance();
  let notService = NotificationService.getInstance();
  let notifications: INotification[] = [];
  let nSub: Unsubscriber;

  function handleResize() {
    $screen = {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768
    };
  }

  function checkUpdates() {
    dataService.update('check').then(res => {
      if ( !res ) return;

      let p1 = $version.split(".").map(Number);
      let p2 = res.split(".").map(Number);

      let cmp = (a: number[], b: number[]) => {
        if ( a.length < b.length ) return -1;
        if ( a.length > b.length ) return 1;

        for (let i = 0, maxi = a.length; i < maxi; i += 1){
          if ( a[i] < b[i] ) return -1;
          if ( a[i] > b[i] ) return 1;
        }

        return 0;
      };

      if ( cmp(p2, p1) > 0 ) {
        notService.addNotification({
          header: `${ $localLang.SETTINGS.updateAvailable } (${ res })`,
          text: $localLang.SETTINGS.updateAvailableText,
          fixed: true,
          actions: [
            { text: $localLang.global.cancel, callback: () => {}, color: 'alternative' },
            { text: $localLang.global.update, callback: () => dataService.update('download'), color: 'purple' },
          ],
          key: randomUUID(),
          icon: CubeDBICON,
        });
      }
    }).catch(() => {});
  }

  onMount(() => {
    handleResize();
    // checkUpdates();
    
    nSub = notService.notificationSub.subscribe((v) => {
      notifications = v;
    });

    let lang = localStorage.getItem('language') || 'en-EN';
    localStorage.setItem('language', lang);
    globalLang.update(() => lang);

    document.documentElement.style.setProperty('--app-font', localStorage.getItem('app-font') || 'Ubuntu');
    document.documentElement.style.setProperty('--timer-font', localStorage.getItem('timer-font') || 'Ubuntu');
  });

  onDestroy(() => nSub());
</script>

<svelte:window on:resize={ handleResize }/>

<Router>
  <!-- <Particles /> -->
  <!-- <Space /> -->

  <Frame />
  <Route path="/" component={ Home }/>
  <!-- <Route path="/algorithms/*" let:params> <Lazy component={ import('@components/Algorithms.svelte') } {params}/> </Route> -->
  <Route path="/algorithms/*" let:params> <Lazy component={ import('@components/Charts.svelte') } {params}/> </Route>
  <Route path="/algorithms-admin" let:params> <Lazy component={ import('@components/AlgorithmsAdmin.svelte') } {params}/> </Route>
  <Route path="/timer" let:params> <Lazy component={ import('@components/timer/Timer.svelte') } {params}/> </Route>
  <Route path="/reconstructions" let:params> <Lazy component={ import('@components/Reconstruction.svelte') } {params}/> </Route>
  <Route path="/battle" let:params> <Lazy component={ import('@components/battle/Battle.svelte') } {params}/> </Route>
  <Route path="/pll-trainer" let:params> <Lazy component={ import('@components/PllRecognition.svelte') } {params}/> </Route>
  <Route path="/simulator" let:params> <Lazy component={ import('@components/Simulator.svelte') } {params}/> </Route>
  <Route path="/contest" let:params> <Lazy component={ import('@pcomponents/Contest.svelte') } {params}/> </Route>
  <Route path="/import-export" let:params> <Lazy component={ import('@components/import-export/ImportExport.svelte') } {params}/> </Route>
  <Route path="/settings" let:params> <Lazy component={ import('@components/Settings.svelte') } {params}/> </Route>
  <Route path="/cubedb" let:params> <Lazy component={ import('@components/CubeDB.svelte') } {params}/> </Route>
  <Route path="/tools" let:params> <Lazy component={ import('@components/tools/Tools.svelte') } {params}/> </Route>

  <!-- Notifications -->
  <div class="notification-container">
    {#each notifications as nt (nt.key)}
      <Notification {...nt} fixed={ nt.fixed }/>
    {/each}
  </div>
</Router>

<style>
  .notification-container {
    max-width: 25rem;
    position: fixed;
    right: 0;
    top: 3rem;
    height: calc(100% - 3rem);
    width: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: .5rem;
    justify-content: center;
  }
</style>