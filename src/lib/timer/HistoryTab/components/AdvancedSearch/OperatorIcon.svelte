<script lang="ts">
  import type { FILTER_OPERATOR } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import {
    BracketsIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CodeIcon,
    EqualIcon,
    EqualNotIcon,
    Icon,
    ListEndIcon,
    ListStartIcon,
  } from "lucide-svelte";

  export let operator: FILTER_OPERATOR;
</script>

{#if operator === "date_after"}
  <ChevronRightIcon />
{:else if operator === "date_after_eq"}
  <Icon iconNode={[["path", { d: "m9 18 6-6-6-6 m1 16 6-6" }]]} />
{:else if operator === "date_before"}
  <ChevronLeftIcon />
{:else if operator === "date_before_eq"}
  <Icon iconNode={[["path", { d: "m15 18-6-6 6-6 m-1 16 -6-6" }]]} />
{:else if operator === "date_equal"}
  <EqualIcon />
{:else if operator === "number_between"}
  <BracketsIcon />
{:else if operator === "number_equal"}
  <EqualIcon />
{:else if operator === "number_gt"}
  <ChevronRightIcon />
{:else if operator === "number_gte"}
  <Icon iconNode={[["path", { d: "m9 18 6-6-6-6 m1 16 6-6" }]]} />
{:else if operator === "number_lt"}
  <ChevronLeftIcon />
{:else if operator === "number_lte"}
  <Icon iconNode={[["path", { d: "m15 18-6-6 6-6 m-1 16 -6-6" }]]} />
{:else if operator === "number_nbetween"}
  <CodeIcon />
{:else if operator === "number_nequal"}
  <EqualNotIcon />
{:else if operator === "string_contain"}
  <BracketsIcon />
{:else if operator === "string_ends"}
  <ListEndIcon />
{:else if operator === "string_equal"}
  <EqualIcon />
{:else if operator === "string_nequal"}
  <EqualNotIcon />
{:else if operator === "string_starts"}
  <ListStartIcon />
{/if}
