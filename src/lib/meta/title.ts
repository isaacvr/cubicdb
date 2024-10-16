import type { Language } from "@interfaces";

export function getTitleMeta(pathname: string, lang: Language) {
  let arr = pathname.split("/").filter(s => s);

  const title = arr[0] ? lang.NAVBAR.routeMap(arr[0]) : "CubicDB";

  return {
    title,
    description: "",
  };
}
