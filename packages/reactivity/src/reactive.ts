import { isObject } from '@vlive/shared';
import { mutableHandlers } from './base-handlers';

export function reactive(target: any) {
  return createReactiveObject(target);
}

/** 保存 target 和 proxy 之间的关系 */
const reactiveMap = new WeakMap<object, object>();

/** 保存所有 reactive 创建出来的所有 proxy 对象 */
const reactiveSet = new WeakSet<object>();

export function isReactive(target: any) {
  return reactiveSet.has(target);
}

function createReactiveObject(target: any) {
  /// 必须接受一个对象
  if (!isObject(target)) {
    return target;
  }

  /// 如果 target 是 reactive 创建的响应式对象则直接返回
  if (isReactive(target)) {
    return target;
  }

  /// 如果这个 target 之前使用 reactive 创建过代理对象, 则直接放回这代理对象
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  /// 创建 target 的代理对象
  const proxy = new Proxy(target, mutableHandlers);

  // 保存 target 和 proxy 之间的关联关系
  reactiveMap.set(target, proxy);
  // 保存响应式对象
  reactiveSet.add(proxy);

  return proxy;
}
