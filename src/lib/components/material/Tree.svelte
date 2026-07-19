<script lang="ts">
  import type { Algorithm, AlgorithmTree } from "@interfaces";
  import { ChevronRightIcon, TrashIcon, PencilIcon, PlusIcon } from "lucide-svelte";

  export let obj: AlgorithmTree;
  export let oneditstep: (algorithm: Algorithm) => void = () => {};
  export let onadd: (algorithm: Algorithm) => void = () => {};
  export let ondelete: (algorithm: Algorithm) => void = () => {};

  function toggleExpanded(ev: MouseEvent) {
    ev.stopPropagation();
    obj.expanded = !obj.expanded;
  }

  function editAlgorithm(a: Algorithm) {
    oneditstep(a);
  }

  function addSection(a: Algorithm) {
    onadd(a);
  }

  function deleteSection(a: Algorithm) {
    ondelete(a);
  }
</script>

<section class="tree relative" class:expanded={obj.expanded}>
  <div class="header" onclick={toggleExpanded} role="button" tabindex="0" onkeydown={() => {}}>
    <div class="name">
      <div class="icon" class:hidden={!obj.children.length}>
        <ChevronRightIcon size="1.2rem" />
      </div>
      {obj.name + (obj.children.length ? ` (${obj.children.length})` : "")}
    </div>
    <div class="actions pr-4">
      <button
        onclick={ev => {
          ev.stopPropagation();
          editAlgorithm(obj.alg);
        }}><PencilIcon size="1.2rem" /></button
      >
      <button
        onclick={ev => {
          ev.stopPropagation();
          addSection(obj.alg);
        }}><PlusIcon size="1.2rem" /></button
      >
      <button
        onclick={ev => {
          ev.stopPropagation();
          deleteSection(obj.alg);
        }}><TrashIcon size="1.2rem" /></button
      >
    </div>
  </div>

  <div class="content">
    <div>
      {#each obj.children as child (child.alg.parentPath + "/" + child.route)}
        <svelte:self
          obj={child}
          oneditstep={editAlgorithm}
          onadd={addSection}
          ondelete={deleteSection}
        />
      {/each}
    </div>
  </div>
</section>

<style lang="postcss">
  @reference "@src/themes/index.css";

  .tree {
    --anim-t: 300ms;
    @apply rounded-md px-4 py-2 text-gray-300;
    background-color: #555;
  }

  .tree .header {
    @apply py-2 hover:bg-black/20 flex items-center
      transition-all duration-100 cursor-pointer rounded-sm;
  }

  .tree .header .name {
    @apply flex items-center;
  }

  .tree .header .actions {
    @apply flex ml-8 mr-auto pointer-events-none opacity-0 transition-all duration-200;
  }

  .tree .header:hover .actions {
    @apply pointer-events-auto opacity-100;
  }

  .tree > .header .actions button {
    padding: 0.2rem;
    border-radius: 50%;
    box-sizing: border-box;
    width: 1.8rem;
    height: 1.8rem;
    display: grid;
    place-items: center;
    margin-block: -1rem;
    transition: all var(--anim-t);
  }

  .tree > .header .actions button:hover {
    background: #fff4;
    box-shadow: 0px 0.1rem 1rem #0004;
  }

  .tree .content {
    display: grid;
    transition: grid-template-rows var(--anim-t);
  }

  .tree:not(.expanded) > .content {
    grid-template-rows: 0fr;
  }

  .tree.expanded > .content {
    grid-template-rows: 1fr;
  }

  .tree > .header .icon {
    transition: all var(--anim-t);
  }

  .tree:not(.expanded) > .header .icon {
    rotate: 0deg;
  }

  .tree.expanded > .header .icon {
    rotate: 90deg;
  }

  .tree .content > div {
    overflow: hidden;
  }
</style>
