import { readable, type Readable } from 'svelte/store';

// @ts-ignore
let version: Readable<string> = readable(VERSION);

export { version };