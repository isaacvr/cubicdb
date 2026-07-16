<script lang="ts">
  import { tick } from "svelte";
  import { logger } from "$lib/logger/singleton";
  import type { LogEntry } from "$lib/logger/types";
  import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Ban,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    CircleCheck,
    Copy,
    Expand,
    Hourglass,
    ListTree,
    Minimize2,
    Play,
    Radio,
    Square,
    Timer,
    Trash2,
    TriangleAlert,
    Unplug,
    X,
    Zap,
  } from "lucide-svelte";

  let isOpen = $state(false);
  let logs: LogEntry[] = $state([]);
  let expandedKeys: string[] = $state([]);
  let autoScroll = $state(true);
  let filter = $state("event");
  let logList: HTMLDivElement | null = $state(null);
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function logKey(log: LogEntry, index: number): string {
    return String(log.data?.id ?? `${log.timestamp}-${index}`);
  }

  function isExpanded(key: string): boolean {
    return expandedKeys.includes(key);
  }

  function setExpanded(key: string, expanded: boolean) {
    expandedKeys = expanded
      ? [...new Set([...expandedKeys, key])]
      : expandedKeys.filter(value => value !== key);
  }

  function expandAll() {
    expandedKeys = logs.map(logKey);
  }

  function collapseAll() {
    expandedKeys = [];
  }

  async function refreshLogs() {
    if (!isOpen) return;
    const previousLastKey = logs.length > 0 ? logKey(logs.at(-1)!, logs.length - 1) : null;
    const nextLogs = logger.getLogsByCategory(filter);
    const nextLastKey = nextLogs.length > 0
      ? logKey(nextLogs.at(-1)!, nextLogs.length - 1)
      : null;
    const hasNewLogs = logs.length !== nextLogs.length || previousLastKey !== nextLastKey;
    logs = nextLogs;
    expandedKeys = expandedKeys.filter(key => logs.some((log, index) => logKey(log, index) === key));
    if (!autoScroll || !hasNewLogs) return;
    await tick();
    logList?.scrollTo({ top: logList.scrollHeight });
  }

  $effect.pre(() => {
    refreshInterval = setInterval(() => void refreshLogs(), 100);
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) void refreshLogs();
  }

  function changeFilter(newFilter: string) {
    filter = newFilter;
    collapseAll();
    void refreshLogs();
  }

  function copyLogs() {
    const text = logs
      .map(log => {
        const data = log.data ? `\n${safeJson(log.data)}` : "";
        return `[${new Date(log.timestamp).toISOString()}] ${log.message}${data}`;
      })
      .join("\n");
    void navigator.clipboard.writeText(text);
  }

  function clearLogs() {
    logger.clearLogs();
    logs = [];
    collapseAll();
  }

  function exportLogs() {
    const json = logger.exportLogs("json");
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `events-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function safeJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }

  function eventVisual(type: string) {
    if (type.endsWith("keyboard-key-down")) {
      return { icon: ArrowDownToLine, color: "text-sky-400", label: "Key down" };
    }
    if (type.endsWith("keyboard-key-up")) {
      return { icon: ArrowUpFromLine, color: "text-cyan-300", label: "Key up" };
    }
    if (type.endsWith("run-started")) {
      return { icon: Play, color: "text-success", label: "Timer started" };
    }
    if (type.endsWith("run-stopped")) {
      return { icon: Square, color: "text-error", label: "Timer stopped" };
    }
    if (type.endsWith("run-cancelled")) {
      return { icon: Ban, color: "text-warning", label: "Timer cancelled" };
    }
    if (type.endsWith("prevention-entered")) {
      return { icon: Hourglass, color: "text-warning", label: "Prevention" };
    }
    if (type.endsWith("device.ready")) {
      return { icon: CircleCheck, color: "text-success", label: "Ready" };
    }
    if (type.endsWith("inspection-started")) {
      return { icon: Timer, color: "text-secondary", label: "Inspection" };
    }
    if (type.endsWith("penalty-applied") || type.endsWith("handler-failed")) {
      return { icon: TriangleAlert, color: "text-warning", label: "Warning" };
    }
    if (type.endsWith("catalog-updated")) {
      return { icon: ListTree, color: "text-info", label: "Device catalog" };
    }
    if (type.includes("active-change")) {
      return { icon: Zap, color: "text-primary", label: "Active device" };
    }
    if (type.includes("disconnect")) {
      return { icon: Unplug, color: "text-error", label: "Disconnected" };
    }
    return { icon: Radio, color: "text-base-content/60", label: "Event" };
  }
</script>

<div class="fixed bottom-4 right-4 z-50 pointer-events-auto">
  <button
    onclick={togglePanel}
    class="btn btn-sm btn-circle btn-outline bg-base-100"
    title="Event Debug Panel"
    aria-label="Toggle event debug panel"
  >
    {#if isOpen}
      <ChevronDown size={16} />
    {:else}
      <ChevronUp size={16} />
    {/if}
  </button>
</div>

{#if isOpen}
  <aside
    class="fixed top-12 right-4 bottom-16 z-40 w-[min(42rem,calc(100vw-2rem))]
      bg-base-300/95 rounded-lg shadow-xl border border-base-200 flex flex-col
      pointer-events-auto backdrop-blur-sm overflow-hidden"
    aria-label="Event Debug Panel"
  >
    <header class="flex items-center justify-between px-3 py-2 border-b border-base-200">
      <div class="flex items-center gap-2 min-w-0">
        <h3 class="font-semibold text-sm truncate">Event Console</h3>
        <span class="badge badge-sm">{logs.length}</span>
      </div>
      <button
        onclick={() => (isOpen = false)}
        class="btn btn-xs btn-ghost btn-circle"
        title="Close event console"
        aria-label="Close event console"
      >
        <X size={14} />
      </button>
    </header>

    <div class="flex flex-wrap items-center gap-2 p-2 border-b border-base-200 bg-base-200/80">
      <select
        bind:value={filter}
        onchange={event => changeFilter(event.currentTarget.value)}
        class="select select-xs select-bordered min-w-28 flex-1"
        aria-label="Log category"
      >
        <option value="event">Events</option>
        <option value="handler">Handlers</option>
        <option value="service">Services</option>
        <option value="reactor">Reactor</option>
        <option value="">All</option>
      </select>

      <label class="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap">
        <input type="checkbox" bind:checked={autoScroll} class="checkbox checkbox-xs" />
        Auto-scroll
      </label>
    </div>

    <div class="flex flex-wrap gap-1 p-2 border-b border-base-200 bg-base-200/80">
      <button onclick={expandAll} class="btn btn-xs btn-ghost gap-1" title="Expand all events">
        <Expand size={12} />
        Expand all
      </button>
      <button onclick={collapseAll} class="btn btn-xs btn-ghost gap-1" title="Collapse all events">
        <Minimize2 size={12} />
        Collapse all
      </button>
      <div class="grow"></div>
      <button onclick={copyLogs} class="btn btn-xs btn-ghost gap-1" title="Copy logs">
        <Copy size={12} />
        Copy
      </button>
      <button onclick={exportLogs} class="btn btn-xs btn-ghost" title="Export logs as JSON">
        Export
      </button>
      <button onclick={clearLogs} class="btn btn-xs btn-ghost gap-1" title="Clear logs">
        <Trash2 size={12} />
        Clear
      </button>
    </div>

    <div bind:this={logList} class="flex-1 overflow-y-auto bg-base-100 font-mono text-xs">
      {#if logs.length === 0}
        <div class="text-base-content/50 text-center py-8">No events logged</div>
      {:else}
        {#each logs as log, index (logKey(log, index))}
          {@const key = logKey(log, index)}
          {@const visual = eventVisual(log.message)}
          {@const Icon = visual.icon}
          <details
            open={isExpanded(key)}
            ontoggle={event => setExpanded(key, event.currentTarget.open)}
            class="group border-b border-base-300 open:bg-base-200/40"
          >
            <summary
              class="flex items-center gap-2 px-2 py-1.5
                cursor-pointer select-none hover:bg-base-200/60 [&::-webkit-details-marker]:hidden"
            >
              <ChevronRight
                size={13}
                class="text-base-content/40 transition-transform group-open:rotate-90"
              />
              <span class={visual.color} title={visual.label}>
                <Icon size={14} />
              </span>
              <span class="min-w-0 flex items-baseline gap-2">
                <time class="text-base-content/45 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </time>
                <span class="font-semibold text-base-content truncate" title={log.message}>
                  {log.message}
                </span>
              </span>
            </summary>

            <div class="border-t border-base-300 bg-base-300/35 px-4 py-3 text-base-content/80">
              {#if log.category === "event" && log.data?.id && typeof log.data.timestamp === "number"}
                <dl class="grid grid-cols-[max-content,minmax(0,1fr)] gap-x-4 gap-y-1">
                  <dt class="text-base-content/50">ID</dt>
                  <dd class="break-all select-text">{log.data.id}</dd>
                  <dt class="text-base-content/50">Timestamp</dt>
                  <dd class="select-text">{log.data.timestamp.toFixed(3)} ms</dd>
                  <dt class="text-base-content/50">Type</dt>
                  <dd class="break-all select-text">{log.data.type}</dd>
                  <dt class="text-base-content/50 pt-1">Payload</dt>
                  <dd class="min-w-0 pt-1">
                    <pre
                      class="max-h-80 overflow-auto rounded bg-neutral text-neutral-content
                        border border-base-content/15 p-2 text-[0.7rem] leading-relaxed select-text"
                    >{safeJson(log.data.payload)}</pre>
                  </dd>
                </dl>
              {:else if log.data}
                <pre
                  class="max-h-80 overflow-auto rounded bg-neutral text-neutral-content
                    border border-base-content/15 p-2 text-[0.7rem] leading-relaxed select-text"
                >{safeJson(log.data)}</pre>
              {/if}
              {#if log.stackTrace}
                <pre class="mt-2 overflow-auto text-error select-text">{log.stackTrace}</pre>
              {/if}
            </div>
          </details>
        {/each}
      {/if}
    </div>

    <footer class="text-xs text-base-content/50 px-3 py-1.5 border-t border-base-200 bg-base-200/80">
      Category: <strong>{filter || "all"}</strong> · Total: <strong>{logs.length}</strong>
    </footer>
  </aside>
{/if}
