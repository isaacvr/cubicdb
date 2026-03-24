<script lang="ts">
  import { Button, Input, Card } from "@lib/cubicdbKit";
  import type { SessionWithStats } from "./SessionTypes";

  interface Props {
    sessions: SessionWithStats[];
    activeSessionId: string | null;
    onAdd: (name: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDuplicate: (session: SessionWithStats) => void;
  }

  let {
    sessions,
    activeSessionId,
    onAdd,
    onDelete,
    onSelect,
    onRename,
    onDuplicate,
  }: Props = $props();

  let newSessionName = $state("");
  let editingId: string | null = $state(null);
  let editingName = $state("");

  function handleAdd() {
    if (!newSessionName.trim()) return;
    onAdd(newSessionName);
    newSessionName = "";
  }

  function startEdit(session: SessionWithStats) {
    editingId = session._id;
    editingName = session.name;
  }

  function saveEdit() {
    if (!editingId || !editingName.trim()) return;
    onRename(editingId, editingName);
    editingId = null;
  }

  function cancelEdit() {
    editingId = null;
  }
</script>

<Card title="Session Management">
  <div class="space-y-4">
    <div class="card bg-base-200">
      <div class="card-body space-y-3">
        <h3 class="card-title text-lg">Create New Session</h3>
        <div class="flex gap-2">
          <Input placeholder="Session name..." bind:value={newSessionName} class="flex-1" />
          <Button onclick={handleAdd}>Create</Button>
        </div>
      </div>
    </div>

    <div class="space-y-2">
      {#each sessions as session (session._id)}
        <div class="card {activeSessionId === session._id ? 'bg-primary text-primary-content' : 'bg-base-200'}">
          <div class="card-body p-4">
            {#if editingId === session._id}
              <div class="flex gap-2">
                <Input bind:value={editingName} class="flex-1" />
                <Button onclick={saveEdit} class="btn-sm">Save</Button>
                <Button onclick={cancelEdit} class="btn-sm btn-ghost">Cancel</Button>
              </div>
            {:else}
              <div class="flex justify-between items-center">
                <div class="flex-1">
                  <h4 class="font-bold text-lg">{session.name}</h4>
                  <p class="text-sm opacity-75">
                    {session.solveCount} solves - Created {session.createdAt.toLocaleDateString()}
                  </p>
                  {#if session.lastSolve}
                    <p class="text-sm opacity-75">Last solve: {session.lastSolve.toLocaleTimeString()}</p>
                  {/if}
                </div>
                <div class="flex gap-1 flex-wrap justify-end">
                  {#if activeSessionId !== session._id}
                    <Button onclick={() => onSelect(session._id)} class="btn-sm btn-outline">Select</Button>
                  {/if}
                  <Button onclick={() => startEdit(session)} class="btn-sm btn-info">Rename</Button>
                  <Button onclick={() => onDuplicate(session)} class="btn-sm btn-warning">Duplicate</Button>
                  <Button onclick={() => onDelete(session._id)} class="btn-sm btn-error">Delete</Button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    {#if sessions.length === 0}
      <p class="text-center text-gray-500 py-8">No sessions created yet</p>
    {/if}
  </div>
</Card>
