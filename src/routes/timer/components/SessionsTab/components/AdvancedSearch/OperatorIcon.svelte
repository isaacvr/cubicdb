<script lang="ts">
  import type { FILTER_OPERATOR } from "./adaptors/types";
  import EqualIcon from "@icons/Equal.svelte";
  import NEqualIcon from "@icons/NotEqualVariant.svelte";
  import ContainsIcon from "@icons/Contain.svelte";
  import StartsIcon from "@icons/ContainStart.svelte";
  import EndsIcon from "@icons/ContainEnd.svelte";
  import LessThanIcon from "@icons/LessThan.svelte";
  import LessThanEqualIcon from "@icons/LessThanOrEqual.svelte";
  import GreaterThanIcon from "@icons/GreaterThan.svelte";
  import GreaterThanEqualIcon from "@icons/GreaterThanOrEqual.svelte";
  import BetweenIcon from "@icons/CodeTags.svelte";
  import NBetweenIcon from "@icons/Xml.svelte";

  export let operator: FILTER_OPERATOR;
</script>

{#if operator === "date_after"}
  <GreaterThanIcon />
{:else if operator === "date_after_eq"}
  <GreaterThanEqualIcon />
{:else if operator === "date_before"}
  <LessThanIcon />
{:else if operator === "date_before_eq"}
  <LessThanEqualIcon />
{:else if operator === "date_equal"}
  <EqualIcon />
{:else if operator === "number_between"}
  <BetweenIcon />
{:else if operator === "number_equal"}
  <EqualIcon />
{:else if operator === "number_gt"}
  <GreaterThanIcon />
{:else if operator === "number_gte"}
  <GreaterThanEqualIcon />
{:else if operator === "number_lt"}
  <LessThanIcon />
{:else if operator === "number_lte"}
  <LessThanEqualIcon />
{:else if operator === "number_nbetween"}
  <NBetweenIcon />
{:else if operator === "number_nequal"}
  <NEqualIcon />
{:else if operator === "string_contain"}
  <ContainsIcon />
{:else if operator === "string_ends"}
  <EndsIcon />
{:else if operator === "string_equal"}
  <EqualIcon />
{:else if operator === "string_nequal"}
  <NEqualIcon />
{:else if operator === "string_starts"}
  <StartsIcon />
{/if}
