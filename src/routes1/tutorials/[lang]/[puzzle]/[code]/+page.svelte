<script lang="ts">
  import type {
    ITutorial,
    ITutorialStep,
    ITutorialBlock,
    Scrambler,
    LanguageCode,
  } from "@interfaces";
  import { onMount, tick } from "svelte";
  import { ICONS } from "@constants";
  import WCACategory from "@components/wca/CubeCategory.svelte";
  import CubesView from "./components/CubesView.svelte";
  import { Button, Dropdown, DropdownItem, Modal, Input } from "flowbite-svelte";
  import TextView from "./components/TextView.svelte";
  import ListView from "./components/ListView.svelte";
  import Select from "@material/Select.svelte";
  import { LANGUAGES } from "@lang/index";
  import { localLang } from "@stores/language.service";

  import StepIcon from "@icons/SchoolOutline.svelte";
  import DotsIcon from "@icons/DotsVertical.svelte";
  import EditIcon from "@icons/Pencil.svelte";
  import RemoveIcon from "@icons/Delete.svelte";
  import AddIcon from "@icons/Plus.svelte";
  import UpIcon from "@icons/ChevronUp.svelte";
  import DownIcon from "@icons/ChevronDown.svelte";
  import SubtitleIcon from "@icons/FormatTitle.svelte";
  import TextIcon from "@icons/Text.svelte";
  import ListIcon from "@icons/ListBox.svelte";
  import SettingIcon from "@icons/Cog.svelte";
  import { NotificationService } from "@stores/notification.service";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { capitalize, replaceParams } from "@helpers/strings";
  import { browser } from "$app/environment";
  import { getTitleMeta } from "$lib/meta/title";
  import { dataService } from "$lib/data-services/data.service";

  const dropdownDefaultClass =
    "font-medium py-2 px-4 text-sm hover:bg-gray-600 flex items-center gap-2 justify-start";

  const IBASubtitle = "text-purple-400";
  const IBAText = "text-white";
  const IBAList = "text-orange-400";
  const IBACubes = "text-green-400";

  let tut: ITutorial = {
    algs: 0,
    _id: "",
    description: {
      content: [],
      title: "",
      icon: "333",
    },
    lang: "EN",
    level: 0,
    name: "",
    puzzle: "3x3x3",
    shortName: "",
    steps: [],
    summary: "",
    icon: "333",
  };

  let index = 0;
  let currentStep: ITutorialStep | null = null;
  let editMode = true;
  let contentRef: HTMLElement;
  let meta = getTitleMeta($page.url.pathname, $localLang);

  // Modal
  let sIndex = -1;
  let showModal = false;
  let tName = "";
  let tShortName = "";
  let tPuzzle: ITutorial["puzzle"] = "3x3x3";
  let tSummary = "";
  let tAlgs = 0;
  let tLevel = 0;
  let tLang: LanguageCode = $localLang.code;
  let tIcon: Scrambler | "fundamentals" | undefined = "333";
  let modalType: "delete" | "edit-step" | "edit-tutorial" = "edit-step";

  function edit(pos: number) {
    sIndex = pos;
    showModal = true;
    modalType = "edit-step";

    if (pos > -1) {
      tName = tut.steps[pos].title;
      tIcon = tut.steps[pos].icon;
    }
  }

  function preRemove(pos: number) {
    sIndex = pos;
    modalType = "delete";
    showModal = true;
  }

  function remove() {
    tut.steps = tut.steps.filter((_, p) => p != sIndex);
    showModal = false;
  }

  function swap(a: number, b: number) {
    tut.steps = tut.steps.map((e, p) => (p === a ? tut.steps[b] : p === b ? tut.steps[a] : e));
  }

  function moveUp(pos: number) {
    if (pos <= 0) return;

    swap(pos, pos - 1);

    if (pos + 1 === index) {
      index -= 1;
    }
  }

  function moveDown(pos: number) {
    if (pos >= tut.steps.length - 1) return;

    swap(pos, pos + 1);

    if (pos + 1 === index) {
      index += 1;
    }
  }

  function addStep() {
    if (sIndex === -1) {
      tut.steps = [...tut.steps, { title: tName, icon: tIcon, content: [] }];
    } else {
      tut.steps[sIndex].title = tName;
      tut.steps[sIndex].icon = tIcon;
    }

    showModal = false;
  }

  function saveTutorial() {
    tut.algs = ~~tut.algs;
    tut.level = ~~tut.level;

    $dataService.tutorial.updateTutorial(tut).then(() => {
      NotificationService.getInstance().addNotification({
        header: $localLang.global.done,
        text: $localLang.global.settingsSaved,
        timeout: 1000,
      });
      goto(
        `/tutorials/${tut.puzzle}/${tut.shortName}?lang=${tut.lang}&edit=${editMode.toString()}`
      );
    });
  }

  function saveTutorialConfig() {
    tut.name = tName;
    tut.summary = tSummary;
    tut.shortName = tShortName;
    tut.puzzle = tPuzzle;
    tut.algs = tAlgs;
    tut.level = tLevel;
    tut.lang = tLang;
    tut.icon = tIcon;
    showModal = false;
  }

  function addBlock(pos: number, type: ITutorialBlock["type"]) {
    if (!currentStep) return;

    switch (type) {
      case "subtitle": {
        currentStep.content = [
          ...currentStep.content.slice(0, pos),
          { type, content: "Subtitle" },
          ...currentStep.content.slice(pos),
        ];
        break;
      }
      case "text": {
        currentStep.content = [
          ...currentStep.content.slice(0, pos),
          { type, content: "Text" },
          ...currentStep.content.slice(pos),
        ];
        break;
      }
      case "list": {
        currentStep.content = [
          ...currentStep.content.slice(0, pos),
          { type, list: ["Item 1"], start: 1 },
          ...currentStep.content.slice(pos),
        ];
        break;
      }
      case "cubes": {
        currentStep.content = [
          ...currentStep.content.slice(0, pos),
          { type, cubes: [], algMode: false, preffix: "", progressive: false, suffix: "" },
          ...currentStep.content.slice(pos),
        ];
        break;
      }
    }
  }

  function removeBlock(pos: number) {
    if (!currentStep) return;
    currentStep.content = currentStep.content.filter((_, p) => p != pos);
  }

  function editTutorial() {
    tName = tut.name;
    tShortName = tut.shortName;
    tPuzzle = tut.puzzle;
    tAlgs = tut.algs;
    tLevel = tut.level;
    tLang = tut.lang;
    tIcon = tut.icon;
    tSummary = tut.summary;
    modalType = "edit-tutorial";
    showModal = true;
  }

  function getTutorial() {
    let puzzle = $page.params.puzzle;
    let code = $page.params.code;
    let lang = $page.params.lang;
    let map = $page.url.searchParams;
    let step = parseInt(map.get("step") || "0");

    editMode = JSON.parse(map.get("edit") || "false");

    $dataService.tutorial
      .getTutorial(puzzle, code, lang)
      .then(t => {
        if (!t) {
          // goto("/tutorials");
        } else {
          tut = t;
          index = step;
        }
      })
      .catch(err => console.log("ERROR: ", err));
  }

  async function handleScroll(n: number) {
    void n;
    await tick();
    contentRef?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  onMount(() => {
    getTutorial();
  });

  $: currentStep = index > 0 ? tut.steps[index - 1] : tut.description;
  $: handleScroll(index);
  $: browser && goto($page.url.pathname + "?step=" + index);
  $: {
    meta = getTitleMeta($page.url.pathname, $localLang);
    meta.title = [
      meta.title,
      $page.params.puzzle,
      capitalize($page.params.code),
      currentStep.title || $localLang.global.summary,
    ].join(" - ");
  }
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
</svelte:head>

<div class="tutorial pr-6 text-justify text-gray-400">
  <!-- Content -->
  <section class="content max-w-3xl h-full mx-auto">
    <div class="title" bind:this={contentRef}>
      <div class="icon">
        {#if index > 0 ? currentStep?.icon : tut.icon}
          <WCACategory icon={index > 0 ? currentStep?.icon : tut.icon} class="text-white" />
        {:else}
          <StepIcon size="2rem" class="text-white" />
        {/if}
      </div>

      {#if index > 0}
        <h1 class="text-3xl tx-text font-bold">{index}. {currentStep?.title}</h1>
      {:else}
        <h1 class="text-3xl tx-text font-bold">{tut.name}</h1>
      {/if}
    </div>

    <div class="blocks grid mt-8 gap-2 pb-[20vh]">
      {#if currentStep}
        {#if editMode}
          <div class="flex items-center justify-center mx-auto gap-2">
            <button class={IBASubtitle} on:click={() => addBlock(0, "subtitle")}>
              <SubtitleIcon size="1.2rem" />
            </button>

            <button class={IBAText} on:click={() => addBlock(0, "text")}>
              <TextIcon size="1.2rem" />
            </button>

            <button class={IBAList} on:click={() => addBlock(0, "list")}>
              <ListIcon size="1.2rem" />
            </button>

            <button class={IBACubes} on:click={() => addBlock(0, "cubes")}>
              <WCACategory icon="333" size="1.2rem" />
            </button>
          </div>
        {/if}
        {#each currentStep.content as bl, pos (bl)}
          {#if bl.type === "text" || bl.type === "subtitle"}
            <TextView bind:block={bl} {editMode} on:delete={() => removeBlock(pos)} />
          {:else if bl.type === "list"}
            <ListView bind:block={bl} {editMode} on:delete={() => removeBlock(pos)} />
          {:else if bl.type === "cubes"}
            <CubesView bind:block={bl} {editMode} on:delete={() => removeBlock(pos)} />
          {/if}

          {#if editMode}
            <div class="flex items-center justify-center mx-auto gap-2">
              <button class={IBASubtitle} on:click={() => addBlock(pos + 1, "subtitle")}>
                <SubtitleIcon size="1.2rem" />
              </button>

              <button class={IBAText} on:click={() => addBlock(pos + 1, "text")}>
                <TextIcon size="1.2rem" />
              </button>

              <button class={IBAList} on:click={() => addBlock(pos + 1, "list")}>
                <ListIcon size="1.2rem" />
              </button>

              <button class={IBACubes} on:click={() => addBlock(pos + 1, "cubes")}>
                <WCACategory icon="333" size="1.2rem" />
              </button>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </section>

  <!-- Steps -->
  <section class="step-list px-2 sticky top-0 h-fit z-10">
    <h2 class="font-bold text-xl text-center tx-text mt-2">
      {tut.name}

      {#if editMode}
        <Button color="none" pill class="!p-2" on:click={editTutorial}>
          <SettingIcon />
        </Button>
      {/if}
    </h2>

    <ul>
      <li>
        <button class="step-item" class:current={index === 0} on:click={() => (index = 0)}>
          <h3 class="text-lg tx-text">{$localLang.global.summary}</h3>
        </button>
      </li>

      {#each tut.steps as step, pos}
        <li class="relative">
          <button
            class="step-item tx-text"
            class:current={pos + 1 === index}
            on:click={() => (index = pos + 1)}
          >
            {#if step.icon}
              <WCACategory size="1rem" icon={step.icon} class="text-white" />
            {/if}

            {step.title}
          </button>

          {#if editMode}
            <Button
              pill
              color="alternative"
              class="w-8 h-8 !p-2 border-none absolute right-0 top-1/2 translate-y-[-50%]"
            >
              <DotsIcon size="1.2rem" />
            </Button>

            <Dropdown placement="right" class="relative w-max">
              <DropdownItem defaultClass={dropdownDefaultClass} on:click={() => edit(pos)}>
                <EditIcon size="1.2rem" /> Edit
              </DropdownItem>
              <DropdownItem defaultClass={dropdownDefaultClass} on:click={() => moveUp(pos)}>
                <UpIcon size="1.2rem" /> Move Up
              </DropdownItem>
              <DropdownItem defaultClass={dropdownDefaultClass} on:click={() => moveDown(pos)}>
                <DownIcon size="1.2rem" /> Move Down
              </DropdownItem>
              <DropdownItem defaultClass={dropdownDefaultClass} on:click={() => preRemove(pos)}>
                <RemoveIcon size="1.2rem" /> Delete
              </DropdownItem>
            </Dropdown>
          {/if}
        </li>
      {/each}

      {#if editMode}
        <li class="flex justify-center mt-4 gap-2">
          <Button class="gap-2" on:click={() => edit(-1)}>
            <AddIcon size="1.2rem" /> Add step
          </Button>

          <Button color="purple" class="gap-2" on:click={saveTutorial}>Save</Button>
        </li>
      {/if}
    </ul>
  </section>
</div>

<div
  class="fixed bottom-0 flex justify-between mt-auto col-span-2 ml-[20rem] w-[min(42rem,calc(100%-22rem))]
  max-w-2xl border-t border-t-gray-600 py-2"
>
  <Button
    color="alternative"
    class={"transition-all bg-cancelButton duration-200 " +
      (index === 0 ? "opacity-0 pointer-events-none" : "")}
    on:click={() => (index -= 1)}
  >
    {$localLang.global.back}
  </Button>

  <Button
    color="purple"
    class={"bg-urgentButton transition-all duration-200 " +
      (index === tut.steps.length ? "opacity-0 pointer-events-none" : "")}
    on:click={() => (index += 1)}
  >
    {$localLang.global.next}
  </Button>
</div>

<Modal bind:open={showModal} outsideclose>
  {#if modalType === "delete"}
    <h2 class="text-center text-xl text-white">
      {replaceParams($localLang.global.deleteWarning, [tut.steps[sIndex].title])}
    </h2>

    <div class="flex flex-wrap gap-2 justify-center">
      <Button color="alternative" on:click={() => (showModal = false)}
        >{$localLang.global.cancel}</Button
      >
      <Button color="red" on:click={remove} class="flex items-center gap-2">
        <RemoveIcon size="1.2rem" />
        {$localLang.global.delete}
      </Button>
    </div>
  {:else if modalType === "edit-step"}
    <div class="flex flex-wrap gap-2 justify-center">
      <Input placeholder="name" bind:value={tName} class="max-w-[10rem]" />

      <Select
        bind:value={tIcon}
        items={ICONS}
        transform={e => e.icon}
        label={e => e.name}
        hasIcon={e => e.icon}
      />
    </div>

    <div class="flex flex-wrap gap-2 justify-center">
      <Button color="alternative" on:click={() => (showModal = false)}
        >{$localLang.global.cancel}</Button
      >
      <Button color="purple" on:click={addStep}>Save</Button>
    </div>
  {:else if modalType === "edit-tutorial"}
    <div class="flex flex-wrap gap-2 justify-center items-center">
      <section>
        <span>Name: </span>
        <Input placeholder="name" bind:value={tName} class="max-w-[10rem]" />
      </section>
      <section>
        <span>shortName: </span>
        <Input placeholder="shortName" bind:value={tShortName} class="max-w-[10rem]" />
      </section>
      <section>
        <span>Summary: </span>
        <Input placeholder="summary" bind:value={tSummary} class="max-w-[10rem]" />
      </section>
      <section>
        <span>Puzzle: </span>
        <Input placeholder="puzzle" bind:value={tPuzzle} class="max-w-[10rem]" />
      </section>
      <section>
        <span>Algs: </span>
        <Input type="number" bind:value={tAlgs} class="max-w-[5rem]" />
      </section>
      <section>
        <span>Level: </span>
        <Input type="number" bind:value={tLevel} min={0} max={2} step={1} class="max-w-[5rem]" />
      </section>
      <section class="grid">
        <span>Lang: </span>
        <Select bind:value={tLang} items={LANGUAGES} transform={e => e[2]} label={e => e[1].name} />
      </section>
      <section class="grid">
        <span>Icon: </span>
        <Select
          bind:value={tIcon}
          items={ICONS}
          transform={e => e.icon}
          label={e => e.name}
          hasIcon={e => e.icon}
          onChange={e => (tName = e.name)}
        />
      </section>
    </div>

    <div class="flex flex-wrap gap-2 justify-center">
      <Button color="alternative" on:click={() => (showModal = false)}
        >{$localLang.global.cancel}</Button
      >
      <Button color="purple" on:click={saveTutorialConfig}>{$localLang.global.save}</Button>
    </div>
  {/if}
</Modal>

<style lang="postcss">
  .tutorial {
    @apply grid gap-4 my-8 mx-2 h-full overflow-auto;
    grid-template-columns: 15rem auto;
    max-height: calc(100vh - 9rem);
    grid-template-areas: "stepList content";
  }

  .step-item {
    @apply select-none transition-all duration-100 p-2 border-r-2
      flex items-center gap-2 w-full;
    grid-area: stepList;
    border-right-color: var(--th-backgroundLevel3);
  }

  .step-item.current {
    @apply border-r-4 cursor-default pl-4 rounded-l-md;
    background-color: var(--th-primary-900);
    border-right-color: var(--th-primary-400);
    color: var(--th-text);
  }

  .step-item:not(.current) {
    @apply hover:text-blue-400 hover:pl-4;
  }

  .content {
    grid-area: content;
  }

  .content .title {
    @apply flex gap-2 items-center;
  }

  .content .icon {
    @apply w-14 h-14 rounded-full grid place-items-center;
    background-color: var(--th-primary-500);
  }
</style>
