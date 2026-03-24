import type { Session } from "@interfaces";
import { writable, type Writable } from "svelte/store";

const sessions: Writable<Session[]> = writable([]);

export { sessions };
