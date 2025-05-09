import type { Dependency, Link } from './system';
import { hasChanged, isObject } from '@vlive/shared';
import { activeSub } from './effect';
import { link, propagate } from './system';
import { reactive } from './reactive';

export enum ReactivityFlags {
  IS_REF = '__v_isRef',
}

/**
 * Ref 实现
 */
class RefImpl implements Dependency {
  // 保存实际值
  _value: any;
  // 标记为 Ref
  [ReactivityFlags.IS_REF] = true;

  /**
   * 保存和 effect 之间的关联关系
   *
   * 订阅者链表(头节点)
   */
  subs: Link;

  /**
   * 订阅者链表(尾节点)
   */
  subsTail: Link;

  constructor(value: any) {
    /// 如果 value 是一个 object, 则使用 reactive 处理深度的响应式对象
    this._value = isObject(value) ? reactive(value) : value;
  }

  get value() {
    // 收集依赖
    if (activeSub) {
      trackRef(this);
    }
    return this._value;
  }

  set value(v: any) {
    if (!hasChanged(v, this._value)) {
      return;
    }
    this._value = v;
    // 触发更新
    traggerRef(this);
  }
}

export function ref(value: any) {
  return new RefImpl(value);
}

export function isRef(ref: any): boolean {
  return !!(ref && ref[ReactivityFlags.IS_REF]);
}

/**
 * 收集依赖, 建立 ref 和 effect 之间的链表关系
 */
export function trackRef(dep: any) {
  if (activeSub) {
    link(dep, activeSub);
  }
}

/**
 * 触发 ref
 */
export function traggerRef(dep: any) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}

class ObjectRefImpl {
  [ReactivityFlags.IS_REF] = true;

  constructor(
    public _object: any,
    public _key: any,
  ) {}

  get value() {
    return this._object[this._key];
  }

  set value(v) {
    this._object[this._key] = v;
  }
}

export function toRef<T>(target: T, key: keyof T) {
  return new ObjectRefImpl(target, key);
}

export function toRefs(target: any) {
  const res = {};

  Object.keys(target).forEach(key => {
    res[key] = toRef(target, key);
  });

  return res;
}

export function unref(value: any) {
  return isRef(value) ? value.value : value;
}

export function proxyRefs(target: any) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      return unref(res);
    },
    set(target, key, value, receiver) {
      const prop = Reflect.get(target, key, receiver);
      if (isRef(prop) && !isRef(value)) {
        prop.value = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}
