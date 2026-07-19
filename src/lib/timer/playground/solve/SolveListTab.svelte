<script lang="ts">
  import type { Solve } from "@lib/interfaces";
  import { Penalty } from "@lib/interfaces";
  import { timer as formatTimer } from "@lib/helpers/timer";
  import { Button, Input, Card } from "@lib/cubicdbKit";

  interface Props {
    solves: Solve[];
    selectedIds: Set<string>;
    onDelete: (id: string) => void;
    onDeleteSelected: () => void;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onUpdate: (id: string, updates: Partial<Solve>) => void;
    onApplyPenaltyToSelected: (penalty: Penalty) => void;
    sortBy: "time" | "date" | "penalty";
    onSortChange: (sort: "time" | "date" | "penalty") => void;
    searchText: string;
    onSearchChange: (text: string) => void;
  }

  let {
    solves,
    selectedIds,
    onDelete,
    onDeleteSelected,
    onToggleSelect,
    onSelectAll,
    onDeselectAll,
    onUpdate,
    onApplyPenaltyToSelected,
    sortBy,
    onSortChange,
    searchText,
    onSearchChange,
  }: Props = $props();

  let editingId: string | null = $state(null);
  let editTime = $state("");
  let editComments = $state("");
  let editPenalty: Penalty = $state(Penalty.NONE);

  function startEdit(solve: Solve) {
    editingId = solve._id!;
    editTime = solve.time.toString();
    editComments = solve.comments || "";
    editPenalty = solve.penalty;
  }

  function saveEdit() {
    if (!editingId || !editTime) return;
    const time = parseInt(editTime, 10);
    if (isNaN(time) || time <= 0) return;

    onUpdate(editingId, { time, comments: editComments, penalty: editPenalty });
    editingId = null;
  }

  function cancelEdit() {
    editingId = null;
  }

  function getPenaltyLabel(penalty: Penalty): string {
    switch (penalty) {
      case Penalty.NONE:
        return "Clean";
      case Penalty.P2:
        return "+2";
      case Penalty.DNF:
        return "DNF";
      default:
        return "Unknown";
    }
  }
</script>

<Card title="Solves Management">
  <div class="space-y-4">
    <div class="flex gap-2 flex-wrap">
      <Input
        placeholder="Search by comments..."
        value={searchText}
        oninput={(e: Event) => onSearchChange((e.target as HTMLInputElement).value)}
        class="flex-1"
      />
      <select
        class="select select-bordered"
        value={sortBy}
        onchange={(e: Event) => onSortChange((e.target as HTMLSelectElement).value as any)}
      >
        <option value="date">Sort by Date</option>
        <option value="time">Sort by Time</option>
        <option value="penalty">Sort by Penalty</option>
      </select>
    </div>

    <div class="flex gap-2 flex-wrap">
      <Button onclick={onSelectAll} class="flex-1">Select All</Button>
      <Button onclick={onDeselectAll} class="flex-1">Deselect All</Button>
      {#if selectedIds.size > 0}
        <Button onclick={onDeleteSelected} type="danger" class="flex-1">
          Delete Selected ({selectedIds.size})
        </Button>
        <div class="dropdown dropdown-end">
          <Button size="sm">Apply Penalty</Button>
          <ul class="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow">
            <li><button onclick={() => onApplyPenaltyToSelected(Penalty.NONE)}>Clean</button></li>
            <li><button onclick={() => onApplyPenaltyToSelected(Penalty.P2)}>+2</button></li>
            <li><button onclick={() => onApplyPenaltyToSelected(Penalty.DNF)}>DNF</button></li>
          </ul>
        </div>
      {/if}
    </div>

    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Select</th>
            <th>Time</th>
            <th>Penalty</th>
            <th>Date</th>
            <th>Comments</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each solves as solve (solve._id)}
            {#if editingId === solve._id}
              <tr class="bg-blue-50">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(solve._id!)}
                    onchange={() => onToggleSelect(solve._id!)}
                  />
                </td>
                <td><input type="number" bind:value={editTime} class="input input-sm" /></td>
                <td>
                  <select bind:value={editPenalty} class="select select-sm">
                    <option value={Penalty.NONE}>Clean</option>
                    <option value={Penalty.P2}>+2</option>
                    <option value={Penalty.DNF}>DNF</option>
                  </select>
                </td>
                <td>{new Date(solve.date).toLocaleString()}</td>
                <td><input type="text" bind:value={editComments} class="input input-sm" /></td>
                <td>
                  <div class="flex gap-1">
                    <Button size="xs" type="success" onclick={saveEdit}>Save</Button>
                    <Button size="xs" type="danger" onclick={cancelEdit}>Cancel</Button>
                  </div>
                </td>
              </tr>
            {:else}
              <tr>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(solve._id!)}
                    onchange={() => onToggleSelect(solve._id!)}
                  />
                </td>
                <td class="font-mono font-bold">{formatTimer(solve.time, true)}</td>
                <td>
                  <span
                    class={`badge ${solve.penalty === Penalty.DNF ? "badge-error" : solve.penalty === Penalty.P2 ? "badge-warning" : "badge-success"}`}
                  >
                    {getPenaltyLabel(solve.penalty)}
                  </span>
                </td>
                <td class="text-sm">{new Date(solve.date).toLocaleString()}</td>
                <td class="text-sm max-w-xs truncate">{solve.comments || "-"}</td>
                <td>
                  <div class="flex gap-1">
                    <Button size="xs" type="info" onclick={() => startEdit(solve)}>Edit</Button>
                    <Button size="xs" type="danger" onclick={() => onDelete(solve._id!)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    {#if solves.length === 0}
      <p class="text-center text-gray-500">No solves found</p>
    {/if}
  </div>
</Card>
