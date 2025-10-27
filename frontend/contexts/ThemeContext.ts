import { createContext } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
};

export const ThemeContext = createContext<ThemeProviderState>(initialState);
