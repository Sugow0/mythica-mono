import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Schéma de couleurs normalisé en `'light' | 'dark'`.
 * `useColorScheme` de React Native peut renvoyer `null`/`'unspecified'` : on
 * retombe sur `'light'` pour garantir un index valide dans la palette.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
