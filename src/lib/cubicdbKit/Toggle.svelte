<script lang="ts">
  interface ToggleProps {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
    onchange?: (change: { value: boolean; event: Event }) => void;
  }

  let {
    checked = $bindable(false),
    disabled = false,
    class: customClass = "",
    onchange = () => {},
  }: ToggleProps = $props();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    checked = target.checked;
    onchange({ value: checked, event: e });
  }
</script>

<input
  type="checkbox"
  class="toggle toggle-primary {customClass}"
  bind:checked
  onchange={handleChange}
  {disabled}
/>
