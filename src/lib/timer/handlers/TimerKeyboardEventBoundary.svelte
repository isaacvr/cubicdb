<script lang="ts">
  import { getTimerApplicationContext } from "../context/timerApplicationContext";

  let { enabled = true }: { enabled?: boolean } = $props();
  const application = getTimerApplicationContext();

  function keyDown(event: KeyboardEvent) {
    if (!enabled) return;
    void application.keyboardBoundary.keyDown(event);
  }

  function keyUp(event: KeyboardEvent) {
    if (!enabled) return;
    void application.keyboardBoundary.keyUp(event);
  }
</script>

<svelte:window onkeydown={keyDown} onkeyup={keyUp} />
