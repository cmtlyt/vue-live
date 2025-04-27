import { activeSub } from './effect';
import { Link, link, propagate } from './system';

enum ReactivityFlags {
  IS_REF = '__v_isRef',
}

/**
 * Ref 实现
 */
class RefImpl {
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
    this._value = value;
  }

  get value() {
    // 收集依赖
    if (activeSub) {
      trackRef(this);
    }
    return this._value;
  }

  set value(v: any) {
    // 触发更新
    this._value = v;
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
