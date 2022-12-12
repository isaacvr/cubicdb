import { Puzzle } from "@classes/puzzle/puzzle";
import { generateCubeBundle } from "@helpers/cube-draw";

onmessage = function(e) {
  const {
    // type,
    scramble,
    options
  } = e.data;

  console.time('fromSequence');
  let cb = Puzzle.fromSequence(scramble, options );
  console.timeEnd('fromSequence');

  let subscr = generateCubeBundle([cb], 500).subscribe((res) => {
    if ( res !== null ) {
      postMessage(res);
    } else {
      setTimeout(() => subscr());
    }
  });
}