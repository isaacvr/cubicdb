<script lang="ts">
  interface InputProps {
    value?: string | number;
    type?: string;
    placeholder?: string;
    class?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
  }

  let {
    value = $bindable(""),
    type = "text",
    placeholder = "",
    class: customClass = "",
    disabled = false,
    min,
    max,
    step,
  }: InputProps = $props();

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    if (type === "number") {
      value = target.valueAsNumber;
    } else {
      value = target.value;
    }
  }
</script>

<input
  {type}
  value={String(value)}
  {placeholder}
  {disabled}
  {min}
  {max}
  {step}
  class="input input-bordered w-full {customClass}"
  oninput={handleInput}
/>
