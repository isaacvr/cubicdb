<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";
  import type { ButtonSize, ButtonType } from "./Button.types";

  interface FileButtonProps {
    accept?: string;
    loading?: boolean;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    onfiles?: (files: FileList) => void;
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

  let {
    accept,
    loading = $bindable(false),
    children,
    onclick = () => {},
    onfiles = () => {},
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
    inputElement.click();
  }

  function handleFiles(event: Event) {
    const target = event.currentTarget as HTMLInputElement;

    if (target.files) {
      onfiles(target.files);
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
