import { TwistyTimer } from "./TwistyTimer";
import { CSTimer } from "./CSTimer";
import { CubeDesk } from "./CubeDesk";
import { CubeDB } from "./CubeDB";

const Adaptors = [
  new TwistyTimer,
  new CSTimer,
  new CubeDesk,
  new CubeDB,
]

export default Adaptors;