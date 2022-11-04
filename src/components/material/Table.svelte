<script lang="ts">
  interface Column {
    name: string;
    text: string;
  };

  import { onMount } from "svelte";
  import Checkbox from "./Checkbox.svelte";
  let selectAll = false;
  export let title: string = '';
  export let columns: Column[] = [];
  export let rows: any[] = [];
  let _rows: any[] = [];

  $: {
    rows.length > _rows.length && _rows.concat( (new Array(rows.length - _rows.length).fill(false)) );
    rows.length < _rows.length && (_rows = _rows.slice(0, rows.length));
    changeSingle();
  }

  onMount(() => { _rows = rows.map(() => false); });

  function changeAll(ev) {
    let v = ev.detail.value;
    _rows = (new Array(_rows.length).fill(!!v));
  }

  function changeSingle() {
    selectAll = _rows.reduce((a, b) => a && b, !!_rows.length);
  }
</script>

<div class="wrapper">
  <h2>{title}</h2>
  <table>
    <thead>
      <tr>
        <th><Checkbox bind:checked={ selectAll } on:change={changeAll}/></th>
        {#each columns as hd}
        <th>{hd.text}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      <tr class:selected={ _rows[0] }>
        <td><Checkbox bind:checked={_rows[0]} on:change={changeSingle}/></td>  
        <td>2</td>
        <td>3</td>
        <td>4</td>
      </tr>
      <!-- {#each _rows as r}
      <tr class:selected={ r[0] }>
        {#each r as v, i}
          {#if i == 0}
          <td><Checkbox bind:checked={r[0]} on:change={changeSingle}/></td>  
          {:else}
          <td>{v}</td>
          {/if}
        {/each}
      </tr>
      {/each} -->
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
    @apply border-b border-b-gray-300 text-gray-500;
  }

  td, th {
    @apply p-2;
  }

  tbody tr:not(:last-of-type) {
    @apply border-b border-b-gray-300;
  }

  tbody tr:nth-child(even) {
    @apply bg-gray-200;
  }

  tbody tr:nth-child(odd) {
    @apply bg-gray-300;
  }

  tbody tr.selected {
    @apply bg-blue-200;
  }
</style>