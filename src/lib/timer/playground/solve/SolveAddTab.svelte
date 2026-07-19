<script lang="ts">
  import { Penalty } from "@lib/interfaces";
  import { Button, Input, Card } from "@lib/cubicdbKit";

  interface Props {
    onAdd: (time: number, penalty: Penalty, comments: string, scramble: string) => void;
  }

  let { onAdd }: Props = $props();

  let newTime = $state("");
  let newComments = $state("");
  let newPenalty: Penalty = $state(Penalty.NONE);

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

  function handleAdd() {
    if (!newTime) return;
    const time = parseInt(newTime, 10);
    if (isNaN(time) || time <= 0) return;

    onAdd(time, newPenalty, newComments, generateRandomScramble());
    newTime = "";
    newComments = "";
    newPenalty = Penalty.NONE;
  }
</script>

<Card title="Add New Solve">
  <div class="space-y-4">
    <Input placeholder="Time in milliseconds (e.g., 5000)" bind:value={newTime} type="number" />
    <Input placeholder="Comments..." bind:value={newComments} />
    <div class="flex gap-2">
      <Button
        onclick={() => {
          newPenalty = Penalty.NONE;
        }}
      >
        No Penalty
      </Button>
      <Button
        type="warning"
        onclick={() => {
          newPenalty = Penalty.P2;
        }}
      >
        +2
      </Button>
      <Button
        type="danger"
        onclick={() => {
          newPenalty = Penalty.DNF;
        }}
      >
        DNF
      </Button>
      <Button
        type="danger"
        onclick={() => {
          newPenalty = Penalty.DNS;
        }}
      >
        DNS
      </Button>
    </div>
    <p class="text-sm text-gray-500">
      Current penalty: <strong>{getPenaltyLabel(newPenalty)}</strong>
    </p>
    <Button onclick={handleAdd} class="w-full">Add Solve</Button>
  </div>
</Card>
