import type { Language } from "@interfaces";

export function getTitleMeta(pathname: string, lang: Language) {
  const arr = pathname.split("/").filter(s => s);
  const rm = lang.NAVBAR.routeMap(arr[0]);
  const title = arr[0] ? rm[0] : "CubicDB";
  const description = arr[0] ? rm[1] : "Cubing with fun";

  return {
    title,
    description,
  };
}
