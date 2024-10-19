import type { Language } from "@interfaces";

export function getTitleMeta(pathname: string, lang: Language) {
  let arr = pathname.split("/").filter(s => s);
  let rm = lang.NAVBAR.routeMap(arr[0]);
  const title = arr[0] ? rm[0] : "CubicDB";
  const description = arr[0] ? rm[1] : "Cubing with fun";

  return {
    title,
    description,
  };
}
