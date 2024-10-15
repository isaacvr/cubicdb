import { writable, type Writable } from "svelte/store";

let screen: Writable<{
  width: number;
  height: number;
  isMobile: boolean;
}> = writable({
  width: 0,
  height: 0,
  isMobile: false,
});

export { screen };
