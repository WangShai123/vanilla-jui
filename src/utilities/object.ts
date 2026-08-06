import _isPlainObject from 'lodash-es/isPlainObject.js';

export function isPlainObject(obj: unknown): boolean {
  return _isPlainObject(obj);
}
