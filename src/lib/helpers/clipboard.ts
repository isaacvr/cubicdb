import { copyToClipboard } from "./strings";

export interface CopyTextOptions {
  normalizeHtmlBreaks?: boolean;
}

export function clipboardText(text: string, options: CopyTextOptions = {}) {
  return options.normalizeHtmlBreaks ? text.replaceAll("<br>", "\n") : text;
}

export function copyTextToClipboard(text: string, options: CopyTextOptions = {}) {
  return copyToClipboard(clipboardText(text, options));
}
