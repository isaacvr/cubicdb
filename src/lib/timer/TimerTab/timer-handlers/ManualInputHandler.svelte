<script lang="ts">
  import { timer, timerToMilli } from "@helpers/timer";
  import { Penalty, type InputContext, type TimerContext } from "@interfaces";

  interface ManualInputProps {
    inputContext: InputContext;
    context: TimerContext;
    battle?: boolean;
  }

  let {
    inputContext = $bindable(),
    context = $bindable(),
    battle = $bindable(false),
  }: ManualInputProps = $props();

  const { createNewSolve, addSolve } = inputContext;
  const { initScrambler } = context;

  const TIMER_DNF = /^\s*dnf\s*$/i;
  const TIMER_DIGITS = /^\d+\+?$/;

  let timeStr: string = $state("");

  function addTimeString() {
    if (!TIMER_DIGITS.test(timeStr) && !TIMER_DNF.test(timeStr)) {
      timeStr = "";
      return;
    }

    createNewSolve();

    if (TIMER_DIGITS.test(timeStr)) {
      let isP2 = timeStr.endsWith("+");
      addSolve(
        timerToMilli(Number(timeStr.slice(0, isP2 ? -1 : undefined))),
        isP2 ? Penalty.P2 : Penalty.NONE
      );
    } else if (TIMER_DNF.test(timeStr)) {
      addSolve(0, Penalty.DNF);
    }

    !battle && initScrambler();
    timeStr = "";
  }

  function validTimeStr(t: string): boolean {
    if (t.length > 10) return false;
    return TIMER_DIGITS.test(t) || TIMER_DNF.test(t) || t === "";
  }
</script>

<div id="manual-inp" class="grid max-w-[30rem]">
  {#if validTimeStr(timeStr)}
    <div class="text-xl w-full text-center tx-text">
      {timeStr.trim()
        ? TIMER_DNF.test(timeStr)
          ? timeStr.toUpperCase()
          : timer(timerToMilli(Number(timeStr)), true, true)
        : ""}

      {#if timeStr.endsWith("+")}
        <span class="text-error">+2</span>
      {/if}
    </div>
  {/if}

  <input
    type="text"
    bind:value={timeStr}
    onkeydown={e => {
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        addTimeString();
      }
    }}
    oninput={() => {
      timeStr = timeStr.replace(/[a-ceg-mo-z]/gi, "").replace(/[^dnf\d+]/gi, "");
    }}
    class="input w-full !h-full max-md:max-w-[18rem] mx-auto text-center
      text-7xl outline-none text-base-content {validTimeStr(timeStr)
      ? '!border-transparent border-2'
      : '!border-error border-2'}"
  />
</div>
