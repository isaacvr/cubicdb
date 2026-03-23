<script lang="ts">
  import { writable, derived, type Writable } from "svelte/store";
  import type { Session } from "@lib/interfaces";
  import { Button, Input, Card, Heading } from "@lib/cubicdbKit";

  let activeTab = "manage";

  // ==========================================
  // CASOS DE USO: SESIONES
  // ==========================================
  // 1. Crear una nueva sesión
  // 2. Renombrar una sesión
  // 3. Eliminar una sesión
  // 4. Seleccionar/cambiar sesión activa
  // 5. Configurar parámetros de sesión (inspección, input method)
  // 6. Obtener estadísticas por sesión
  // 7. Fusionar sesiones
  // 8. Duplicar sesión
  // 9. Importar/exportar configuración de sesión
  // 10. Ver histórico de cambios en sesión
  // ==========================================

  interface SessionWithStats extends Session {
    solveCount: number;
    lastSolve?: Date;
    createdAt: Date;
  }

  let sessions: Writable<SessionWithStats[]> = writable([]);
  let activeSessionId: Writable<string | null> = writable(null);
  let newSessionName: Writable<string> = writable("");
  let editingId: Writable<string | null> = writable(null);
  let editingName: Writable<string> = writable("");

  // Sample session template
  const createSession = (name: string): SessionWithStats => ({
    _id: `session-${Date.now()}-${Math.random()}`,
    name,
    createdAt: new Date(),
    solveCount: 0,
    settings: {
      hasInspection: true,
      inspectionTime: 15000,
      mode: "normal",
      timerDisplay: "time",
    },
  });

  let activeSessions = derived([sessions, activeSessionId], ([$sessions, $activeSessionId]) => {
    return $sessions.find((s) => s._id === $activeSessionId);
  });

  // ==========================================
  // CASO 1: CREAR SESIÓN
  // ==========================================
  function addSession() {
    if (!$newSessionName.trim()) return;

    const newSession = createSession($newSessionName);
    sessions.update((s) => [...s, newSession]);

    if (!$activeSessionId) {
      activeSessionId.set(newSession._id);
    }

    newSessionName.set("");
  }

  // ==========================================
  // CASO 2: RENOMBRAR
  // ==========================================
  function startEditSession(session: SessionWithStats) {
    editingId.set(session._id);
    editingName.set(session.name);
  }

  function saveEditSession() {
    if (!$editingId || !$editingName.trim()) return;

    sessions.update((s) =>
      s.map((session) => {
        if (session._id === $editingId) {
          return { ...session, name: $editingName };
        }
        return session;
      })
    );

    editingId.set(null);
  }

  function cancelEditSession() {
    editingId.set(null);
  }

  // ==========================================
  // CASO 3: ELIMINAR
  // ==========================================
  function deleteSession(id: string) {
    sessions.update((s) => s.filter((session) => session._id !== id));

    if ($activeSessionId === id) {
      const remaining = $sessions.filter((s) => s._id !== id);
      activeSessionId.set(remaining.length > 0 ? remaining[0]._id : null);
    }
  }

  // ==========================================
  // CASO 4: SELECCIONAR
  // ==========================================
  function selectSession(id: string) {
    activeSessionId.set(id);
  }

  // ==========================================
  // CASO 5: CONFIGURAR PARÁMETROS
  // ==========================================
  function updateSessionSetting(
    sessionId: string,
    setting: string,
    value: any
  ) {
    sessions.update((s) =>
      s.map((session) => {
        if (session._id === sessionId) {
          return {
            ...session,
            settings: {
              ...session.settings,
              [setting]: value,
            },
          };
        }
        return session;
      })
    );
  }

  // ==========================================
  // CASO 8: DUPLICAR SESIÓN
  // ==========================================
  function duplicateSession(session: SessionWithStats) {
    const duplicated = createSession(`${session.name} (Copy)`);
    duplicated.settings = { ...session.settings };

    sessions.update((s) => [...s, duplicated]);
  }

  // ==========================================
  // CASO 7: FUSIONAR SESIONES
  // ==========================================
  function mergeSessionsUI() {
    // This would open a modal to select which session to merge into which
    alert(
      'Merge functionality would allow combining two sessions. Implementation details:\n- Select source and target sessions\n- Choose how to handle conflicts (keep source, keep target, or ask)\n- Transfer all solves from source to target\n- Remove source session'
    );
  }

  // ==========================================
  // CASO 9: EXPORTAR CONFIGURACIÓN
  // ==========================================
  function exportSessionConfig(session: SessionWithStats) {
    const data = {
      name: session.name,
      settings: session.settings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-config-${session.name}-${Date.now()}.json`;
    a.click();
  }

  // ==========================================
  // CASO 10: HISTÓRICO (Simulado)
  // ==========================================
  interface SessionEvent {
    type: "created" | "renamed" | "settings_changed" | "solve_added";
    timestamp: Date;
    description: string;
  }

  let sessionHistory: Writable<SessionEvent[]> = writable([]);

  function addHistoryEvent(type: SessionEvent["type"], description: string) {
    sessionHistory.update((h) => [
      ...h,
      {
        type,
        timestamp: new Date(),
        description,
      },
    ]);
  }

  // Init with sample data
  sessions.set([
    {
      _id: "session-1",
      name: "Speed Cubing",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      solveCount: 45,
      lastSolve: new Date(Date.now() - 1000 * 60),
      settings: {
        hasInspection: true,
        inspectionTime: 15000,
        mode: "normal",
        timerDisplay: "time",
      },
    },
    {
      _id: "session-2",
      name: "Relaxed Solving",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      solveCount: 12,
      settings: {
        hasInspection: false,
        inspectionTime: 0,
        mode: "zen",
        timerDisplay: "hide",
      },
    },
  ]);

  activeSessionId.set("session-1");
</script>

<div class="p-6 space-y-6">
  <Heading tag="h1">Session Playground - Test Cases</Heading>

  <div class="tabs tabs-bordered">
    <button
      class="tab {activeTab === 'manage' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "manage")}
    >
      Manage Sessions
    </button>
    <button
      class="tab {activeTab === 'settings' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "settings")}
    >
      Active Session Settings
    </button>
    <button
      class="tab {activeTab === 'merge' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "merge")}
    >
      Merge Sessions
    </button>
    <button
      class="tab {activeTab === 'history' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "history")}
    >
      History
    </button>
    <button
      class="tab {activeTab === 'stats' ? 'tab-active' : ''}"
      onclick={() => (activeTab = "stats")}
    >
      Statistics
    </button>
  </div>

  {#if activeTab === "manage"}
    <Card title="Session Management">
        <div class="space-y-4">
          <!-- Create New Session -->
          <div class="card bg-base-200">
            <div class="card-body space-y-3">
              <h3 class="card-title text-lg">Create New Session</h3>
              <div class="flex gap-2">
                <Input
                  placeholder="Session name..."
                  bind:value={$newSessionName}
                  class="flex-1"
                />
                <Button onclick={addSession}>Create</Button>
              </div>
            </div>
          </div>

          <!-- Sessions List -->
          <div class="space-y-2">
            {#each $sessions as session (session._id)}
              <div
                class="card {$activeSessionId === session._id
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200'}"
              >
                <div class="card-body p-4">
                  {#if $editingId === session._id}
                    <div class="flex gap-2">
                      <Input
                        bind:value={$editingName}
                        class="flex-1"
                      />
                      <Button onclick={saveEditSession} class="btn-sm">Save</Button>
                      <Button onclick={cancelEditSession} class="btn-sm btn-ghost">Cancel</Button>
                    </div>
                  {:else}
                    <div class="flex justify-between items-center">
                      <div class="flex-1">
                        <h4 class="font-bold text-lg">{session.name}</h4>
                        <p class="text-sm opacity-75">
                          {session.solveCount} solves • Created {session.createdAt.toLocaleDateString()}
                        </p>
                        {#if session.lastSolve}
                          <p class="text-sm opacity-75">
                            Last solve: {session.lastSolve.toLocaleTimeString()}
                          </p>
                        {/if}
                      </div>

                      <div class="flex gap-1 flex-wrap justify-end">
                        {#if $activeSessionId !== session._id}
                          <Button
                            onclick={() => selectSession(session._id)}
                            class="btn-sm btn-outline"
                          >
                            Select
                          </Button>
                        {/if}
                        <Button
                          onclick={() => startEditSession(session)}
                          class="btn-sm btn-info"
                        >
                          Rename
                        </Button>
                        <Button
                          onclick={() => duplicateSession(session)}
                          class="btn-sm btn-warning"
                        >
                          Duplicate
                        </Button>
                        <Button
                          onclick={() => deleteSession(session._id)}
                          class="btn-sm btn-error"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

          {#if $sessions.length === 0}
            <p class="text-center text-gray-500 py-8">No sessions created yet</p>
          {/if}
        </div>
      </Card>
  {:else if activeTab === "settings"}
    {#if $activeSessions}
      <Card title="Settings for '{$activeSessions.name}'">
          <div class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Timer Display Mode</span>
              </label>
              <select
                class="select select-bordered"
                value={$activeSessions.settings.timerDisplay || "time"}
                onchange={(e) =>
                  updateSessionSetting($activeSessions._id, "timerDisplay", e.target.value)}
              >
                <option value="time">Show Time</option>
                <option value="hide">Hide Timer</option>
                <option value="minimal">Minimal Display</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Input Method</span>
              </label>
              <select
                class="select select-bordered"
                value={$activeSessions.settings.mode || "normal"}
                onchange={(e) =>
                  updateSessionSetting($activeSessions._id, "mode", e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="zen">Zen Mode</option>
                <option value="hide">Hide Mode</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer gap-3">
                <span class="label-text">Enable Inspection</span>
                <input
                  type="checkbox"
                  class="checkbox"
                  checked={$activeSessions.settings.hasInspection}
                  onchange={(e) =>
                    updateSessionSetting(
                      $activeSessions._id,
                      "hasInspection",
                      e.target.checked
                    )}
                />
              </label>
            </div>

            {#if $activeSessions.settings.hasInspection}
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Inspection Time (seconds)</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered"
                  min="0"
                  step="1"
                  value={($activeSessions.settings.inspectionTime || 15000) / 1000}
                  onchange={(e) =>
                    updateSessionSetting(
                      $activeSessions._id,
                      "inspectionTime",
                      parseInt(e.target.value, 10) * 1000
                    )}
                />
              </div>
            {/if}

            <div class="divider">Export Configuration</div>
            <Button
              onclick={() => exportSessionConfig($activeSessions)}
              class="w-full"
            >
              Export Config
            </Button>
          </div>
        </Card>
      {:else}
        <Card>
          <p class="text-center text-gray-500 py-8">Select a session to configure</p>
        </Card>
      {/if}
  {:else if activeTab === "merge"}
    <Card title="Merge Sessions">
      <p class="mb-4 text-sm text-gray-600">
          Combine two sessions into one. This operation will transfer all solves from the source
          session to the target session.
        </p>

        <Button onclick={mergeSessionsUI} class="w-full">
          Open Merge Dialog
      </Button>

      <div class="alert alert-info mt-4">
        <p class="text-sm">
            <strong>How it works:</strong>
            <br />
            1. Select source and target sessions<br />
            2. Choose conflict resolution strategy<br />
            3. All solves from source are moved to target<br />
            4. Source session is deleted
          </p>
        </div>
      </Card>
  {:else if activeTab === "history"}
    <Card title="Session Activity History">
        {#if $sessionHistory.length === 0}
          <p class="text-center text-gray-500 py-8">No history yet</p>
        {:else}
          <div class="space-y-2">
            {#each $sessionHistory as event, idx (idx)}
              <div class="timeline-item">
                <div class="timeline-marker badge badge-primary" />
                <div class="timeline-content">
                  <p class="font-bold">{event.description}</p>
                  <p class="text-sm opacity-75">
                    {event.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
  {:else if activeTab === "stats"}
    <Card title="Sessions Overview">
        <div class="overflow-x-auto">
          <table class="table w-full text-sm">
            <thead>
              <tr>
                <th>Session</th>
                <th>Solves</th>
                <th>Created</th>
                <th>Inspection</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {#each $sessions as session}
                <tr class={$activeSessionId === session._id ? "active" : ""}>
                  <td class="font-bold">{session.name}</td>
                  <td>{session.solveCount}</td>
                  <td>{session.createdAt.toLocaleDateString()}</td>
                  <td>{session.settings.hasInspection ? "✓" : "✗"}</td>
                  <td>{session.settings.mode}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card>
  {/if}
</div>