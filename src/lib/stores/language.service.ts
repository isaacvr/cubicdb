import { browser } from "$app/environment";
import type { Language, LanguageCode } from "@interfaces";
import { getLanguage } from "@lang/index";
import { derived, writable, type Writable, type Readable } from "svelte/store";

const globalLang: Writable<LanguageCode> = writable("EN");

const localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
  const res = getLanguage($lang);

  if (browser) {
    const html = document.querySelector("html");

    if (html) {
      html.setAttribute("lang", res.code.toLowerCase());
    }
  }

  set(res);
});

export { globalLang, localLang };
