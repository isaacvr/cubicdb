<script context="module" lang="ts">
  export interface Column {
    name: string;
    text: string;
  };
</script>

<script lang="ts">
  import Checkbox from "./Checkbox.svelte";
  let selectAll = false;
  let cl = '';
  export let title: string = '';
  export let columns: Column[] = [];
  export let rows: any[] = [];
  export let selection: boolean = false;
  export let map = (item?: any) => item;
  export { cl as class };

  let _rows: any[] = [];

  $: {
    rows.length > _rows.length && _rows.concat( (new Array(rows.length - _rows.length).fill( (new Array(columns.length).fill(false)) )) );
    rows.length < _rows.length && (_rows = _rows.slice(0, rows.length));
    _rows = rows.map((r, p) => [ (_rows[p] || [!1])[0], ...map(r) ]);
    console.log("_ROWS: ", _rows, rows);
    changeSingle();
  }

  function changeAll(ev) {
    let v = ev.detail.value;
    _rows = (new Array(_rows.length).fill(!!v));
  }

  function changeSingle() {
    selectAll = _rows.reduce((a, b) => a && b, !!_rows.length);
  }
</script>

<div class="wrapper {cl || ''}">
  <h2>{title}</h2>
  <table>
    <thead>
      <tr>
        {#if selection}<th><Checkbox bind:checked={ selectAll } on:change={changeAll}/></th>{/if}
        {#each columns as hd}
        <th>{hd.text}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each _rows as r}
      <tr class:selected={ r[0] }>
        {#each r as v, i}
          {#if i == 0}
            {#if selection} <td><Checkbox bind:checked={r[0]} on:change={changeSingle}/></td> {/if}
          {:else}
          <td>{v}</td>
          {/if}
        {/each}
      </tr>
      {/each}
    </tbody>
  </table>
</div>

<style lang="postcss">
  .wrapper {
    @apply w-full shadow p-2;
  }

  .wrapper h2 {
    @apply my-2;
  }

  table {
    @apply w-full text-left mt-4;
  }

  thead tr {
    @apply border-b border-b-gray-300 text-gray-400;
  }

  td, th {
    @apply p-2;
  }

  tbody tr:not(:last-of-type) {
    @apply border-b border-b-gray-300;
  }

  tbody tr:nth-child(even) {
    @apply bg-gray-500;
  }

  tbody tr:nth-child(odd) {
    @apply bg-gray-600;
  }

  tbody tr.selected {
    @apply bg-blue-300;
  }
</style>