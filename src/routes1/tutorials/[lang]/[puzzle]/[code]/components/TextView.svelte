<script lang="ts">
  import type { ITutorialSubtitle } from "@interfaces";
  import { Button, Dropdown, DropdownItem } from "flowbite-svelte";
  import EditIcon from "@icons/Pencil.svelte";
  import DotsIcon from "@icons/DotsVertical.svelte";
  import RemoveIcon from "@icons/Delete.svelte";
  import { createEventDispatcher, tick } from "svelte";

  const dispatch = createEventDispatcher();

  export let block: ITutorialSubtitle;
  export let editMode = false;

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
    dispatch("delete");
  }
</script>

<div class:editMode class={"text-view relative " + (block.type === "text" ? "" : "mt-8")}>
  {#if editing}
    <textarea
      bind:this={textAreaRef}
      bind:value={tempContent}
      on:input={handleResize}
      spellcheck="false"
      class="border border-primary-500 p-2 rounded-md w-full bg-transparent min-h-[5rem]"
    />

    <div
      class="flex justify-center items-center gap-4 border border-gray-600 transition-all duration-200
      rounded-md p-2 w-min shadow-sm hover:shadow-lg hover:shadow-primary-800 shadow-primary-800 mx-auto"
    >
      <Button color="alternative" on:click={() => (editing = false)}>Cancel</Button>
      <Button color="purple" on:click={save}>Save</Button>
    </div>
  {:else if block.type === "text"}
    <p class="tx-text">{@html block.content.replaceAll("\n", "<br>")}</p>
  {:else}
    <h3 class="text-lg font-bold tx-text">{block.content}</h3>
  {/if}

  {#if editMode}
    <div class="actions absolute top-3 left-1 -translate-x-full z-10">
      <Button
        pill
        color="alternative"
        class="w-8 h-8 !p-2 border-none absolute right-0 top-1/2 translate-y-[-50%]"
      >
        <DotsIcon size="1.2rem" class={block.type === "text" ? "text-white" : "text-purple-400"} />
      </Button>

      <Dropdown placement="right" class="z-50 relative" bind:open={showDropdown}>
        <DropdownItem defaultClass={dropdownDefaultClass} on:click={startEditing}>
          <EditIcon size="1.2rem" /> Edit
        </DropdownItem>

        <DropdownItem defaultClass={dropdownDefaultClass} on:click={removeText}>
          <RemoveIcon size="1.2rem" /> Delete
        </DropdownItem>
      </Dropdown>
    </div>
  {/if}
</div>

<style lang="postcss">
  .text-view:not(.editMode) .actions {
    display: none;
  }
</style>
