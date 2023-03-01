import { writable, type Writable } from 'svelte/store';

let globalLang: Writable<string> = writable('en-EN');

export { globalLang };