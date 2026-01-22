import type { Dependency, Link } from './system';
import { link, propagate } from './system';
import { activeSub } from './effect';

export class Dep implements Dependency {
  subs: Link;
  subsTail: Link;
}

/**
 * 绑定 target 的 key 关联的所有的 Dep
 */
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();

export function track(target: any, key: any) {
  if (!activeSub) return;

  /// 找 deps map
  let depsMap = targetMap.get(target);

  if (!depsMap) {
    // 没收集过对象的任何 key 依赖, 则创建一个, 同时保存 targetMap 和 depsMap 之间的关联关系
    depsMap = new Map<string | symbol, Dep>();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);

  if (!dep) {
    /// 第一次收集这个对象没找到, 创建一个新的, 并且保存到 depsMap 中
    dep = new Dep();
    depsMap.set(key, dep);
  }

  link(dep, activeSub);
}

export function trigger(target: any, key: any) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    /// depsMap 没有, 说明这个对象从来没有任何属性在 sub 中访问过
    return;
  }

  const targetIsArray = Array.isArray(target);
  if (targetIsArray && key === 'length') {
    const length = target.length;
    depsMap.forEach((dep, depKey) => {
      if (depKey === 'length' || Number(depKey) >= length) {
        /// 通知访问了的 effect 更新
        propagate(dep.subs);
      }
    });
  } else {
    /// 非数组或者更新的不是 length
    const dep = depsMap.get(key);
    if (!dep) {
      /// dep 不存在, 表示这个 key 没有在 sub 中访问过
      return;
    }

    propagate(dep.subs);
  }
}
