import "./App.css";
import App from "./App.svelte";
import { DataService } from "@stores/data.service";

DataService.getInstance();

const app = new App({
  target: document.getElementById("app") || document.body,
});

export default app;
