<script lang="ts">
  import { getTimerApplicationContext } from "../context/timerApplicationContext";

  const application = getTimerApplicationContext();

  function keyDown(event: KeyboardEvent) {
    void application.keyboardBoundary.keyDown(event);
  }

  function keyUp(event: KeyboardEvent) {
    void application.keyboardBoundary.keyUp(event);
  }
</script>

<svelte:window onkeydown={keyDown} onkeyup={keyUp} />
