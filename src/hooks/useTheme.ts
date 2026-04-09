import { useEffect, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export type Theme = "dark" | "light" | "auto";

const LIGHT_VARS: Record<string, string> = {
  "--bg-primary":   "#f0f2f8",
  "--bg-secondary": "#e4e7f0",
  "--bg-card":      "#ffffff",
  "--bg-input":     "#f7f8fc",
  "--border":       "#d0d4e8",
  "--border-subtle":"#e4e7f0",
  "--text-primary": "#0e0f14",
  "--text-secondary":"#3a3e55",
  "--text-muted":   "#6b7090",
  "--text-faint":   "#8b90a7",
  "--accent":       "#4f6ef7",
  "--accent-soft":  "rgba(79,110,247,0.12)",
  "--bubble-user":  "linear-gradient(135deg,#4f6ef7,#6b48f5)",
  "--bubble-ai":    "#ffffff",
  "--bubble-ai-border": "#d0d4e8",
  "--bubble-ai-text":"#0e0f14",
  "--sidebar-bg":   "#e8eaf4",
  "--scrollbar":    "#c4c8de",
};

const DARK_VARS: Record<string, string> = {
  "--bg-primary":   "#0e0f14",
  "--bg-secondary": "#13151e",
  "--bg-card":      "#1c1f2a",
  "--bg-input":     "#0e0f14",
  "--border":       "#2a2d3a",
  "--border-subtle":"#1e2133",
  "--text-primary": "#eef0f8",
  "--text-secondary":"#d0d4e8",
  "--text-muted":   "#8b90a7",
  "--text-faint":   "#555870",
  "--accent":       "#4f6ef7",
  "--accent-soft":  "rgba(79,110,247,0.12)",
  "--bubble-user":  "linear-gradient(135deg,#4f6ef7,#6b48f5)",
  "--bubble-ai":    "#1e2133",
  "--bubble-ai-border": "#2a2d3a",
  "--bubble-ai-text":"#d0d4e8",
  "--sidebar-bg":   "#13151e",
  "--scrollbar":    "#2a2d3a",
};

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const vars = theme === "light" ? LIGHT_VARS : theme === "auto" && !prefersDark ? LIGHT_VARS : DARK_VARS;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", theme === "auto" ? (prefersDark ? "dark" : "light") : theme);
}

export function useTheme(userId: string | null) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Load saved preference on mount
  useEffect(() => {
    if (!userId) { applyTheme("dark"); return; }
    getDoc(doc(db, "users", userId, "prefs", "ui"))
      .then(snap => {
        const saved = (snap.data()?.theme ?? "dark") as Theme;
        setThemeState(saved);
        applyTheme(saved);
      })
      .catch(() => applyTheme("dark"));
  }, [userId]);

  // Listen for system preference changes when on "auto"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "auto") applyTheme("auto"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    if (userId) {
      await setDoc(doc(db, "users", userId, "prefs", "ui"), { theme: t }, { merge: true });
    }
  };

  return { theme, setTheme };
}
