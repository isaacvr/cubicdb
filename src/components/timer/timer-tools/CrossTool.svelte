<script lang="ts">
  import { faceStr, rotIdx, solve_cross, solve_xcross, solve_xxcross } from "@cstimer/tools/cross";
  import { DIALOG_MODES, type TimerContext } from "@interfaces";
  import { TabItem, Tabs } from "flowbite-svelte";

  export let context: TimerContext;

  const { scramble, mode } = context;

  let crosses: string[][] = [];
  let crossName: string[] = [];

  function updateCross(scr: string, md: string) {
    if (DIALOG_MODES.indexOf(md) > -1) {
      let cross = solve_cross(scr).map(e => e.map(e1 => e1.trim()).join(" "));
      let xcross = cross.map((_, p) =>
        solve_xcross(scr, p)
          .map(e => e.trim())
          .join(" ")
      );
      let xxcross = cross.map((_, p) =>
        solve_xxcross(scr, p)
          .map(e => e.trim())
          .join(" ")
      );

      crosses = [cross, xcross, xxcross];
      crossName = ["Cross", "XCross", "XXCross"];
    } else {
      crosses = [];
      crossName = [];
    }
  }

  $: $scramble && updateCross($scramble, $mode[1]);
</script>

<div class="grid">
  <Tabs divider>
    {#each crosses as cr, pos}
      <TabItem
        open={pos === 0}
        title={crossName[pos]}
        activeClasses="text-yellow-500 p-4 border-b-2 border-b-yellow-500"
      >
        <table class="w-full">
          {#each cr as c, pos}
            <tr>
              <td>{faceStr[pos]} {rotIdx[pos] ? "(" + rotIdx[pos] + ")" : ""}</td>
              <td>{c}</td>
            </tr>
          {/each}
        </table>
      </TabItem>
    {/each}
  </Tabs>
</div>
