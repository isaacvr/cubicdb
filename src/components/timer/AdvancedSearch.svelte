<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { localLang } from "@stores/language.service";
  import { Button, Tooltip, Input, Heading } from "flowbite-svelte";
  import type { Solve } from "@interfaces";
  import { isBetween } from "@helpers/math";
  import moment, { type Moment } from "moment";
  import Select from "@components/material/Select.svelte";
  import AddIcon from "@icons/Plus.svelte";
  import AcceptIcon from "@icons/Check.svelte";
  import ClearIcon from "@icons/Broom.svelte";
  import DeleteIcon from "@icons/Delete.svelte";

  interface NormalFilter {
    field: keyof Solve;
    name: string;
    type: "string" | "number" | "date";
  }

  interface MapFilter {
    field: keyof Solve;
    name: string;
    type: "map";
    fn: (val: any) => string;
  }

  type SearchFilter = NormalFilter | MapFilter;

  interface InternalFilter {
    code: string;
    type: SearchFilter["type"];
    fn: (val: any, cmp: any, cmp1?: any) => boolean;
  }

  const dispatch = createEventDispatcher();

  export let fields: SearchFilter[] = [];
  export let filters: { field: SearchFilter; filter: InternalFilter; params: any }[] = [];

  const NUMBER_FILTER: InternalFilter[] = [
    { type: "number", code: "number_equal", fn: (n: number, m: number) => n === m },
    { type: "number", code: "number_nequal", fn: (n: number, m: number) => n !== m },
    { type: "number", code: "number_gt", fn: (n: number, m: number) => n > m },
    { type: "number", code: "number_gte", fn: (n: number, m: number) => n >= m },
    { type: "number", code: "number_lt", fn: (n: number, m: number) => n < m },
    { type: "number", code: "number_lte", fn: (n: number, m: number) => n <= m },
    {
      type: "number",
      code: "number_between",
      fn: (n: number, a: number, b: number) => isBetween(n, a, b),
    },
    {
      type: "number",
      code: "number_nbetween",
      fn: (n: number, a: number, b: number) => !isBetween(n, a, b),
    },
  ];

  const STRING_FILTER: InternalFilter[] = [
    { type: "string", code: "string_equal", fn: (n: string, m: string) => n === m },
    { type: "string", code: "string_nequal", fn: (n: string, m: string) => n !== m },
    { type: "string", code: "string_contain", fn: (n: string, m: string) => n.includes(m) },
    { type: "string", code: "string_starts", fn: (n: string, m: string) => n.startsWith(m) },
    { type: "string", code: "string_ends", fn: (n: string, m: string) => n.endsWith(m) },
  ];

  const DATE_FILTER: InternalFilter[] = [
    {
      type: "date",
      code: "date_equal",
      fn: (n: number, m: Moment) => moment(n).isSame(m, "days"),
    },
    {
      type: "date",
      code: "date_after",
      fn: (n: number, m: Moment) => moment(n).isAfter(m, "days"),
    },
    {
      type: "date",
      code: "date_after_eq",
      fn: (n: number, m: Moment) => moment(n).isSameOrAfter(m, "days"),
    },
    {
      type: "date",
      code: "date_before",
      fn: (n: number, m: Moment) => moment(n).isBefore(m, "days"),
    },
    {
      type: "date",
      code: "date_before_eq",
      fn: (n: number, m: Moment) => moment(n).isSameOrBefore(m, "days"),
    },
  ];

  function getFilter(type: SearchFilter["type"]) {
    if (!type) return [];

    if (type === "date") {
      return DATE_FILTER;
    } else if (type === "string") {
      return STRING_FILTER;
    } else if (type === "map") {
      return STRING_FILTER;
    }

    return NUMBER_FILTER;
  }

  function addFilter() {
    if (fields.length === 0) return;

    filters = [...filters, { field: fields[0], filter: getFilter(fields[0].type)[0], params: "" }];
  }

  function selectField(filter: (typeof filters)[number], f: SearchFilter) {
    filter.field = f;
    filter.filter = getFilter(f.type)[0];
  }

  function selectFilter(filter: (typeof filters)[number], f: InternalFilter) {
    filter.filter = f;
  }

  function applyFilters() {
    let res: ((s: Solve) => boolean)[] = filters.map(f => {
      let field = f.field;

      switch (field.type) {
        case "number": {
          return (s: Solve) => f.filter.fn(s[field.field], ~~f.params);
        }
        case "string": {
          return (s: Solve) => f.filter.fn(s[field.field], f.params);
        }
        case "date": {
          return (s: Solve) => f.filter.fn(s[field.field], moment(f.params));
        }
        case "map": {
          return (s: Solve) => f.filter.fn(field.fn(s[field.field]), f.params);
        }
      }
    });

    dispatch("filters", res);
  }

  function clearFilters() {
    filters = [];
    dispatch("filters", []);
  }

  onMount(() => {
    filters = filters.map(f => ({
      field: fields.find(fl => fl.field === f.field.field && fl.type === f.field.type)!,
      filter: [...NUMBER_FILTER, ...STRING_FILTER, ...DATE_FILTER].find(
        ft => ft.code === f.filter.code
      )!,
      params: f.params,
    }));
  });
</script>

<section class="grid">
  {#if filters.length === 0}
    <Heading tag="h2" class="text-2xl text-center">{$localLang.TIMER.addFilter}</Heading>
  {/if}

  <div class="grid gap-2 mb-8">
    {#each filters as filter, pos}
      {@const type = filter.field.type}

      <div class="flex gap-2 justify-center">
        <Button
          class="px-3"
          color="red"
          on:click={() => (filters = filters.filter((_, p) => p != pos))}
        >
          <DeleteIcon size="1rem" />
        </Button>
        <Select
          bind:value={filter.field}
          items={fields}
          transform={e => e}
          label={e => e.name}
          onChange={e => selectField(filter, e)}
        />
        <Select
          bind:value={filter.filter}
          items={getFilter(filter.field.type)}
          transform={e => e}
          label={e => e.code.split("_").slice(1).join("-")}
          onChange={e => selectFilter(filter, e)}
        />
        <Input
          bind:value={filter.params}
          type={type === "string" || type === "map" ? "text" : type}
          class="px-2 py-1 max-w-[10rem]"
        />
      </div>
    {/each}
  </div>

  <div class="flex flex-wrap gap-2 justify-center">
    <Button on:click={addFilter}><AddIcon size="1.2rem" /></Button>
    <Tooltip placement="bottom">{$localLang.TIMER.addFilter}</Tooltip>

    {#if filters.length > 0}
      <Button color="green" on:click={applyFilters}><AcceptIcon size="1.2rem" /></Button>
      <Tooltip placement="bottom">{$localLang.global.accept}</Tooltip>

      <Button color="yellow" on:click={clearFilters}><ClearIcon size="1.2rem" /></Button>
      <Tooltip placement="bottom">{$localLang.global.clear}</Tooltip>
    {/if}
  </div>
</section>
