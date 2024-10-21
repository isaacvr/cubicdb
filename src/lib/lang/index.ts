import type { Language, LanguageCode } from "@interfaces";
import { English } from "./en-EN";
import { Spanish } from "./es-ES";
import { Chinese } from "./zh-ZH";

export let LANGUAGES: [RegExp, Language, LanguageCode][] = [
  [/^en/i, English, "EN"],
  [/^es/i, Spanish, "ES"],
  [/^zh/i, Chinese, "ZH"],
];

export function getLanguage(lang: string): Language {
  for (let i = 0, maxi = LANGUAGES.length; i < maxi; i += 1) {
    if (LANGUAGES[i][0].test(lang)) {
      return LANGUAGES[i][1];
    }
  }

  return English;
}
