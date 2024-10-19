import { getLanguage } from "@lang";
import type { LayoutServerLoad } from "./$types";
import { getTitleMeta } from "$lib/meta/title";
import { globalLang } from "@stores/language.service";

export const load: LayoutServerLoad = ({ request, url }) => {
  const acceptLanguage = request.headers.get("accept-language");

  const languages = acceptLanguage ? acceptLanguage.split(",") : ["EN"];
  const preferredLanguage = languages[0]?.split(";")[0];

  let localLang = getLanguage(preferredLanguage);
  let titleMeta = getTitleMeta(url.pathname, localLang);

  return {
    title: titleMeta.title,
    description: titleMeta.description,
  };
};
