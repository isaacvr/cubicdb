import { Color } from "@classes/Color";
import type { Theme } from "@interfaces";
import tailwindColors from "tailwindcss/colors";
import { THEME_LIST } from "./themes";
import { DEFAULT_THEME } from "./default";

function getTailwindColor(colorName: string): string {
  const [color, shade] = colorName.split("-");
  if (shade) {
    return (tailwindColors as any)[color]?.[shade] || colorName;
  }
  return (tailwindColors as any)[color] || colorName;
}

export function applyTheme(t: Theme, transform = true) {
  // const excludedShadesKeys: (keyof Theme["colors"])[] = [
  //   "background",
  //   "background1",
  //   "background2",
  //   "background3",
  // ];
  // const t1 = transform ? transformTheme(t) : t;
  // document.documentElement.style.setProperty(`--app-font`, t.meta.appFont);
  // document.documentElement.style.setProperty(`--timer-font`, t.meta.timerFont);
  // for (const [key, color] of Object.entries(t1.colors)) {
  //   const c = new Color(color);
  //   const hsl = c.rgbToHSL();
  //   document.documentElement.style.setProperty(`--th-${key}-hue`, hsl[0] + "");
  //   document.documentElement.style.setProperty(`--th-${key}-sat`, hsl[1] + "%");
  //   document.documentElement.style.setProperty(
  //     `--th-${key}`,
  //     `var(--th-${key}-hue),var(--th-${key}-sat),${hsl[2]}%`
  //   );
  //   if (excludedShadesKeys.includes(key as any)) continue;
  //   for (let i = 1; i <= 9; i += 1) {
  //     const shade = i * 100;
  //     const perc = 105 - 10 * i;
  //     document.documentElement.style.setProperty(
  //       `--th-${key}-${shade}`,
  //       `var(--th-${key}-hue),var(--th-${key}-sat),${perc}%`
  //     );
  //   }
  //   document.documentElement.style.setProperty(
  //     `--th-${key}-50`,
  //     `var(--th-${key}-hue),var(--th-${key}-sat),98%`
  //   );
  // }
}

// export function transformTheme(t: Theme): Theme {
// const t1 = Object.assign({}, t) as Theme;

// for (const [key, value] of Object.entries(t.colors)) {
//   (t1 as any)[key] = getTailwindColor(value);
// }

// return t1;
// }

export function applyThemeByID(id: string) {
  // const currentTheme = THEME_LIST.find(th => th.meta.id === id) || DEFAULT_THEME;
  // applyTheme(currentTheme, true);
}
