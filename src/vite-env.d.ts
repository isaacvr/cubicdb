/// <reference types="svelte" />
/// <reference types="vite/client" />
declare module "express";
declare module "electron-reload";
declare module "electron-squirrel-startup";
declare module "svelte-routing/src/history";
declare module "svelte-routing/src/contexts";

interface Transition {
  finished: Promise<void>;
}

declare interface Document {
  startViewTransition?: (callback: () => any) => Transition;
}
