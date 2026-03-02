<script lang="ts">
  interface CheckboxProps {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
    label?: string;
  }

  let { checked = $bindable(false), disabled = false, class: customClass = "", label }: CheckboxProps = $props();

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    checked = target.checked;
  }
</script>

<div class="form-control">
  <label class="label cursor-pointer">
    <input
      type="checkbox"
      class="checkbox checkbox-primary {customClass}"
      checked={checked}
      onchange={handleChange}
      {disabled}
    />
    {#if label}
      <span class="label-text ml-2">{label}</span>
    {/if}
  </label>
</div>