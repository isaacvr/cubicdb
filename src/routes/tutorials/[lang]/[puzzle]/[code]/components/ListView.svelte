<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import type { ITutorialList } from "@interfaces";
  import { Dropdown, DropdownItem, Input } from "$lib/cubicdbKit";
  import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let block: ITutorialList;
  export let editMode = false;

  let editing = false;
  let tempList: string[] = [];
  let tempStart = block.start || 1;
  let showDropdown = false;

  const dropdownDefaultClass =
    "font-medium py-2 px-4 text-sm hover:bg-gray-600 flex items-center gap-2 justify-start";

  function startEditing() {
    editing = true;
    tempList = block.list.slice();
    showDropdown = false;
  }

  function save() {
    block.list = tempList.slice();
    block.start = tempStart;
    editing = false;
  }

  function removeItem(pos: number) {
    tempList = tempList.filter((_, p) => p != pos);
  }

  function addItem() {
    tempList = [...tempList, ""];
  }

  function removeList() {
    showDropdown = false;
    dispatch("delete");
  }
</script>

<ol class="grid list-decimal ml-6 mt-4 gap-2 relative" start={block.start || 1}>
  {#if editing}
    {#each tempList as item, pos}
      <li class="flex gap-2">
        <Input bind:value={item} />
        <Button type="danger" size="md" icon onclick={() => removeItem(pos)}>
          <TrashIcon size="1.2rem" />
        </Button>
      </li>
    {/each}

    <div class="flex items-center justify-evenly gap-2">
      <Button onclick={addItem}>Add Item</Button>

      <div class="flex items-center gap-2">
        <span>Start</span>
        <Input type="number" min={1} step={1} bind:value={tempStart} class="max-w-[5rem]" />
      </div>
    </div>

    <div
      class="flex justify-center items-center gap-4 border border-gray-600 transition-all duration-200
      rounded-md p-2 w-min shadow-sm hover:shadow-lg hover:shadow-primary-800 shadow-primary-800 mx-auto"
    >
      <Button type="secondary" onclick={() => (editing = false)}>Cancel</Button>
      <Button onclick={save}>Save</Button>
    </div>
  {:else}
    {#each block.list || [] as item}
      <li class="tx-text">{item}</li>
    {/each}
  {/if}

  {#if editMode}
    <div class="actions absolute top-3 -left-5 -translate-x-full z-10">
      <Button type="tertiary" size="sm" icon class="absolute right-0 top-1/2 translate-y-[-50%]">
        <EllipsisVerticalIcon size="1.2rem" class="text-orange-400" />
      </Button>

      <Dropdown placement="right" class="z-50 relative" bind:open={showDropdown}>
        <DropdownItem defaultClass={dropdownDefaultClass} onclick={startEditing}>
          <PencilIcon size="1.2rem" /> Edit
        </DropdownItem>

        <DropdownItem defaultClass={dropdownDefaultClass} onclick={removeList}>
          <TrashIcon size="1.2rem" /> Delete
        </DropdownItem>
      </Dropdown>
    </div>
  {/if}
</ol>
