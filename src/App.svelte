<script lang="ts">
  /// Svelte Stuff
  import { Route, Router } from 'svelte-routing';

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
  import Contest from '@components/Contest.svelte';
  import ImportExport from '@components/import-export/ImportExport.svelte';
  import Battle from '@components/Battle.svelte';

  const path = window.location.pathname;
  const basepath = /^\/?[a-zA-Z]+:/.test(path)
    ? path.substr(0, path.indexOf(":") + 1)
    : "/";
</script>

<Router { basepath }>
  <Frame />
  <Navbar />

  <main class="pt-24">
    <Route path="/" component={ Home }/>
    <Route path="/tutorials" component={ Tutorials }/>
    <Route path="/tutorials/:something" component={ Tutorials }/>
    <Route path="/tutorials/:puzzle/:tutorial" component={ TutorialParser }/>
    <Route path="/algorithms/*" component={ Algorithms }/>
    <Route path="/timer" component={ Timer }/>
    <Route path="/battle" component={ Battle }/>
    <Route path="/pll-trainer" component={ PllRecognition }/>
    <Route path="/simulator" component={ Simulator }/>
    <Route path="/contest" component={ Contest }/>
    <Route path="/import-export" component={ ImportExport }/>
  </main>
</Router>