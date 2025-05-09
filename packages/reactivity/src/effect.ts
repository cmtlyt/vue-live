import type { Link, Sub } from './system';
import { endTrack, startTrack } from './system';

/**
 * 用来保存当前正在执行的 effect
 */
export let activeSub: any;

export function setActiveSub(sub: any) {
  activeSub = sub;
}

export class ReactiveEffect implements Sub {
  /**
   * 依赖项链表的头节点
   */
  deps: Link | undefined;
  /**
   * 依赖项链表的尾节点
   */
  depsTail: Link | undefined;

  tracking = false;
  dirty = false;
  /** effect 是否激活 */
  active = true;

  constructor(public fn: Function) {}

  run() {
    if (!this.active) return this.fn();
    // 保存当前的 sub, 用于处理嵌套逻辑
    const prevSub = activeSub;

    // 每次执行 fn 之前把 this 放到当前激活的 sub 上
    setActiveSub(this);

    startTrack(this);

    try {
      return this.fn();
    } finally {
      endTrack(this);
      // 执行完之后, 把 activeSub 重置
      setActiveSub(prevSub);
    }
  }

  /**
   * 通知更新方法, 如果依赖的数据发生了变化, 会调用这个函数
   */
  notify() {
    this.scheduler();
  }

  /**
   * 默认调用 run, 如果用户穿了, 那以用户的为主, 实例属性的优先级, 由于原型属性
   */
  scheduler() {
    this.run();
  }

  stop() {
    /// 如果激活则清理依赖
    if (this.active) {
      startTrack(this);
      endTrack(this);
      this.active = false;
    }
  }
}

export function effect(fn: Function, options: any) {
  const e = new ReactiveEffect(fn);
  // scheduler
  Object.assign(e, options);
  e.run();

  /**
   * 绑定函数的 this
   */
  const runner = e.run.bind(e);
  /**
   * 把 effect 的实例, 放到函数的属性中
   */
  runner.effect = e;

  return runner;
}
