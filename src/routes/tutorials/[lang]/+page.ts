import { redirect } from "@sveltejs/kit";

export function load() {
  throw redirect(300, "/tutorials");
}
