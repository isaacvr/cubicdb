<script lang="ts">
  import type { ITutorialSubtitle } from "@interfaces";
  import { Button, Dropdown, DropdownItem } from "$lib/cubicdbKit";
  import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "lucide-svelte";
  import { tick } from "svelte";

  export let block: ITutorialSubtitle;
  export let editMode = false;
  export let ondelete: () => void = () => {};

  let tempContent = block.content;
  let editing = false;
  let showDropdown = false;
  let textAreaRef: HTMLTextAreaElement;

  const dropdownDefaultClass =
    "font-medium py-2 px-4 text-sm hover:bg-gray-600 flex items-center gap-2 justify-start";

  function save() {
    block.content = tempContent;
    editing = false;
  }

  function handleResize() {
    textAreaRef.style.height = "auto";
    textAreaRef.style.height = `max(5rem, ${textAreaRef.scrollHeight + 2}px)`;
  }

  async function startEditing() {
    tempContent = block.content;
    editing = true;
    showDropdown = false;
    await tick();
    handleResize();
  }

  function removeText() {
    showDropdown = false;
    ondelete();
  }
</script>

<div class:editMode class={"text-view relative " + (block.type === "text" ? "" : "mt-8")}>
  {#if editing}
    <textarea
      bind:this={textAreaRef}
      bind:value={tempContent}
      oninput={handleResize}
      spellcheck="false"
      class="border border-primary-500 p-2 rounded-md w-full bg-transparent min-h-[5rem]"
    ></textarea>

    <div
      class="flex justify-center items-center gap-4 border border-gray-600 transition-all duration-200
      rounded-md p-2 w-min shadow-sm hover:shadow-lg hover:shadow-primary-800 shadow-primary-800 mx-auto"
    >
      <Button type="secondary" onclick={() => (editing = false)}>Cancel</Button>
      <Button type="accent" onclick={save}>Save</Button>
    </div>
  {:else if block.type === "text"}
    <p class="tx-text">{@html block.content.replaceAll("\n", "<br>")}</p>
  {:else}
    <h3 class="text-lg font-bold tx-text">{block.content}</h3>
  {/if}

  {#if editMode}
    <div class="actions absolute top-3 left-1 -translate-x-full z-10">
      <Button type="secondary" size="sm" icon class="absolute right-0 top-1/2 translate-y-[-50%]">
        <EllipsisVerticalIcon
          size="1.2rem"
          class={block.type === "text" ? "text-white" : "text-purple-400"}
        />
      </Button>

      <Dropdown placement="right" class="z-50 relative" bind:open={showDropdown}>
        <DropdownItem defaultClass={dropdownDefaultClass} onclick={startEditing}>
          <PencilIcon size="1.2rem" /> Edit
        </DropdownItem>

        <DropdownItem defaultClass={dropdownDefaultClass} onclick={removeText}>
          <TrashIcon size="1.2rem" /> Delete
        </DropdownItem>
      </Dropdown>
    </div>
  {/if}
</div>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .text-view:not(.editMode) .actions {
    display: none;
  }
</style>
