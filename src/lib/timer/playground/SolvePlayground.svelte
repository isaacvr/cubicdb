<script lang="ts">
  import { writable, derived, type Writable } from "svelte/store";
  import type { Solve } from "@lib/interfaces";
  import { Penalty } from "@lib/interfaces";
  import { timer as formatTimer } from "@lib/helpers/timer";
  import { Button, Input, Card, Heading, Tabs, TabItem } from "@lib/cubicdbKit";

  let activeTab = "add";

  // ==========================================
  // CASOS DE USO: SOLVES
  // ==========================================
  // 1. Agregar un solve
  // 2. Eliminar un solve
  // 3. Editar un solve (tiempo, penalidad, comentarios)
  // 4. Seleccionar/deseleccionar solves
  // 5. Aplicar penalizaciones (DNF, +2)
  // 6. Filtrar solves por penalización
  // 7. Ordenar solves (por tiempo, por fecha)
  // 8. Calcular estadísticas (mejor, peor, promedio)
  // 9. Buscar solves por comentarios/texto
  // 10. Exportar solves
  // ==========================================

  let solves: Writable<Solve[]> = writable([]);
  let selectedSolves: Writable<Set<string>> = writable(new Set());
  let filterPenalty: Writable<Penalty | null> = writable(null);
  let searchText: Writable<string> = writable("");
  let sortBy: Writable<"time" | "date" | "penalty"> = writable("date");

  // Derived stores
  let filteredSolves = derived(
    [solves, filterPenalty, searchText, sortBy],
    ([$solves, $filterPenalty, $searchText, $sortBy]) => {
      let result = $solves.filter((s) => {
        // Filtro por penalización
        if ($filterPenalty !== null && s.penalty !== $filterPenalty) {
          return false;
        }
        // Filtro por búsqueda
        if ($searchText && !s.comments?.toLowerCase().includes($searchText.toLowerCase())) {
          return false;
        }
        return true;
      });

      // Ordenamiento
      result.sort((a, b) => {
        switch ($sortBy) {
          case "time":
            return a.time - b.time;
          case "penalty":
            return a.penalty - b.penalty;
          case "date":
          default:
            return b.date - a.date;
        }
      });

      return result;
    }
  );

  let stats = derived(solves, ($solves) => {
    if ($solves.length === 0) {
      return { best: null, worst: null, avg: null, mean: null, total: 0 };
    }

    const cleanSolves = $solves.filter((s) => s.penalty !== Penalty.DNF);
    const times = cleanSolves.map((s) => s.time);

    if (cleanSolves.length === 0) {
      return { best: null, worst: null, avg: null, mean: null, total: $solves.length };
    }

    const best = Math.min(...times);
    const worst = Math.max(...times);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;

    // Ao5: promedio sin mejor y peor
    let avg = null;
    if (times.length >= 5) {
      const sorted = [...times].sort((a, b) => a - b);
      const middle = sorted.slice(1, -1);
      avg = middle.reduce((a, b) => a + b, 0) / middle.length;
    }

    return { best, worst, avg, mean, total: $solves.length };
  });

  // ==========================================
  // CASO 1: AGREGAR UN SOLVE
  // ==========================================
  let newTime = "";
  let newComments = "";
  let newPenalty: Penalty = Penalty.NONE;

  function addSolve() {
    if (!newTime) return;

    const time = parseInt(newTime, 10);
    if (isNaN(time) || time <= 0) return;

    const solve: Solve = {
      _id: `solve-${Date.now()}-${Math.random()}`,
      time,
      date: Date.now(),
      scramble: generateRandomScramble(),
      penalty: newPenalty,
      selected: false,
      session: "playground",
      comments: newComments,
      group: 0,
      mode: "333",
      len: 3,
    };

    solves.update((s) => [...s, solve]);
    newTime = "";
    newComments = "";
    newPenalty = Penalty.NONE;
  }

  // ==========================================
  // CASO 2: ELIMINAR UN SOLVE
  // ==========================================
  function deleteSolve(id: string) {
    solves.update((s) => s.filter((sv) => sv._id !== id));
    selectedSolves.update((selected) => {
      selected.delete(id);
      return selected;
    });
  }

  function deleteSelected() {
    const selected = Array.from($selectedSolves);
    solves.update((s) => s.filter((sv) => !selected.includes(sv._id!)));
    selectedSolves.set(new Set());
  }

  // ==========================================
  // CASO 3: EDITAR UN SOLVE
  // ==========================================
  let editingId: string | null = null;
  let editTime = "";
  let editComments = "";
  let editPenalty: Penalty = Penalty.NONE;

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

    solves.update((s) =>
      s.map((sv) => {
        if (sv._id === editingId) {
          return {
            ...sv,
            time,
            comments: editComments,
            penalty: editPenalty,
          };
        }
        return sv;
      })
    );

    editingId = null;
  }

  function cancelEdit() {
    editingId = null;
  }

  // ==========================================
  // CASO 4: SELECCIONAR/DESELECCIONAR
  // ==========================================
  function toggleSelect(id: string) {
    selectedSolves.update((s) => {
      const newSet = new Set(s);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function selectAll() {
    selectedSolves.set(new Set($solves.map((s) => s._id!)));
  }

  function deselectAll() {
    selectedSolves.set(new Set());
  }

  // ==========================================
  // CASO 5: APLICAR PENALIZACIONES
  // ==========================================
  function applyPenalty(id: string, penalty: Penalty) {
    solves.update((s) =>
      s.map((sv) => (sv._id === id ? { ...sv, penalty } : sv))
    );
  }

  function applyPenaltyToSelected(penalty: Penalty) {
    const selected = Array.from($selectedSolves);
    solves.update((s) =>
      s.map((sv) => (selected.includes(sv._id!) ? { ...sv, penalty } : sv))
    );
  }

  // ==========================================
  // HELPERS
  // ==========================================
  function generateRandomScramble(): string {
    const moves = ["R", "L", "U", "D", "F", "B"];
    const mods = ["", "'", "2"];
    let scramble = "";
    for (let i = 0; i < 20; i++) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      const mod = mods[Math.floor(Math.random() * mods.length)];
      scramble += move + mod + " ";
    }
    return scramble.trim();
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

  function exportSolves() {
    const data = JSON.stringify($solves, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solves-${Date.now()}.json`;
    a.click();
  }
</script>

<div class="p-6 space-y-6">
  <Heading tag="h1">Solve Playground - Test Cases</Heading>
  
  <div class="tabs tabs-bordered">
    <button
      class="tab {activeTab === 'add' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "add")}
    >
      Add Solve
    </button>
    <button
      class="tab {activeTab === 'list' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "list")}
    >
      List & Edit
    </button>
    <button
      class="tab {activeTab === 'stats' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "stats")}
    >
      Statistics
    </button>
    <button
      class="tab {activeTab === 'export' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "export")}
    >
      Export
    </button>
  </div>

  {#if activeTab === "add"}
    <Card title="Add New Solve">
      <div class="space-y-4">
        <Input
          placeholder="Time in milliseconds (e.g., 5000)"
          bind:value={newTime}
          type="number"
        />
        <Input
          placeholder="Comments..."
          bind:value={newComments}
        />
        <div class="flex gap-2">
          <button
            class="btn btn-primary"
            onclick={() => {
              newPenalty = Penalty.NONE;
            }}
          >
            No Penalty
          </button>
          <button
            class="btn btn-warning"
            onclick={() => {
              newPenalty = Penalty.P2;
            }}
          >
            +2
          </button>
          <button
            class="btn btn-error"
            onclick={() => {
              newPenalty = Penalty.DNF;
            }}
          >
            DNF
          </button>
        </div>
        <p class="text-sm text-gray-500">
          Current penalty: <strong>{getPenaltyLabel(newPenalty)}</strong>
        </p>
        <Button onclick={addSolve} class="w-full">Add Solve</Button>
      </div>
    </Card>
  {:else if activeTab === "list"}
    <Card title="Solves Management">
      <div class="space-y-4">
        <!-- Search and Filter -->
        <div class="flex gap-2 flex-wrap">
          <Input
            placeholder="Search by comments..."
            bind:value={$searchText}
            class="flex-1"
          />
          <select
            class="select select-bordered"
            value={$sortBy}
            onchange={(e) => sortBy.set(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="time">Sort by Time</option>
            <option value="penalty">Sort by Penalty</option>
          </select>
        </div>

        <!-- Selection Controls -->
        <div class="flex gap-2 flex-wrap">
          <Button onclick={selectAll} class="flex-1">Select All</Button>
          <Button onclick={deselectAll} class="flex-1">Deselect All</Button>
          {#if $selectedSolves.size > 0}
            <Button onclick={deleteSelected} class="flex-1 btn-error">
              Delete Selected ({$selectedSolves.size})
            </Button>
            <div class="dropdown dropdown-end">
              <button class="btn btn-sm">Apply Penalty</button>
              <ul class="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow">
                <li><button onclick={() => applyPenaltyToSelected(Penalty.NONE)}>Clean</button></li>
                <li><button onclick={() => applyPenaltyToSelected(Penalty.P2)}>+2</button></li>
                <li><button onclick={() => applyPenaltyToSelected(Penalty.DNF)}>DNF</button></li>
              </ul>
            </div>
          {/if}
        </div>

        <!-- Solves List -->
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
              {#each $filteredSolves as solve (solve._id)}
                {#if editingId === solve._id}
                  <tr class="bg-blue-50">
                    <td>
                      <input
                        type="checkbox"
                        checked={$selectedSolves.has(solve._id!)}
                        onchange={() => {
                          toggleSelect(solve._id!);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        bind:value={editTime}
                        class="input input-sm"
                      />
                    </td>
                    <td>
                      <select bind:value={editPenalty} class="select select-sm">
                        <option value={Penalty.NONE}>Clean</option>
                        <option value={Penalty.P2}>+2</option>
                        <option value={Penalty.DNF}>DNF</option>
                      </select>
                    </td>
                    <td>{new Date(solve.date).toLocaleString()}</td>
                    <td>
                      <input
                        type="text"
                        bind:value={editComments}
                        class="input input-sm"
                      />
                    </td>
                    <td>
                      <div class="flex gap-1">
                        <button
                          class="btn btn-xs btn-success"
                          onclick={saveEdit}
                        >
                          Save
                        </button>
                        <button
                          class="btn btn-xs btn-error"
                          onclick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                {:else}
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        checked={$selectedSolves.has(solve._id!)}
                        onchange={() => {
                          toggleSelect(solve._id!);
                        }}
                      />
                    </td>
                    <td class="font-mono font-bold">{formatTimer(solve.time, true)}</td>
                    <td>
                      <span
                        class={`badge ${
                          solve.penalty === Penalty.DNF
                            ? "badge-error"
                            : solve.penalty === Penalty.P2
                              ? "badge-warning"
                              : "badge-success"
                        }`}
                      >
                        {getPenaltyLabel(solve.penalty)}
                      </span>
                    </td>
                    <td class="text-sm">{new Date(solve.date).toLocaleString()}</td>
                    <td class="text-sm max-w-xs truncate">{solve.comments || "-"}</td>
                    <td>
                      <div class="flex gap-1">
                        <button
                          class="btn btn-xs btn-info"
                          onclick={() => {
                            startEdit(solve);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          class="btn btn-xs btn-error"
                          onclick={() => {
                            deleteSolve(solve._id!);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>

        {#if $filteredSolves.length === 0}
          <p class="text-center text-gray-500">No solves found</p>
        {/if}
      </div>
    </Card>
  {:else if activeTab === "stats"}
    <Card title="Statistics">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div class="stat">
          <div class="stat-title">Total Solves</div>
          <div class="stat-value text-3xl">{$stats.total}</div>
        </div>

        {#if $stats.best !== null}
          <div class="stat">
            <div class="stat-title">Best</div>
            <div class="stat-value text-2xl text-success">
              {formatTimer($stats.best, true)}
            </div>
          </div>
        {/if}

        {#if $stats.worst !== null}
          <div class="stat">
            <div class="stat-title">Worst</div>
            <div class="stat-value text-2xl text-error">
              {formatTimer($stats.worst, true)}
            </div>
          </div>
        {/if}

        {#if $stats.mean !== null}
          <div class="stat">
            <div class="stat-title">Mean</div>
            <div class="stat-value text-2xl">
              {formatTimer($stats.mean, true)}
            </div>
          </div>
        {/if}

        {#if $stats.avg !== null}
          <div class="stat">
            <div class="stat-title">Ao5</div>
            <div class="stat-value text-2xl text-info">
              {formatTimer($stats.avg, true)}
            </div>
          </div>
        {/if}
      </div>
    </Card>

    <!-- Penalty Distribution -->
    <Card title="Penalty Distribution">
      <div class="space-y-2">
        <div>
          <p class="text-sm font-bold">Clean</p>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div
              class="bg-success h-4 rounded-full"
              style="width: {($solves
                .filter((s) => s.penalty === Penalty.NONE).length /
                Math.max($solves.length, 1)) *
                100}%"
            />
          </div>
        </div>
        <div>
          <p class="text-sm font-bold">+2</p>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div
              class="bg-warning h-4 rounded-full"
              style="width: {($solves
                .filter((s) => s.penalty === Penalty.P2).length /
                Math.max($solves.length, 1)) *
                100}%"
            />
          </div>
        </div>
        <div>
          <p class="text-sm font-bold">DNF</p>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div
              class="bg-error h-4 rounded-full"
              style="width: {($solves
                .filter((s) => s.penalty === Penalty.DNF).length /
                Math.max($solves.length, 1)) *
                100}%"
            />
          </div>
        </div>
      </div>
    </Card>
  {:else if activeTab === "export"}
    <Card title="Export Solves">
      <p class="mb-4 text-sm text-gray-600">
        Export all solves as JSON for backup or analysis
      </p>
      <Button onclick={exportSolves} class="w-full">Download JSON</Button>
    </Card>
  {/if}
</div>

<style>
  :global(body) {
    @apply bg-base-100;
  }
</style>
        <div class="space-y-4">
          <Input
            placeholder="Time in milliseconds (e.g., 5000)"
            bind:value={newTime}
            type="number"
          />
          <Input
            placeholder="Comments..."
            bind:value={newComments}
          />
          <div class="flex gap-2">
            <button
              class="btn btn-primary"
              onclick={() => applyPenalty("temp", Penalty.NONE)}
            >
              No Penalty
            </button>
            <button
              class="btn btn-warning"
              onclick={() => {
                newPenalty = Penalty.P2;
              }}
            >
              +2
            </button>
            <button
              class="btn btn-error"
              onclick={() => {
                newPenalty = Penalty.DNF;
              }}
            >
              DNF
            </button>
          </div>
          <p class="text-sm text-gray-500">
            Current penalty: <strong>{getPenaltyLabel(newPenalty)}</strong>
          </p>
          <Button onclick={addSolve} class="w-full">Add Solve</Button>
        </div>
      </Card>
    </TabItem>

    <TabItem title="List & Edit">
      <Card title="Solves Management">
        <div class="space-y-4">
          <!-- Search and Filter -->
          <div class="flex gap-2 flex-wrap">
            <Input
              placeholder="Search by comments..."
              bind:value={$searchText}
              class="flex-1"
            />
            <Dropdown trigger="Sort By">
              <DropdownItem
                onclick={() => {
                  sortBy.set("date");
                }}
              >
                By Date
              </DropdownItem>
              <DropdownItem
                onclick={() => {
                  sortBy.set("time");
                }}
              >
                By Time
              </DropdownItem>
              <DropdownItem
                onclick={() => {
                  sortBy.set("penalty");
                }}
              >
                By Penalty
              </DropdownItem>
            </Dropdown>
          </div>

          <!-- Selection Controls -->
          <div class="flex gap-2 flex-wrap">
            <Button onclick={selectAll} class="flex-1">Select All</Button>
            <Button onclick={deselectAll} class="flex-1">Deselect All</Button>
            {#if $selectedSolves.size > 0}
              <Button onclick={deleteSelected} class="flex-1 btn-error">
                Delete Selected ({$selectedSolves.size})
              </Button>
              <Dropdown trigger="Apply Penalty">
                <DropdownItem
                  onclick={() => {
                    applyPenaltyToSelected(Penalty.NONE);
                  }}
                >
                  Clean
                </DropdownItem>
                <DropdownItem
                  onclick={() => {
                    applyPenaltyToSelected(Penalty.P2);
                  }}
                >
                  +2
                </DropdownItem>
                <DropdownItem
                  onclick={() => {
                    applyPenaltyToSelected(Penalty.DNF);
                  }}
                >
                  DNF
                </DropdownItem>
              </Dropdown>
            {/if}
          </div>

          <!-- Solves List -->
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
                {#each $filteredSolves as solve (solve._id)}
                  {#if editingId === solve._id}
                    <tr class="bg-blue-50">
                      <td>
                        <input
                          type="checkbox"
                          checked={$selectedSolves.has(solve._id!)}
                          onchange={() => {
                            toggleSelect(solve._id!);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          bind:value={editTime}
                          class="input input-sm"
                        />
                      </td>
                      <td>
                        <select bind:value={editPenalty} class="select select-sm">
                          <option value={Penalty.NONE}>Clean</option>
                          <option value={Penalty.P2}>+2</option>
                          <option value={Penalty.DNF}>DNF</option>
                        </select>
                      </td>
                      <td>{new Date(solve.date).toLocaleString()}</td>
                      <td>
                        <input
                          type="text"
                          bind:value={editComments}
                          class="input input-sm"
                        />
                      </td>
                      <td>
                        <div class="flex gap-1">
                          <button
                            class="btn btn-xs btn-success"
                            onclick={saveEdit}
                          >
                            Save
                          </button>
                          <button
                            class="btn btn-xs btn-error"
                            onclick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  {:else}
                    <tr>
                      <td>
                        <input
                          type="checkbox"
                          checked={$selectedSolves.has(solve._id!)}
                          onchange={() => {
                            toggleSelect(solve._id!);
                          }}
                        />
                      </td>
                      <td class="font-mono font-bold">{formatTimer(solve.time, true)}</td>
                      <td>
                        <span
                          class={`badge ${
                            solve.penalty === Penalty.DNF
                              ? "badge-error"
                              : solve.penalty === Penalty.P2
                                ? "badge-warning"
                                : "badge-success"
                          }`}
                        >
                          {getPenaltyLabel(solve.penalty)}
                        </span>
                      </td>
                      <td class="text-sm">{new Date(solve.date).toLocaleString()}</td>
                      <td class="text-sm max-w-xs truncate">{solve.comments || "-"}</td>
                      <td>
                        <div class="flex gap-1">
                          <button
                            class="btn btn-xs btn-info"
                            onclick={() => {
                              startEdit(solve);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            class="btn btn-xs btn-error"
                            onclick={() => {
                              deleteSolve(solve._id!);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>

          {#if $filteredSolves.length === 0}
            <p class="text-center text-gray-500">No solves found</p>
          {/if}
        </div>
      </Card>
    </TabItem>

    <TabItem title="Statistics">
      <Card title="Statistics">
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div class="stat">
            <div class="stat-title">Total Solves</div>
            <div class="stat-value text-3xl">{$stats.total}</div>
          </div>

          {#if $stats.best !== null}
            <div class="stat">
              <div class="stat-title">Best</div>
              <div class="stat-value text-2xl text-success">
                {formatTimer($stats.best, true)}
              </div>
            </div>
          {/if}

          {#if $stats.worst !== null}
            <div class="stat">
              <div class="stat-title">Worst</div>
              <div class="stat-value text-2xl text-error">
                {formatTimer($stats.worst, true)}
              </div>
            </div>
          {/if}

          {#if $stats.mean !== null}
            <div class="stat">
              <div class="stat-title">Mean</div>
              <div class="stat-value text-2xl">
                {formatTimer($stats.mean, true)}
              </div>
            </div>
          {/if}

          {#if $stats.avg !== null}
            <div class="stat">
              <div class="stat-title">Ao5</div>
              <div class="stat-value text-2xl text-info">
                {formatTimer($stats.avg, true)}
              </div>
            </div>
          {/if}
        </div>
      </Card>

      <!-- Penalty Distribution -->
      <Card title="Penalty Distribution">
        <div class="space-y-2">
          <div>
            <p class="text-sm font-bold">Clean</p>
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div
                class="bg-success h-4 rounded-full"
                style="width: {($solves
                  .filter((s) => s.penalty === Penalty.NONE).length /
                  Math.max($solves.length, 1)) *
                  100}%"
              />
            </div>
          </div>
          <div>
            <p class="text-sm font-bold">+2</p>
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div
                class="bg-warning h-4 rounded-full"
                style="width: {($solves
                  .filter((s) => s.penalty === Penalty.P2).length /
                  Math.max($solves.length, 1)) *
                  100}%"
              />
            </div>
          </div>
          <div>
            <p class="text-sm font-bold">DNF</p>
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div
                class="bg-error h-4 rounded-full"
                style="width: {($solves
                  .filter((s) => s.penalty === Penalty.DNF).length /
                  Math.max($solves.length, 1)) *
                  100}%"
              />
            </div>
          </div>
        </div>
      </Card>
    </TabItem>

    <TabItem title="Export">
      <Card title="Export Solves">
        <p class="mb-4 text-sm text-gray-600">
          Export all solves as JSON for backup or analysis
        </p>
        <Button onclick={exportSolves} class="w-full">Download JSON</Button>
      </Card>
    </TabItem>
  </Tabs>
</div>

<style>
  :global(body) {
    @apply bg-base-100;
  }
</style>