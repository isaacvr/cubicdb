import { browser } from "$app/environment";
import type { Language, LanguageCode } from "@interfaces";
import { getLanguage } from "@lang/index";
import { derived, writable, type Writable, type Readable } from "svelte/store";

let globalLang: Writable<LanguageCode> = writable("EN");

let localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
  let res = getLanguage($lang);

  if (browser) {
    let html = document.querySelector("html");

    if (html) {
      html.setAttribute("lang", res.code.toLowerCase());
    }
  }

  set(res);
});

export { globalLang, localLang };
