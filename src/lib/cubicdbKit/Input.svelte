<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  interface InputProps {
    value?: string | number;
    type?: string;
    placeholder?: string;
    class?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
    autofocus?: boolean;
    readonly?: boolean;
    readOnly?: boolean;
    name?: string;
    autocomplete?: HTMLInputAttributes["autocomplete"];
    oninput?: (event: Event) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    onUENTER?: () => void;
    [key: string]: any;
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
    autofocus = false,
    readonly = false,
    readOnly = false,
    oninput = () => {},
    onkeydown = () => {},
    onUENTER = () => {},
    ...restProps
  }: InputProps = $props();

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    value =
      type === "number"
        ? Number.isNaN(target.valueAsNumber)
          ? 0
          : target.valueAsNumber
        : target.value;
    oninput(e);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === "Enter") {
      onUENTER();
    }
    onkeydown(e);
  }
</script>

<input
  {type}
  value={value == null ? "" : String(value)}
  {placeholder}
  {disabled}
  {min}
  {max}
  {step}
  {autofocus}
  readonly={readonly || readOnly}
  class="input input-bordered w-full {customClass}"
  oninput={handleInput}
  onkeydown={handleKeydown}
  {...restProps}
/>
