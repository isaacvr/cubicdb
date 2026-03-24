<script lang="ts">
  import { Button, Card } from "@lib/cubicdbKit";
  import type { SessionWithStats } from "./SessionTypes";

  interface Props {
    session: SessionWithStats | null;
    onUpdateSetting: (sessionId: string, setting: string, value: any) => void;
    onExportConfig: (session: SessionWithStats) => void;
  }

  let { session, onUpdateSetting, onExportConfig }: Props = $props();
</script>

{#if session}
  <Card title="Settings for '{session.name}'">
    <div class="space-y-4">
      <div class="form-control">
        <label class="label"><span class="label-text">Timer Display Mode</span></label>
        <select
          class="select select-bordered"
          value={session.settings.timerDisplay || "time"}
          onchange={(e: Event) => onUpdateSetting(session._id, "timerDisplay", (e.target as HTMLSelectElement).value)}
        >
          <option value="time">Show Time</option>
          <option value="hide">Hide Timer</option>
          <option value="minimal">Minimal Display</option>
        </select>
      </div>

      <div class="form-control">
        <label class="label"><span class="label-text">Input Method</span></label>
        <select
          class="select select-bordered"
          value={session.settings.mode || "normal"}
          onchange={(e: Event) => onUpdateSetting(session._id, "mode", (e.target as HTMLSelectElement).value)}
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
            checked={session.settings.hasInspection}
            onchange={(e: Event) => onUpdateSetting(session._id, "hasInspection", (e.target as HTMLInputElement).checked)}
          />
        </label>
      </div>

      {#if session.settings.hasInspection}
        <div class="form-control">
          <label class="label"><span class="label-text">Inspection Time (seconds)</span></label>
          <input
            type="number"
            class="input input-bordered"
            min="0"
            step="1"
            value={(session.settings.inspectionTime || 15000) / 1000}
            onchange={(e: Event) => onUpdateSetting(session._id, "inspectionTime", parseInt((e.target as HTMLInputElement).value, 10) * 1000)}
          />
        </div>
      {/if}

      <div class="divider">Export Configuration</div>
      <Button onclick={() => onExportConfig(session)} class="w-full">Export Config</Button>
    </div>
  </Card>
{:else}
  <Card>
    <p class="text-center text-gray-500 py-8">Select a session to configure</p>
  </Card>
{/if}
