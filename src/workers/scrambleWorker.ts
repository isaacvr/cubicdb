import * as all from '@cstimer/scramble';

onmessage = function(e) {
  let mode = e.data[0];
  let len = e.data[1];
  let cant = e.data[2] || 1;

  let batch = [];

  postMessage({
    type: "progress",
    mode,
    value: 0
  });

  for (let i = 0; i < cant; i += 1) {
    batch.push( all.pScramble.scramblers.get(mode)?.apply(null, [
      mode, Math.abs( len )
    ]).replace(/\\n/g, '<br>').trim());

    postMessage({
      type: "progress",
      mode,
      value: (i + 1) * 100 / cant
    });
  }

  postMessage({
    type: "done",
    mode,
    batch
  });
};

export {};