import { readable, type Readable } from "svelte/store";

const version: Readable<string> = readable(__VERSION__);

export { version };
