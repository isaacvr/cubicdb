<script lang="ts">
  import { createEventDispatcher } from "svelte";

  interface CheckboxProps {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
    label?: string;
  }

  const dispatch = createEventDispatcher<{
    change: { value: boolean; event: Event };
  }>();

  let {
    checked = $bindable(false),
    disabled = false,
    class: customClass = "",
    label,
  }: CheckboxProps = $props();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    checked = target.checked;
    dispatch("change", { value: checked, event: e });
  }
</script>

<label class="inline-flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    class="checkbox checkbox-primary {customClass}"
    bind:checked
    {disabled}
    onchange={handleChange}
  />
  {#if label}
    <span class="label-text">{label}</span>
  {/if}
</label>
