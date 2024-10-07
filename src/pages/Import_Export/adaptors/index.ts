import { TwistyTimer } from "./TwistyTimer";
import { CSTimer } from "./CSTimer";
import { CubeDesk } from "./CubeDesk";
import { CubicDB } from "./CubicDB";

const Adaptors = [new TwistyTimer(), new CSTimer(), new CubeDesk(), new CubicDB()];

export default Adaptors;
