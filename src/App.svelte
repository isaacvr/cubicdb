<script lang="ts">
  import './App.css';
  import { currentPath } from './stores/path.js';
  import Frame from './components/Frame.svelte';
  import Navbar from './components/Navbar.svelte';
  import { Route, Router } from 'svelte-routing';
  import { globalHistory } from 'svelte-routing/src/history';
  import { onDestroy, onMount } from 'svelte';
  import Home from './components/Home.svelte';
  import Tutorials from './components/Tutorials.svelte';

  let unsub;

  onMount(() => {
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
  <Route path="/" component={ Home }/>
  <Route path="/tutorials" component={ Tutorials }/>
</Router>

<style lang="postcss" global>
  .container {
    @apply mt-4 px-5;
  }

  button {
    @apply flex items-center justify-center;
  }

  button.stroked {
    @apply border p-2 rounded-sm border-gray-500;
  }
</style>