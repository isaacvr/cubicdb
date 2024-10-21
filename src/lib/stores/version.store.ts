import { readable, type Readable } from "svelte/store";

let version: Readable<string> = readable(__VERSION__);

export { version };
