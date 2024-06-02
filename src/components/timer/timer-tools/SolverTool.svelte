<script lang="ts">
  import type { TimerContext } from "@interfaces";
  import { get } from "svelte/store";

  export let context: TimerContext;
</script>

<div class="grid">
  Solver Tool
  { get(context.scramble) }
</div>
