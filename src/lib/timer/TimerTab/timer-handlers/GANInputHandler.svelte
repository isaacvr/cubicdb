<script lang="ts">
  import { type InputContext, type TimerContext } from "@interfaces";

  interface GANInputProps {
    inputContext: InputContext;
    context: TimerContext;
  }

  let { inputContext = $bindable(), context = $bindable() }: GANInputProps = $props();

  const {} = inputContext;
  const {} = context;
</script>
