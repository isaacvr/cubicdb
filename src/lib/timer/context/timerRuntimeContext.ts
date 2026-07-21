import { createContext } from "svelte";
import type { TimerRuntime } from "../TimerCompositionRoot.svelte";

export const [getTimerRuntimeContext, setTimerRuntimeContext] = createContext<TimerRuntime>();
