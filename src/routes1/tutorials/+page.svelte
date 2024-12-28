<script lang="ts">
  import { onMount } from "svelte";
  import type { ITutorial, LanguageCode } from "@interfaces";
  import {
    Button,
    Card,
    Dropdown,
    DropdownItem,
    Indicator,
    Input,
    Modal,
    Tooltip,
  } from "flowbite-svelte";
  import WCACategory from "@components/wca/WCACategory.svelte";
  import { globalLang, localLang } from "@stores/language.service";
  import Select from "@material/Select.svelte";
  import { LANGUAGES } from "@lang/index";
  import { ICONS } from "@constants";

  import ArrowRightIcon from "@icons/ArrowRight.svelte";
  import DotsIcon from "@icons/DotsVertical.svelte";
  import EditIcon from "@icons/Pencil.svelte";
  import RemoveIcon from "@icons/Delete.svelte";
  import AddIcon from "@icons/Plus.svelte";
  import FundamentalsIcon from "@icons/HumanMaleBoardPoll.svelte";
  import FlagIcon from "@components/FlagIcon.svelte";
  import { goto } from "$app/navigation";
  import { dataService } from "$lib/data-services/data.service";

  type IndicatorColor = "green" | "blue" | "yellow";

  const dropdownDefaultClass =
    "font-medium py-2 px-4 text-sm hover:bg-gray-600 flex items-center gap-2 justify-start";

  const NICONS = [{ icon: "fundamentals", name: "fundamentals" }, ...ICONS];

  let tutorials: ITutorial[] = [];
  let lang = $globalLang;

  let groups: Record<string, ITutorial[]> = {};
  let groupNames: string[] = [];
  let currentGroup = "";
  let sTut: ITutorial | null = null;
  let nTut: ITutorial;
  let allowAdmin = false;
  let showModal = false;
  let textAreaRef: HTMLTextAreaElement;

  function groupTutorials(list: ITutorial[], language: LanguageCode) {
    groups = {};

    for (let i = 0, maxi = list.length; i < maxi; i += 1) {
      if (list[i].lang != language) continue;

      if (!groups[list[i].puzzle]) {
        groups[list[i].puzzle] = [];
      }

      groups[list[i].puzzle].push(list[i]);
    }

    groupNames = Object.entries(groups)
      .map(s => s[0])
      .sort();

    groupNames.forEach(g =>
      groups[g].sort((a, b) => {
        if (a.level != b.level) {
          return a.level - b.level;
        }

        return a.name < b.name ? -1 : 1;
      })
    );

    if (groupNames.length) {
      currentGroup = groupNames[0];
    } else {
      currentGroup = "fundamentals";
    }
  }

  function getLevel(lv: number): string {
    switch (lv) {
      case 0:
        return $localLang.TUTORIALS.easy;
      case 1:
        return $localLang.TUTORIALS.intermediate;
      case 2:
        return $localLang.TUTORIALS.advanced;
    }

    return $localLang.TUTORIALS.easy;
  }

  function getColor(lv: number): IndicatorColor {
    switch (lv) {
      case 0:
        return "green";
      case 1:
        return "yellow";
      case 2:
        return "blue";
    }

    return "green";
  }

  function viewTutorial(t: ITutorial, edit: boolean) {
    let params = [["lang", t.lang]];
    edit && params.push(["edit", edit.toString()]);

    goto(
      `/tutorials/${t.puzzle}/${t.shortName}?` + encodeURI(params.map(e => e.join("=")).join("&"))
    );
  }

  function preRemoveTutorial(t: ITutorial) {
    sTut = t;
  }

  function removeTutorial() {
    if (!sTut) return;

    $dataService.tutorial.removeTutorial(sTut).then(() => getTutorials());
  }

  function getTutorials() {
    $dataService.tutorial
      .getTutorials()
      .then(tuts => {
        tutorials = tuts;

        if (tutorials.length && !tutorials.some(t => t.lang === lang)) {
          lang = tutorials[0].lang;
        }
      })
      .catch(err => {
        console.log("ERROR: ", err);
      });
  }

  function preAddTutorial() {
    nTut = {
      _id: "",
      algs: 1,
      description: {
        content: [],
        title: "",
        icon: "333",
      },
      lang: $localLang.code,
      level: 0,
      name: "",
      puzzle: "fundamentals",
      shortName: "",
      steps: [],
      summary: "",
      icon: "fundamentals",
    };

    showModal = true;
  }

  function addTutorial() {
    $dataService.tutorial
      .addTutorial(nTut)
      .then(t => viewTutorial(t, true))
      .catch(err => console.log("ERROR: ", err));
  }

  function handleResize() {
    textAreaRef.style.height = "auto";
    textAreaRef.style.height = `max(5rem, ${textAreaRef.scrollHeight + 2}px)`;
  }

  onMount(() => {
    getTutorials();
  });

  $: groupTutorials(tutorials, lang);
</script>

<div class="tutorial-container w-full h-[calc(100vh-6rem)] overflow-hidden">
  <h1 class="header text-3xl mx-auto mt-4">
    {currentGroup === "fundamentals" ? $localLang.TUTORIALS.fundamentals : currentGroup}

    <Select
      class="mr-2 px-2"
      items={LANGUAGES.filter(lang => tutorials.some(t => t.lang === lang[2]))}
      bind:value={lang}
      transform={e => e[1].code}
      label={e => e[1].name}
      hasIcon={e => e[2]}
      IconComponent={FlagIcon}
      preferIcon
    />
  </h1>

  <!-- Options -->
  <section
    class="options rounded-r-md overflow-y-auto overflow-x-hidden"
    class:empty={tutorials.length === 0}
  >
    <button
      type="button"
      class={"rounded-md grid place-items-center w-6 h-6 cursor-pointer transition-all duration-200 " +
        (currentGroup === "fundamentals" ? "text-purple-400" : "text-gray-500")}
      on:click={() => (currentGroup = "fundamentals")}
    >
      <FundamentalsIcon class="" size="1.4rem" />
    </button>
    <Tooltip class="z-10" placement="right">{$localLang.TUTORIALS.fundamentals}</Tooltip>

    {#each groupNames as gn}
      {#if gn != "fundamentals"}
        <WCACategory
          icon={groups[gn][0].icon}
          class={"w-6 h-6 cursor-pointer transition-all duration-200 " +
            (currentGroup === gn ? "text-purple-400" : "text-gray-500")}
          on:click={() => (currentGroup = gn)}
        />
        <Tooltip class="z-10" placement="right">{gn}</Tooltip>
      {/if}
    {/each}

    {#if allowAdmin}
      <Button class="w-8 h-8 !p-1 mt-auto" on:click={preAddTutorial}>
        <AddIcon size="1.2rem" />
      </Button>
    {/if}
  </section>

  <!-- Content -->
  <section class="content">
    {#each groups[currentGroup] || [] as tut}
      <Card style="flex: 1 1 18rem;" class="max-h-60 relative">
        <h5 class="mb-2 text-2xl font-bold tracking-tight flex items-center gap-2 text-white">
          <Indicator color={getColor(tut.level)} size="sm" />
          <Tooltip>{getLevel(tut.level)}</Tooltip>
          {tut.name}
        </h5>

        <p class="mb-3 font-normaltext-gray-400 leading-tight overflow-hidden text-ellipsis">
          {tut.summary}
        </p>

        <Button
          color={getColor(tut.level)}
          shadow
          class="mt-auto w-min !border-current gap-2"
          href={`/tutorials/${tut.lang}/${tut.puzzle}/${tut.shortName}`}
        >
          {$localLang.global.start}
          <ArrowRightIcon size="1rem" />
        </Button>

        {#if allowAdmin}
          <div class="actions absolute right-2">
            <Button
              pill
              color="alternative"
              class="w-8 h-8 !p-2 border-none absolute right-0 top-1/2 translate-y-[-50%]"
            >
              <DotsIcon size="1.2rem" />
            </Button>

            <Dropdown placement="left" class="z-50 relative">
              <DropdownItem
                defaultClass={dropdownDefaultClass}
                on:click={() => viewTutorial(tut, true)}
              >
                <EditIcon size="1.2rem" /> Edit
              </DropdownItem>

              <DropdownItem
                defaultClass={dropdownDefaultClass}
                on:click={() => preRemoveTutorial(tut)}
              >
                <RemoveIcon size="1.2rem" /> Delete
              </DropdownItem>
            </Dropdown>
          </div>
        {/if}
      </Card>
    {/each}

    {#if tutorials.length === 0}
      <div class="grid h-min m-auto place-items-center gap-2">
        <span class="text-orange-300">{$localLang.TUTORIALS.empty}</span>
      </div>
    {/if}
  </section>
</div>

<Modal open={!!sTut} on:close={() => (sTut = null)}>
  <h2 class="text-center text-xl text-white">
    ¿Are you sure to delete "{sTut?.name}" tutorial?
  </h2>

  <div class="flex flex-wrap gap-2 justify-center">
    <Button color="alternative" on:click={() => (sTut = null)}>Cancel</Button>
    <Button color="red" on:click={removeTutorial} class="flex items-center gap-2">
      <RemoveIcon size="1.2rem" /> Delete
    </Button>
  </div>
</Modal>

<Modal bind:open={showModal} on:close={() => (showModal = false)}>
  <div class="flex flex-wrap gap-2 justify-center items-center">
    <section>
      <span>Name: </span>
      <Input placeholder="name" bind:value={nTut.name} class="max-w-[10rem]" />
    </section>
    <section>
      <span>shortName: </span>
      <Input placeholder="shortName" bind:value={nTut.shortName} class="max-w-[10rem]" />
    </section>
    <section>
      <span>Summary: </span>
      <textarea
        bind:this={textAreaRef}
        bind:value={nTut.summary}
        on:input={handleResize}
        spellcheck="false"
        class="border border-blue-500 p-2 rounded-md w-full bg-transparent min-h-[5rem]"
      />
      <!-- <Input placeholder="summary" bind:value={nTut.summary} class="max-w-[10rem]" /> -->
    </section>
    <section>
      <span>Puzzle: </span>
      <Input placeholder="puzzle" bind:value={nTut.puzzle} class="max-w-[10rem]" />
    </section>
    <section>
      <span>Algs: </span>
      <Input type="number" bind:value={nTut.algs} class="max-w-[5rem]" />
    </section>
    <section>
      <span>Level: </span>
      <Input type="number" bind:value={nTut.level} class="max-w-[5rem]" />
    </section>
    <section class="grid">
      <span>Lang: </span>
      <Select
        bind:value={nTut.lang}
        items={LANGUAGES}
        transform={e => e[2]}
        label={e => e[1].name}
      />
    </section>
    <section class="grid">
      <span>Icon: </span>
      <Select
        bind:value={nTut.icon}
        items={NICONS}
        transform={e => e.icon}
        label={e => e.name}
        hasIcon={e => e.icon}
        onChange={e => (nTut.puzzle = e.name)}
      />
    </section>
  </div>

  <div class="flex flex-wrap gap-2 justify-center">
    <Button color="alternative" on:click={() => (showModal = false)}>Cancel</Button>
    <Button color="purple" on:click={addTutorial}>Save</Button>
  </div>
</Modal>

<style lang="postcss">
  .tutorial-container {
    @apply grid gap-4;
    grid-template-columns: 3rem auto;
    grid-template-rows: 3rem auto;
    grid-template-areas:
      "header header"
      "options content";
  }

  .header {
    grid-area: header;
  }

  .options {
    @apply border border-gray-500 flex flex-col items-center p-2 gap-2 border-l-0;
    grid-area: options;
    background-color: var(--th-backgroundLevel1);
  }

  .content {
    @apply flex flex-wrap gap-4 pr-4 justify-evenly overflow-auto;
    grid-area: content;
  }
</style>
