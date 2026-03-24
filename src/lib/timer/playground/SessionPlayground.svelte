<script lang="ts">
  import { Heading, Button, Card } from "@lib/cubicdbKit";
  import { createSession, type SessionWithStats } from "./session/SessionTypes";
  import SessionManageTab from "./session/SessionManageTab.svelte";
  import SessionSettingsTab from "./session/SessionSettingsTab.svelte";
  import SessionStatsTab from "./session/SessionStatsTab.svelte";

  let activeTab = $state("manage");
  let sessions: SessionWithStats[] = $state([
    {
      _id: "session-1",
      name: "Speed Cubing",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      solveCount: 45,
      lastSolve: new Date(Date.now() - 1000 * 60),
      settings: { hasInspection: true, inspectionTime: 15000, mode: "normal", timerDisplay: "time" },
    },
    {
      _id: "session-2",
      name: "Relaxed Solving",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      solveCount: 12,
      settings: { hasInspection: false, inspectionTime: 0, mode: "zen", timerDisplay: "hide" },
    },
  ]);
  let activeSessionId: string | null = $state("session-1");

  let activeSession = $derived(sessions.find((s) => s._id === activeSessionId) ?? null);

  function addSession(name: string) {
    const s = createSession(name);
    sessions = [...sessions, s];
    if (!activeSessionId) activeSessionId = s._id;
  }

  function deleteSession(id: string) {
    sessions = sessions.filter((s) => s._id !== id);
    if (activeSessionId === id) {
      activeSessionId = sessions.length > 0 ? sessions[0]._id : null;
    }
  }

  function renameSession(id: string, name: string) {
    sessions = sessions.map((s) => (s._id === id ? { ...s, name } : s));
  }

  function duplicateSession(session: SessionWithStats) {
    const dup = createSession(`${session.name} (Copy)`);
    dup.settings = { ...session.settings };
    sessions = [...sessions, dup];
  }

  function updateSessionSetting(sessionId: string, setting: string, value: any) {
    sessions = sessions.map((s) =>
      s._id === sessionId ? { ...s, settings: { ...s.settings, [setting]: value } } : s
    );
  }

  function exportSessionConfig(session: SessionWithStats) {
    const data = { name: session.name, settings: session.settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-config-${session.name}-${Date.now()}.json`;
    a.click();
  }
</script>

<div class="p-6 space-y-6">
  <Heading tag="h1">Session Playground</Heading>

  <div class="tabs tabs-bordered">
    {#each [
      { id: "manage", label: "Manage Sessions" },
      { id: "settings", label: "Active Session Settings" },
      { id: "merge", label: "Merge Sessions" },
      { id: "stats", label: "Statistics" },
    ] as tab (tab.id)}
      <button
        class="tab {activeTab === tab.id ? 'tab-active' : ''}"
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === "manage"}
    <SessionManageTab
      {sessions}
      {activeSessionId}
      onAdd={addSession}
      onDelete={deleteSession}
      onSelect={(id) => (activeSessionId = id)}
      onRename={renameSession}
      onDuplicate={duplicateSession}
    />
  {:else if activeTab === "settings"}
    <SessionSettingsTab
      session={activeSession}
      onUpdateSetting={updateSessionSetting}
      onExportConfig={exportSessionConfig}
    />
  {:else if activeTab === "merge"}
    <Card title="Merge Sessions">
      <p class="mb-4 text-sm text-gray-600">
        Combine two sessions into one. This operation will transfer all solves from the source
        session to the target session.
      </p>
      <Button onclick={() => alert("Merge functionality: select source/target, resolve conflicts, transfer solves, delete source.")} class="w-full">
        Open Merge Dialog
      </Button>
    </Card>
  {:else if activeTab === "stats"}
    <SessionStatsTab {sessions} {activeSessionId} />
  {/if}
</div>
