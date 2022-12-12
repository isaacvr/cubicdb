<script lang="ts">
  import './App.css';
  /// Svelte Stuff
  import { Route, Router } from 'svelte-routing';
  import { globalHistory } from 'svelte-routing/src/history';
  import { onDestroy, onMount } from 'svelte';
  
  /// Components
  import Frame from './components/Frame.svelte';
  import Navbar from './components/Navbar.svelte';
  import Home from './components/Home.svelte';
  import Tutorials from './components/Tutorials.svelte';
  import Timer from './components/timer/Timer.svelte';
  
  /// Services
  import { currentPath } from './stores/path';

  let unsub;

  onMount(() => {
    $currentPath = window.location.pathname;

    unsub = globalHistory.listen(({ location }) => {
      $currentPath = location.pathname;
    });
  });

  onDestroy(() => {
    unsub();
  });
</script>

<Router>
  <Frame />
  <Navbar />
  <main class="pt-24">
    <Route path="/" component={ Home }/>
    <Route path="/tutorials" component={ Tutorials }/>
    <Route path="/timer" component={ Timer }/>
  </main>
</Router>