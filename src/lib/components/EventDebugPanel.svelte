<script lang="ts">
  import { logger } from "$lib/logger/singleton";
  import type { LogEntry } from "$lib/logger/types";
  import { ChevronDown, ChevronUp, X, Copy, Trash2 } from "lucide-svelte";

  let isOpen = $state(false);
  let logs: LogEntry[] = $state([]);
  let autoScroll = $state(true);
  let filter = $state("event");
  let refreshInterval: any;

  $effect.pre(() => {
    refreshInterval = setInterval(() => {
      if (isOpen) {
        logs = logger.getLogsByCategory(filter);
      }
    }, 100);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      logs = logger.getLogsByCategory(filter);
    }
  }

  function changeFilter(newFilter: string) {
    filter = newFilter;
    logs = logger.getLogsByCategory(filter);
  }

  function copyLogs() {
    const text = logs
      .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  function clearLogs() {
    logger.clearLogs();
    logs = [];
  }

  function exportLogs() {
    const json = logger.exportLogs("json");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<!-- Debug Panel Toggle Button (in nav bar area) -->
<div class="fixed bottom-4 right-4 z-50">
  <button
    onclick={togglePanel}
    class="btn btn-sm btn-circle btn-outline"
    title="Event Debug Panel"
  >
    {#if isOpen}
      <ChevronDown size={16} />
    {:else}
      <ChevronUp size={16} />
    {/if}
  </button>
</div>

<!-- Debug Panel Modal -->
{#if isOpen}
  <div class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onclick={() => (isOpen = false)}>
    <!-- Prevent click-through -->
  </div>

  <div
    class="fixed bottom-16 right-4 z-50 w-96 max-h-96 bg-base-300 rounded-lg shadow-xl border border-base-200 flex flex-col"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b border-base-200">
      <div class="flex items-center gap-2">
        <h3 class="font-bold text-sm">Event Debug Panel</h3>
        <span class="badge badge-sm">{logs.length}</span>
      </div>
      <button onclick={() => (isOpen = false)} class="btn btn-xs btn-ghost btn-circle">
        <X size={14} />
      </button>
    </div>

    <!-- Filter & Controls -->
    <div class="flex items-center gap-2 p-3 border-b border-base-200 bg-base-200">
      <select
        bind:value={filter}
        onchange={e => changeFilter(e.currentTarget.value)}
        class="select select-xs select-bordered flex-1"
      >
        <option value="event">Events</option>
        <option value="handler">Handlers</option>
        <option value="service">Services</option>
        <option value="reactor">Reactor</option>
        <option value="">All</option>
      </select>

      <label class="flex items-center gap-1 text-xs cursor-pointer">
        <input type="checkbox" bind:checked={autoScroll} class="checkbox checkbox-xs" />
        Auto-scroll
      </label>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2 p-2 border-b border-base-200 bg-base-200">
      <button
        onclick={copyLogs}
        class="btn btn-xs btn-outline btn-ghost gap-1 flex-1"
        title="Copy logs to clipboard"
      >
        <Copy size={12} />
        Copy
      </button>
      <button
        onclick={exportLogs}
        class="btn btn-xs btn-outline btn-ghost gap-1 flex-1"
        title="Export as JSON"
      >
        Export
      </button>
      <button
        onclick={clearLogs}
        class="btn btn-xs btn-outline btn-ghost gap-1 flex-1"
        title="Clear logs"
      >
        <Trash2 size={12} />
        Clear
      </button>
    </div>

    <!-- Log List -->
    <div class="flex-1 overflow-y-auto p-3 space-y-1 bg-base-100">
      {#if logs.length === 0}
        <div class="text-xs text-base-content/50 text-center py-4">No events logged</div>
      {:else}
        {#each logs as log (log.timestamp + Math.random())}
          <div class="text-xs font-mono text-base-content/70 hover:text-base-content/90 transition">
            <span class="text-base-content/50"
              >[{new Date(log.timestamp).toLocaleTimeString()}]</span
            >
            <span class="text-info ml-2">{log.message}</span>
            {#if log.data}
              <span class="text-base-content/40 ml-1">
                {JSON.stringify(log.data).substring(0, 50)}
                {#if JSON.stringify(log.data).length > 50}...{/if}
              </span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <div class="text-xs text-base-content/50 p-2 border-t border-base-200 bg-base-200">
      Category: <strong>{filter || "all"}</strong> • Total: <strong>{logs.length}</strong>
    </div>
  </div>
{/if}

<style>
  :global(.event-debug-panel) {
    --tw-ring-offset-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
</style>
