"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("swipo-theme", theme);
  } catch {
    // Stockage indisponible (navigation privée) : le thème reste appliqué pour cette visite.
  }
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    setTheme(readTheme());
    // Un autre onglet a changé de thème : on suit.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "swipo-theme" && (e.newValue === "light" || e.newValue === "dark")) {
        document.documentElement.dataset.theme = e.newValue;
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const choose = (t: Theme) => {
    applyTheme(t);
    setTheme(t);
  };
  return [theme, choose] as const;
}

/** Sélecteur « Clair / Sombre » de la barre latérale du gérant. */
export function ThemeSwitch() {
  const [theme, choose] = useTheme();
  const option = (value: Theme, label: string, Icon: typeof Sun) => (
    <button
      type="button"
      role="radio"
      aria-checked={theme === value}
      onClick={() => choose(value)}
      className="flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-semibold text-ink aria-checked:bg-surface-raised aria-checked:shadow-[0_1px_3px_#0000002e]"
    >
      <Icon aria-hidden size={15} strokeWidth={2} />
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Thème de l'interface" className="flex rounded-md bg-hairline p-1">
      {option("light", "Clair", Sun)}
      {option("dark", "Sombre", Moon)}
    </div>
  );
}

/** Bouton rond lune / soleil de l'espace agent. */
export function ThemeButton() {
  const [theme, choose] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => choose(dark ? "light" : "dark")}
      aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-ink"
    >
      {dark ? <Sun aria-hidden size={16} /> : <Moon aria-hidden size={16} />}
    </button>
  );
}
