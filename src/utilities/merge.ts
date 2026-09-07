import { isPlainObject } from './object.ts';

export type MergeStrategy =
  | 'replace'
  | 'shallow'
  | 'deep'
  | ((
      defaultValue: unknown,
      inputValue: unknown,
      context: MergeContext
    ) => unknown);

export interface MergeContext {
  key: string;
  path: string;
}

type LooseRecord = Record<string, unknown>;

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isSafeKey(key: string): boolean {
  return !UNSAFE_KEYS.has(key);
}

export function cloneConfigValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneConfigValue) as T;
  if (!isPlainObject(value)) return value;

  const result: LooseRecord = {};
  for (const [key, child] of Object.entries(value as LooseRecord)) {
    if (!isSafeKey(key)) continue;
    result[key] = cloneConfigValue(child);
  }
  return result as T;
}

export function mergeShallowConfig(
  defaultValue: unknown,
  inputValue: unknown
): unknown {
  if (!isPlainObject(defaultValue) || !isPlainObject(inputValue)) {
    return cloneConfigValue(inputValue);
  }

  const result = cloneConfigValue(defaultValue) as LooseRecord;
  for (const [key, value] of Object.entries(inputValue as LooseRecord)) {
    if (!isSafeKey(key)) continue;
    result[key] = cloneConfigValue(value);
  }
  return result;
}

export function mergeDeepConfig(
  defaultValue: unknown,
  inputValue: unknown
): unknown {
  if (!isPlainObject(defaultValue) || !isPlainObject(inputValue)) {
    return cloneConfigValue(inputValue);
  }

  const result = cloneConfigValue(defaultValue) as LooseRecord;
  for (const [key, value] of Object.entries(inputValue as LooseRecord)) {
    if (!isSafeKey(key)) continue;
    const current = result[key];
    result[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeDeepConfig(current, value)
        : cloneConfigValue(value);
  }
  return result;
}

export function mergeConfigValue(
  defaultValue: unknown,
  inputValue: unknown,
  strategy: MergeStrategy | undefined,
  context: MergeContext
): unknown {
  if (typeof strategy === 'function') {
    return strategy(
      cloneConfigValue(defaultValue),
      cloneConfigValue(inputValue),
      context
    );
  }

  if (strategy === 'shallow') {
    return mergeShallowConfig(defaultValue, inputValue);
  }

  if (strategy === 'deep') {
    return mergeDeepConfig(defaultValue, inputValue);
  }

  return cloneConfigValue(inputValue);
}
