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
  const excludedKeys: (keyof Theme)[] = ["name", "appFont", "timerFont", "id"];
  const excludedShadesKeys: (keyof Theme)[] = [
    "background",
    "backgroundLevel1",
    "backgroundLevel2",
    "backgroundLevel3",
  ];
  const t1 = transform ? transformTheme(t) : t;

  document.documentElement.style.setProperty(`--app-font`, t.appFont);
  document.documentElement.style.setProperty(`--timer-font`, t.timerFont);

  for (const [key, color] of Object.entries(t1)) {
    if (excludedKeys.includes(key as any)) continue;

    document.documentElement.style.setProperty(`--th-${key}`, color);

    if (excludedShadesKeys.includes(key as any)) continue;

    let c = new Color(color);
    let hsl = c.rgbToHSL();

    document.documentElement.style.setProperty(`--th-${key}-hue`, hsl[0] + "");
    document.documentElement.style.setProperty(`--th-${key}-sat`, hsl[1] + "%");

    for (let i = 1; i <= 9; i += 1) {
      let shade = i * 100;
      let perc = 105 - 10 * i;
      document.documentElement.style.setProperty(
        `--th-${key}-${shade}`,
        `hsl(var(--th-${key}-hue),var(--th-${key}-sat),${perc}%)`
      );
    }
  }
}

export function transformTheme(t: Theme): Theme {
  const excludedKeys: (keyof Theme)[] = ["name", "appFont", "timerFont"];
  const t1 = Object.assign({}, t) as Theme;

  for (const [key, value] of Object.entries(t)) {
    if (!excludedKeys.includes(key as any)) {
      (t1 as any)[key] = getTailwindColor(value);
    }
  }

  return t1;
}

export function applyThemeByID(id: string) {
  let currentTheme = THEME_LIST.find(th => th.id === id) || DEFAULT_THEME;
  applyTheme(currentTheme, true);
}
