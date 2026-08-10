const objectTag = '[object Object]';
const objectCtorString = Function.prototype.toString.call(Object);

export function isPlainObject(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Object.prototype.toString.call(value) !== objectTag) return false;

  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;

  const ctor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor;
  return (
    typeof ctor === 'function' &&
    Function.prototype.toString.call(ctor) === objectCtorString
  );
}
