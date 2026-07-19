<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";
  import type { ButtonSize, ButtonType } from "./Button.types";

  interface FileButtonProps {
    accept?: string;
    loading?: boolean;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    class?: string;
    contentClass?: string;
    type?: ButtonType;
    size?: ButtonSize;
    icon?: boolean;
    pill?: boolean;
    shadow?: boolean;
    disabled?: boolean;
    multiple?: boolean;
    [key: string]: any;
  }

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
    files: FileList;
  }>();

  let {
    accept,
    loading = $bindable(false),
    children,
    onclick = () => {},
    multiple = false,
    disabled = false,
    ...buttonProps
  }: FileButtonProps = $props();

  let inputElement: HTMLInputElement;

  function handleClick(event: MouseEvent) {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }

    onclick(event);
    dispatch("click", event);
    inputElement.click();
  }

  function handleFiles(event: Event) {
    const target = event.currentTarget as HTMLInputElement;

    if (target.files) {
      dispatch("files", target.files);
    }

    target.value = "";
  }
</script>

<Button {loading} {disabled} onclick={handleClick} {...buttonProps}>
  {#if children}
    {@render children()}
  {/if}
</Button>

<input
  bind:this={inputElement}
  type="file"
  class="hidden"
  {accept}
  {multiple}
  onchange={handleFiles}
/>
