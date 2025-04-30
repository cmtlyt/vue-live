import { isFunction } from '@vlive/shared';
import { ReactivityFlags } from './ref';
import { Dependency, endTrack, link, Link, startTrack, Sub } from './system';
import { activeSub, setActiveSub } from './effect';

type GetterOrOptions<T> =
  | {
      get: () => T;
      set?: (v: T) => T;
    }
  | (() => T);

export class ComputedRefImpl implements Dependency, Sub {
  [ReactivityFlags.IS_REF]: true;

  /** 保存 fn 的返回值 */
  _value: any;

  /// Dependency 相关属性
  subs: Link;
  subsTail: Link;

  /// Sub 相关属性
  tracking: boolean = false;
  deps: Link;
  depsTail: Link;

  constructor(
    // getter
    public fn: Function,
    private setter: Function,
  ) {}

  get value() {
    this.update();
    /// 和 sub 做关联关系
    if (activeSub) {
      link(this, activeSub);
    }
    return this._value;
  }

  set value(v) {
    if (this.setter) {
      this._value = this.setter(v);
    } else {
      console.warn('我是只读的, 你别瞎玩儿');
    }
  }

  update() {
    /// 实现 sub 的功能, 为了在执行 fn 期间, 收集 fn 执行过程中访问到的响应式数据
    const prevSub = activeSub;

    // 每次执行 fn 之前把 this 放到当前激活的 sub 上
    setActiveSub(this);

    startTrack(this);

    try {
      this._value = this.fn();
    } finally {
      endTrack(this);
      // 执行完之后, 把 activeSub 重置
      setActiveSub(prevSub);
    }
  }
}
/**
 * 计算属性
 */
export function computed<T>(getterOrOptions: GetterOrOptions<T>) {
  let getter: Function, setter: Function;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter);
}
