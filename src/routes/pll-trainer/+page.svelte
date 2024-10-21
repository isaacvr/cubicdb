<script lang="ts">
  import { Puzzle } from "@classes/puzzle/puzzle";
  import { getPLLScramble, pllfilter } from "@cstimer/scramble/scramble_333";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import Select from "@material/Select.svelte";

  import CheckIcon from "@icons/Check.svelte";
  import { timer } from "@helpers/timer";
  import { screen } from "@stores/screen.store";
  import {
    Button,
    Card,
    Heading,
    Modal,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import PuzzleImage from "@components/PuzzleImage.svelte";

  interface IBundle {
    id: number;
    expected: string;
    answer: string;
    img: string;
    time: number;
  }

  let TOP_FACE = [
    { value: "random", label: "Neutral" },
    { value: "", label: "White" },
    { value: "x2", label: "Yellow" },
    { value: "z'", label: "Red" },
    { value: "z", label: "Orange" },
    { value: "x'", label: "Blue" },
    { value: "x", label: "Green" },
  ];

  let columns: string[] = ["No.", "Case", "Expected", "Answer", "Time"];
  let CASES: number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  let topFace: string = "random";
  let cases: number = 20;
  let stage: number = 0;
  let correct: number = 0;

  let idx: number;
  let pllCases: string[] = [];
  let caseName: string[] = [];
  let images: string[] = [];
  let answers: string[] = [];
  let filters: string[] = pllfilter.slice().sort();
  let times: number[] = [];
  let bundle: IBundle[] = [];

  let showAnswer: boolean = false;
  let lastAnswer: string = "";

  let lastTime: number;
  let showModal: boolean = false;

  function next() {
    switch (stage) {
      case 0: {
        pllCases.length = 0;
        caseName.length = 0;
        images.length = 0;
        answers.length = 0;
        times.length = 0;
        idx = 0;

        let len = pllfilter.length;
        let puzzles: Puzzle[] = [];

        for (let i = 0, maxi = cases; i < maxi; i += 1) {
          let idx = ~~(Math.random() * len);
          let scr = getPLLScramble(null, null, idx);
          pllCases.push(scr);
          caseName.push(pllfilter[idx]);

          let pref =
            topFace === "random"
              ? ["x", "x'", "", "z", "z'", "x2"][~~(Math.random() * 6)]
              : topFace;

          let rot = ["", "y", "y'", "y2"][~~(Math.random() * 4)];

          puzzles.push(
            Puzzle.fromSequence(pref + " " + rot + " " + scr, {
              type: "rubik",
              view: "trans",
            })
          );
        }

        pGenerateCubeBundle(puzzles, 500, true).then(res => {
          images.length = 0;
          images.push(...res);
          lastTime = Date.now();
          stage = 1;
        });
        break;
      }
      case 1: {
        bundle.length = 0;

        for (let i = 0, maxi = cases; i < maxi; i += 1) {
          bundle.push({
            id: i + 1,
            img: images[i],
            expected: caseName[i],
            answer: answers[i],
            time: times[i],
          });
        }

        stage = 2;
        break;
      }
      case 2: {
        correct = 0;
        stage = 0;
        break;
      }
    }
  }

  function addAnswer(ans: string) {
    answers.push(ans);
    times.push(Date.now() - lastTime);
    lastAnswer = ans;
    showAnswer = true;

    if (ans === caseName[idx]) {
      correct += 1;
    }

    setTimeout(() => {
      showAnswer = false;
      idx += 1;
      lastTime = Date.now();

      if (idx === cases) {
        next();
      }
    }, 1000);
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (stage != 1) return;

    let gFilters = [
      /^(Numpad|Digit)1$/,
      /^(Numpad|Digit)2$/,
      /^(Numpad|Digit)3$/,
      /^(Numpad|Digit)4$/,
    ];
    let twoFilter = /^Key[AJNRU]$/;
    let singleFilter = /^Key[EFHTVYZ]$/;

    if (gFilters.some(r => r.test(e.code))) {
      addAnswer(["Ga", "Gb", "Gc", "Gd"][+e.code.slice(-1) - 1]);
    } else if (twoFilter.test(e.code)) {
      addAnswer(e.code.slice(-1) + (e.shiftKey ? "b" : "a"));
    } else if (singleFilter.test(e.code)) {
      addAnswer(e.code.slice(-1));
    }
  }

  function updateTexts() {
    TOP_FACE[0].label = $localLang.PLL.colorNeutral;
    TOP_FACE[1].label = $localLang.PLL.white;
    TOP_FACE[2].label = $localLang.PLL.yellow;
    TOP_FACE[3].label = $localLang.PLL.red;
    TOP_FACE[4].label = $localLang.PLL.orange;
    TOP_FACE[5].label = $localLang.PLL.blue;
    TOP_FACE[6].label = $localLang.PLL.green;

    columns = [
      "No.",
      $localLang.PLL.case,
      $localLang.PLL.expected,
      $localLang.PLL.answer,
      $localLang.PLL.time,
    ];
  }

  $: $localLang, updateTexts();
</script>

<svelte:window on:keyup={handleKeyUp} />

<Card
  class="flex flex-col relative items-center mt-4 max-w-2xl w-[calc(100%-2rem)] max-h-[calc(100svh-6rem)] mx-auto mb-8"
>
  <Heading class="text-center text-3xl mb-4 text-gray-300 font-bold">{$localLang.PLL.title}</Heading
  >

  {#if !$screen.isMobile}
    <Button
      color="dark"
      class="absolute right-4 top-4 w-6 h-6 rounded-full p-3.5 border border-gray-500"
      on:click={() => (showModal = true)}>?</Button
    >
  {/if}

  {#if stage === 0}
    <div class={"grid items-center mx-auto sm:grid-cols-2"}>
      <span class="my-2">{$localLang.PLL.topFace}</span>
      <Select items={TOP_FACE} label={e => e.label} bind:value={topFace} />

      <span class="mt-6 mb-2">{$localLang.PLL.cases}</span>
      <Select items={CASES} transform={e => e} bind:value={cases} />
    </div>

    <Button on:click={next} color="green" class="mt-2">{$localLang.PLL.next}</Button>
  {/if}

  {#if stage === 1}
    <h3>{$localLang.PLL.case} {idx + 1} / {cases}</h3>
    <PuzzleImage src={images[idx]} class={$screen.isMobile ? "!w-52 !h-52" : "!w-60 !h-60"} />

    <div
      class="answer-container grid gap-2 my-4 w-full max-w-2xl"
      class:isMobile={$screen.isMobile}
    >
      {#each filters as f}
        <button
          class="answer border border-gray-300 flex items-center justify-center outline-none rounded-md"
          class:isMobile={$screen.isMobile}
          class:right={f === caseName[idx] && showAnswer}
          class:wrong={f != caseName[idx] && f === lastAnswer && showAnswer}
          on:click={() => addAnswer(f)}>{f}</button
        >
      {/each}
    </div>
  {/if}

  {#if stage === 2}
    <div class="flex items-center text-gray-400 font-bold mb-8">
      <span class="mr-1">{$localLang.PLL.completed}: {correct} / {cases}</span>
      {#if correct === cases}
        <CheckIcon width="1.2rem" height="1.2rem" class="text-green-500" />
      {/if}
      <Button on:click={next} color="green" class="ml-12">{$localLang.PLL.tryAgain}</Button>
    </div>

    <Table shadow divClass="w-full relative overflow-x-auto">
      <TableHead>
        {#each columns as c, i}
          {#if ($screen.width < 640 && i) || $screen.width >= 640}
            <TableHeadCell padding="px-2 py-3">{c}</TableHeadCell>
          {/if}
        {/each}
      </TableHead>

      <TableBody>
        {#each bundle as b}
          <TableBodyRow>
            {#if $screen.width >= 640}
              <TableBodyCell
                tdClass="p-0 whitespace-nowrap font-medium text-center"
                class={b.expected === b.answer ? "!text-green-400" : ""}
              >
                {b.id}
              </TableBodyCell>
            {/if}

            <TableBodyCell tdClass="p-0 whitespace-nowrap font-medium text-center">
              <PuzzleImage src={b.img} class={$screen.isMobile ? "!w-28 !h-28" : "!w-36 !h-36"} />
            </TableBodyCell>

            <TableBodyCell
              tdClass="p-0 whitespace-nowrap font-medium text-center"
              class={b.expected === b.answer ? "!text-green-400" : ""}
            >
              {b.expected}
            </TableBodyCell>

            <TableBodyCell
              tdClass="p-0 whitespace-nowrap font-medium text-center"
              class={b.expected === b.answer ? "!text-green-400" : ""}
            >
              {b.answer}
            </TableBodyCell>

            <TableBodyCell
              tdClass="p-0 whitespace-nowrap font-medium text-center"
              class={b.expected === b.answer ? "!text-green-400" : ""}
            >
              {timer(b.time, true, true)}
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  {/if}
</Card>

<Modal
  class="max-w-[70ch] text-justify"
  bind:open={showModal}
  autoclose
  outsideclose
  title={$localLang.PLL.keyBindings}
>
  <div class="space-y-2">
    <Heading tag="h2" class="text-xl text-center dark:text-gray-300"
      >{$localLang.PLL.singleLetter}</Heading
    >
    <blockquote
      bind:innerHTML={$localLang.PLL.singleLetterBlock}
      contenteditable="false"
    ></blockquote>
  </div>

  <div class="space-y-2">
    <Heading tag="h2" class="text-xl text-center dark:text-gray-300"
      >{$localLang.PLL.twoVariant}</Heading
    >
    <blockquote
      bind:innerHTML={$localLang.PLL.twoVariantBlock}
      contenteditable="false"
    ></blockquote>
  </div>

  <div class="space-y-2">
    <Heading tag="h2" class="text-xl text-center dark:text-gray-300"
      >{$localLang.PLL.gPerms}</Heading
    >
    <blockquote bind:innerHTML={$localLang.PLL.gPermsBlock} contenteditable="false"></blockquote>
  </div>
</Modal>

<style lang="postcss">
  .grid {
    max-height: 30rem;
  }

  .answer-container {
    grid-template-columns: repeat(auto-fit, minmax(var(--minw, 3rem), 1fr));
  }

  .answer-container.isMobile {
    --minw: 2.4rem;
  }

  .answer.right {
    @apply border-green-400 text-green-400 shadow-green-400 shadow-md;
  }

  .answer.wrong {
    @apply border-red-400 text-red-400 shadow-red-400 shadow-md;
  }

  .answer {
    padding: 1rem;
  }

  .answer.isMobile {
    padding: 0.5rem;
  }

  blockquote {
    @apply border-l-4 border-l-primary-600 p-2 bg-black bg-opacity-20;
  }
</style>
