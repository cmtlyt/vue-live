import { hasChanged, isObject } from '@vlive/shared';
import { track, trigger } from './dep';
import { isRef } from './ref';
import { reactive } from './reactive';

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    /// 收集依赖, 绑定 target 中某一个 key 和 sub 之间的关系
    track(target, key);
    /// 如果访问的是一个 ref, 则直接返回 ref 的值, 否则直接返回
    const res = Reflect.get(target, key, receiver);
    if (isRef(res)) {
      return res.value;
    }
    /// 如果 res 是一个对象, 就给他包装成 reactive
    if (isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  set(target, key, value, receiver) {
    const oldValue = Reflect.get(target, key);
    /// 如果原来的值是 ref, 并且新的值不是 ref 则修改老的 ref 的 value
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return oldValue.value;
    }
    /// 触发更新, get 的时候, 通知之前收集的依赖, 重新执行
    const res = Reflect.set(target, key, value, receiver);
    /// 如果新值和老值不一样, 触发更新
    if (hasChanged(value, oldValue)) {
      trigger(target, key);
    }
    return res;
  },
};
