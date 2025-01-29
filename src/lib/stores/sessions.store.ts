import type { Session } from "@interfaces";
import { writable, type Writable } from "svelte/store";

let sessions: Writable<Session[]> = writable([]);

export { sessions };
