import { readable, type Readable } from "svelte/store";
import { version as VV } from "../../package.json";

let version: Readable<string> = readable(VV);

export { version };
