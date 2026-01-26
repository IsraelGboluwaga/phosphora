export interface ThemeColors {
  highlightBg: string;
  highlightHover: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  surface: string;
  verseNum: string;
  darkHighlightBg: string;
  darkHighlightHover: string;
  darkAccent: string;
  darkText: string;
}

export const THEMES: Record<string, ThemeColors> = {
  sage: {
    highlightBg: '#e8f5d6',
    highlightHover: '#d2edaf',
    accent: '#a8d86e',
    textPrimary: '#2d3a2e',
    textSecondary: '#4a6b4d',
    textMuted: '#6b7c6c',
    surface: '#f8faf5',
    verseNum: '#7a9b7d',
    darkHighlightBg: '#3d5a3e',
    darkHighlightHover: '#4a6b4d',
    darkAccent: '#4a6b4d',
    darkText: '#e8f5d6',
  },
  ocean: {
    highlightBg: '#dbeafe',
    highlightHover: '#bfdbfe',
    accent: '#60a5fa',
    textPrimary: '#1e3a5f',
    textSecondary: '#3b6ea5',
    textMuted: '#6b8cac',
    surface: '#f0f7ff',
    verseNum: '#7ba3c9',
    darkHighlightBg: '#1e3a5f',
    darkHighlightHover: '#2a4d7a',
    darkAccent: '#3b6ea5',
    darkText: '#dbeafe',
  },
  lavender: {
    highlightBg: '#ede9fe',
    highlightHover: '#ddd6fe',
    accent: '#a78bfa',
    textPrimary: '#3b1f6e',
    textSecondary: '#6d4aaa',
    textMuted: '#8b7aac',
    surface: '#f5f3ff',
    verseNum: '#9b8cbe',
    darkHighlightBg: '#3b1f6e',
    darkHighlightHover: '#4c2d8a',
    darkAccent: '#6d4aaa',
    darkText: '#ede9fe',
  },
  amber: {
    highlightBg: '#fef3c7',
    highlightHover: '#fde68a',
    accent: '#f59e0b',
    textPrimary: '#451a03',
    textSecondary: '#92400e',
    textMuted: '#a17c4c',
    surface: '#fffbeb',
    verseNum: '#b5913c',
    darkHighlightBg: '#5c3a0e',
    darkHighlightHover: '#6d4a1a',
    darkAccent: '#92400e',
    darkText: '#fef3c7',
  },
  rose: {
    highlightBg: '#ffe4e6',
    highlightHover: '#fecdd3',
    accent: '#fb7185',
    textPrimary: '#4c1d2e',
    textSecondary: '#9d3858',
    textMuted: '#a67080',
    surface: '#fff1f2',
    verseNum: '#b5657e',
    darkHighlightBg: '#4c1d2e',
    darkHighlightHover: '#5e2a3d',
    darkAccent: '#9d3858',
    darkText: '#ffe4e6',
  },
  teal: {
    highlightBg: '#ccfbf1',
    highlightHover: '#99f6e4',
    accent: '#2dd4bf',
    textPrimary: '#134e4a',
    textSecondary: '#0f766e',
    textMuted: '#5a8a86',
    surface: '#f0fdfa',
    verseNum: '#6db0a8',
    darkHighlightBg: '#134e4a',
    darkHighlightHover: '#1a6b65',
    darkAccent: '#0f766e',
    darkText: '#ccfbf1',
  },
  slate: {
    highlightBg: '#e2e8f0',
    highlightHover: '#cbd5e1',
    accent: '#94a3b8',
    textPrimary: '#1e293b',
    textSecondary: '#475569',
    textMuted: '#64748b',
    surface: '#f1f5f9',
    verseNum: '#7a8a9c',
    darkHighlightBg: '#1e293b',
    darkHighlightHover: '#334155',
    darkAccent: '#475569',
    darkText: '#e2e8f0',
  },
  sunset: {
    highlightBg: '#ffedd5',
    highlightHover: '#fed7aa',
    accent: '#fb923c',
    textPrimary: '#431407',
    textSecondary: '#9a3412',
    textMuted: '#a67050',
    surface: '#fff7ed',
    verseNum: '#b8845c',
    darkHighlightBg: '#5a2a0e',
    darkHighlightHover: '#6b3a1a',
    darkAccent: '#9a3412',
    darkText: '#ffedd5',
  },
};

export const DEFAULT_THEME = 'sage';

export const THEME_STORAGE_KEY = 'phosphora:colorTheme';

export function getThemeCSS(themeName: string): string {
  const theme = THEMES[themeName] ?? THEMES[DEFAULT_THEME];
  return `:root {
  --phosphora-highlight-bg: ${theme.highlightBg};
  --phosphora-highlight-hover: ${theme.highlightHover};
  --phosphora-accent: ${theme.accent};
  --phosphora-text-primary: ${theme.textPrimary};
  --phosphora-text-secondary: ${theme.textSecondary};
  --phosphora-text-muted: ${theme.textMuted};
  --phosphora-surface: ${theme.surface};
  --phosphora-verse-num: ${theme.verseNum};
  --phosphora-dark-highlight-bg: ${theme.darkHighlightBg};
  --phosphora-dark-highlight-hover: ${theme.darkHighlightHover};
  --phosphora-dark-accent: ${theme.darkAccent};
  --phosphora-dark-text: ${theme.darkText};
}`;
}
