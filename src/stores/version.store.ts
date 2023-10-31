import { readable, type Readable } from 'svelte/store';

let version: Readable<string> = readable("2.0.0");

export { version };