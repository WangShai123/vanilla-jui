import { t } from 'vanilla-signal-i18n';
import locales from '../locales/index.ts';

export function translate(key: string) {
  return t(key, locales);
}
