/**
 * 判断传入值是否为对象
 */
export function isObject(v: any) {
  return typeof v === 'object' && v !== null;
}

/**
 * 判断两个值是否发生变化
 */
export function hasChanged(newValue: any, oldValue: any) {
  return !Object.is(newValue, oldValue);
}

export function isFunction(v: any): v is Function {
  return typeof v === 'function';
}

export function isOn(key: string) {
  return /^on[A-Z]/.test(key);
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}
