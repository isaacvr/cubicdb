import type { Language, LanguageCode } from '@interfaces';
import { getLanguage } from '@lang/index';
import { derived, writable, type Writable, type Readable } from 'svelte/store';

let globalLang: Writable<LanguageCode> = writable('EN');

let localLang: Readable<Language> = derived(globalLang, ($lang, set) => {
  set( getLanguage( $lang ) );
});

export { globalLang, localLang };