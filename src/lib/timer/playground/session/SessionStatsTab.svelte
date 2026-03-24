<script lang="ts">
  import { Card } from "@lib/cubicdbKit";
  import type { SessionWithStats } from "./SessionTypes";

  interface Props {
    sessions: SessionWithStats[];
    activeSessionId: string | null;
  }

  let { sessions, activeSessionId }: Props = $props();
</script>

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
        {#each sessions as session (session._id)}
          <tr class={activeSessionId === session._id ? "active" : ""}>
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
