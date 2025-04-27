import { activeSub } from './effect';

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

  // 保存和 effect 之间的关联关系
  subs;

  constructor(value: any) {
    this._value = value;
  }

  get value() {
    // 收集依赖
    if (activeSub) {
      this.subs = activeSub;
    }
    return this._value;
  }

  set value(v: any) {
    // 触发更新
    this._value = v;
    this.subs?.();
  }
}

export function ref(value: any) {
  return new RefImpl(value);
}

export function isRef(ref: any): boolean {
  return !!(ref && ref[ReactivityFlags.IS_REF]);
}
