import { PickType } from './types';

/**
 * 判断传入值是否为对象
 */
export function isObject(v: any): v is object {
  return typeof v === 'object' && v !== null;
}

/**
 * 判断两个值是否发生变化
 */
export function hasChanged(newValue: any, oldValue: any) {
  return !Object.is(newValue, oldValue);
}

export function isFunction<T>(v: T): v is PickType<T, (...args: any) => any> {
  return typeof v === 'function';
}

export function isOn(key: string) {
  return /^on[A-Z]/.test(key);
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return typeof value === 'number';
}

export function hasOwn(obj: Record<PropertyKey, any>, key: PropertyKey) {
  return Object.hasOwn(obj, key);
}
