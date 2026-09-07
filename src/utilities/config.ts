import { type ParamRule, type ParamRuleInput, validateParam } from './types.ts';
import {
  type MergeStrategy,
  cloneConfigValue,
  mergeConfigValue,
} from './merge.ts';
import { isPlainObject } from './object.ts';

type LooseRecord = Record<string, unknown>;
type ConfigTypeRule = string | readonly string[];

export interface ConfigNormalizeContext<
  TInput extends LooseRecord = LooseRecord,
> {
  key: string;
  path: string;
  input: TInput;
  options: LooseRecord;
  schema: ConfigSchema<TInput>;
}

export interface ConfigRule<
  TInput extends LooseRecord = LooseRecord,
> extends Omit<ParamRule<TInput>, 'normalize' | 'shape'> {
  defaultFactory?: () => unknown;
  merge?: MergeStrategy;
  schema?: ConfigSchema;
  normalize?: (
    value: unknown,
    context: ConfigNormalizeContext<TInput>
  ) => unknown;
}

export type ConfigRuleInput<TInput extends LooseRecord = LooseRecord> =
  | ConfigTypeRule
  | ConfigRule<TInput>;

export type ConfigSchema<TInput extends LooseRecord = LooseRecord> = Record<
  string,
  ConfigRuleInput<TInput>
>;

export type ResolvedConfig<TSchema extends object> = LooseRecord & {
  [Key in keyof TSchema]: unknown;
};

function normalizeConfigRule<TInput extends LooseRecord>(
  rule: ConfigRuleInput<TInput> = {}
): ConfigRule<TInput> {
  if (typeof rule === 'string' || Array.isArray(rule)) return { type: rule };
  if (!rule || typeof rule !== 'object') return {};
  return rule as ConfigRule<TInput>;
}

function resolveConfigDefault<TInput extends LooseRecord>(
  rule: ConfigRule<TInput>
): unknown {
  if (typeof rule.defaultFactory === 'function') {
    return cloneConfigValue(rule.defaultFactory());
  }
  if (Object.hasOwn(rule, 'default')) {
    return cloneConfigValue(rule.default);
  }
  return undefined;
}

function isInputMissing(source: LooseRecord, key: string): boolean {
  return !Object.hasOwn(source, key) || source[key] === undefined;
}

function resolveConfigValue<TInput extends LooseRecord>(
  key: string,
  rule: ConfigRule<TInput>,
  source: TInput,
  namespace: string
): unknown {
  const path = namespace ? `${namespace}.${key}` : key;
  const defaultValue = resolveConfigDefault(rule);
  const value = isInputMissing(source, key)
    ? defaultValue
    : mergeConfigValue(defaultValue, source[key], rule.merge, { key, path });

  return rule.schema && (value === undefined || isPlainObject(value))
    ? resolveConfig(value as LooseRecord | undefined, rule.schema, path)
    : value;
}

function validateConfigValue<TInput extends LooseRecord>(
  key: string,
  value: unknown,
  rule: ConfigRule<TInput>,
  namespace: string
): void {
  const validationRule: ParamRuleInput<TInput> = rule as ParamRule<TInput>;
  validateParam(key, value, validationRule, namespace);

  if (!rule.schema || !isPlainObject(value)) return;

  const childNamespace = namespace ? `${namespace}.${key}` : key;
  const valueRecord = value as LooseRecord;
  for (const [childKey, childRule] of Object.entries(rule.schema)) {
    validateConfigValue(
      childKey,
      valueRecord[childKey],
      normalizeConfigRule(childRule),
      childNamespace
    );
  }
}

export function resolveConfig<
  TInput extends LooseRecord,
  TSchema extends ConfigSchema<TInput>,
>(
  input: TInput | null | undefined = {} as TInput,
  schema: TSchema = {} as TSchema,
  namespace = 'Config'
): ResolvedConfig<TSchema> {
  const source = input == null ? {} : input;
  if (typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(`${namespace} expects object.`);
  }

  const sourceRecord = source as TInput;
  const resolved: LooseRecord = {};
  const entries = Object.entries(schema || {}) as Array<
    [string, ConfigRuleInput<TInput>]
  >;

  for (const [key, rawRule] of entries) {
    const rule = normalizeConfigRule<TInput>(rawRule);
    resolved[key] = resolveConfigValue(key, rule, sourceRecord, namespace);
  }

  for (const [key, rawRule] of entries) {
    const rule = normalizeConfigRule<TInput>(rawRule);
    if (typeof rule.normalize === 'function') {
      resolved[key] = rule.normalize(resolved[key], {
        key,
        path: namespace ? `${namespace}.${key}` : key,
        input: sourceRecord,
        options: resolved,
        schema,
      });
    }
  }

  for (const [key, rule] of entries) {
    validateConfigValue(
      key,
      resolved[key],
      normalizeConfigRule<TInput>(rule),
      namespace
    );
  }

  return resolved as ResolvedConfig<TSchema>;
}
