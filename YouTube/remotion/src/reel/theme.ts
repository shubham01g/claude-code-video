import React from "react";
import { glassCard, glassMuted, glassText } from "../components/glass";

// Panel theme: the scene's background decides text and card colours. ReelEdit provides it per scene.
export type PanelTheme = { text: string; muted: string; card: React.CSSProperties; track: string; dark: boolean; full?: boolean };
export const THEMES: Record<"glass" | "cream" | "dark", PanelTheme> = {
  glass: { text: glassText, muted: glassMuted, card: glassCard, track: "rgba(255,255,255,0.14)", dark: true },
  cream: {
    text: "#1C1C1E", muted: "#7A716A", track: "rgba(28,28,30,0.09)", dark: false,
    card: { background: "#FFFFFF", border: "1.5px solid rgba(28,28,30,0.06)", boxShadow: "0 18px 50px rgba(120,60,20,0.14)" },
  },
  dark: {
    text: "#F6F1EA", muted: "rgba(246,241,234,0.58)", track: "rgba(255,255,255,0.10)", dark: true,
    card: { background: "#1D1B19", border: "1.5px solid rgba(255,255,255,0.08)", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" },
  },
};
export const ThemeCtx = React.createContext<PanelTheme>(THEMES.glass);
export const useTheme = () => React.useContext(ThemeCtx);
