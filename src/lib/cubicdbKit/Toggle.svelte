<script lang="ts">
  interface ToggleProps {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let { checked = $bindable(false), disabled = false, class: customClass = "" }: ToggleProps = $props();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    checked = target.checked;
  }
</script>

<input
  type="checkbox"
  class="toggle toggle-primary {customClass}"
  checked={checked}
  onchange={handleChange}
  {disabled}
/>
