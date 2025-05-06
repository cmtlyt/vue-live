import { isFunction, isObject } from '@vlive/shared';
import { ReactiveEffect } from './effect';
import { isRef } from './ref';
import { isReactive } from './reactive';

interface WatchOptions {
  immediate?: boolean;
  once?: boolean;
  deep?: boolean | number;
}

export function watch(source: any, cb: Function, options?: WatchOptions) {
  let { immediate, once, deep } = options || {};

  if (once) {
    // 如果 once, 那就保存并改写回调, 执行回调后调用 stop
    const _cb = cb;
    cb = (...args: any[]) => {
      _cb(...args);
      stop();
    };
  }

  let getter: Function;

  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    /// reactive 并且 deep 没传则默认 deep true
    getter = () => source;
    deep ??= true;
  } else if (!isFunction(source)) {
    /// 如果不是一个函数则包装成函数
    getter = () => source;
  } else {
    /// 否则认为传递了一个函数
    getter = source;
  }

  if (deep) {
    const baseGetter = getter;
    const depth = deep === true ? Infinity : deep;
    getter = () => traverse(baseGetter(), depth);
  }

  let oldValue: any;
  let cleanup: Function = null;

  const onCleanup = (cb: Function) => {
    cleanup = cb;
  };

  const effect = new ReactiveEffect(getter);

  const stop = () => {
    effect.stop();
  };

  const job = () => {
    /// 如果存在则清理上一次的副作用
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    // 执行 effect 拿到 getter 返回值, 因为要收集依赖
    const newValue = effect.run();
    // 执行用户回调, 传递新旧值
    cb(newValue, oldValue, onCleanup);
    oldValue = newValue;
  };

  effect.scheduler = job;

  if (immediate) {
    job();
  } else {
    // 拿到 oldValue 并且收集依赖
    oldValue = effect.run();
  }

  return stop;
}

/**
 * 递归触发 getter
 */
function traverse(value: any, depth = Infinity, seen = new Set()) {
  /// 不是对象 | 已访问 | 深度达标 则返回 value, 否则递归
  if (!isObject(value)) return value;

  if (seen.has(value)) return value;

  if (depth-- <= 0) {
    return value;
  }

  seen.add(value);

  for (const key in value) {
    traverse(value[key], depth, seen);
  }

  return value;
}
