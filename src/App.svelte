<script lang="ts">
  import './App.css';
  /// Svelte Stuff
  import { Route, Router } from 'svelte-routing';

  /// Components
  import Frame from '@components/Frame.svelte';
  import Navbar from '@components/Navbar.svelte';
  import Home from '@components/Home.svelte';
  import Tutorials from '@components/Tutorials.svelte';
  import Timer from '@components/timer/Timer.svelte';
  import PllTrainer from '@components/PllTrainer.svelte';
  import Algorithms from '@components/Algorithms.svelte';
  import Simulator from '@components/Simulator.svelte';
  import TutorialParser from '@components/TutorialParser.svelte';
</script>

<Router>
  <Frame />
  <Navbar />
  <main class="pt-24">
    <Route path="/" component={ Home }/>
    <Route path="/tutorials" component={ Tutorials }/>
    <Route path="/tutorials/:something" component={ Tutorials }/>
    <Route path="/tutorials/:puzzle/:tutorial" component={ TutorialParser }/>
    <Route path="/algorithms/*" component={ Algorithms }/>
    <Route path="/timer" component={ Timer }/>
    <Route path="/pll-trainer" component={ PllTrainer }/>
    <Route path="/simulator" component={ Simulator }/>
  </main>
</Router>