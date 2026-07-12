<script lang="ts">
  import { createEventDispatcher } from "svelte";

  interface ToggleProps {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
  }

  const dispatch = createEventDispatcher<{
    change: { value: boolean; event: Event };
  }>();

  let { checked = $bindable(false), disabled = false, class: customClass = "" }: ToggleProps = $props();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    checked = target.checked;
    dispatch("change", { value: checked, event: e });
  }
</script>

<input
  type="checkbox"
  class="toggle toggle-primary {customClass}"
  bind:checked
  onchange={handleChange}
  {disabled}
/>
