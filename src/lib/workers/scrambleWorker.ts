// import { pScramble } from "@cstimer/scramble";
import * as all from "@cstimer/scramble";

interface SETTINGS {
  scrambles: number;
  extras: number;
  factor: number;
}

function f() {
  return "";
}

self.addEventListener("message", function (e) {
  const round = e.data[0];
  const md = e.data[1];
  const settings: SETTINGS = e.data[2] || { scrambles: 5, extras: 2, factor: 1 };
  const total = settings.scrambles + settings.extras;
  const name = e.data[3];

  const mode = md[1];
  const len = md[2];

  const batch: string[] = [];

  postMessage({
    type: "progress",
    mode: md,
    round,
    name,
    value: 0,
  });

  if (mode === "r3ni") {
    batch.push(
      ...((all.pScramble.scramblers.get(mode) || f).apply(null, [mode, total]) as string)
        .replace(/\\n/g, "<br>")
        .split("<br>")
        .map(s => s.trim().replace(/^\d+\)\s+/, ""))
    );
  } else {
    for (let i = 0; i < total; i += 1) {
      batch.push(
        ((all.pScramble.scramblers.get(mode) || f).apply(null, [mode, Math.abs(len)]) as string)
          .replace(/\\n/g, "<br>")
          .trim()
      );

      postMessage({
        type: "progress",
        mode: md,
        round,
        name,
        value: ((i + 1) * 100) / total,
      });
    }
  }

  postMessage({
    type: "done",
    mode: md,
    round,
    batch,
    name,
    settings,
  });
});

export {};
