import type { ReactiveEffect } from './effect';

interface Dep {
  /**
   * 订阅者列表的头节点
   */
  subs: Link | undefined;
  /**
   * 订阅者列表的尾节点
   */
  subsTail: Link | undefined;
}

interface Sub {
  deps: Link | undefined;
  depsTail: Link | undefined;
}

/**
 * 链表节点
 */
export interface Link {
  /** 保存 effect */
  sub: Sub;
  /** 下一个订阅者 */
  nextSub: Link | undefined;
  /** 上一个订阅者 */
  prevSub: Link | undefined;
  /** 依赖项 */
  dep: Dep;
  /** 下一个依赖项 */
  nextDep: Link | undefined;
}

/**
 * 建立链表关系
 */
export function link(dep: any, sub: any) {
  // 尝试敷用链表节点
  const currentDep = sub.depsTail;
  /**
   * 分两种情况:
   * 1. 如果头节点有, 尾节点没有, 那么尝试复用头节点
   * 2. 如果尾节点还有 nextDep, 尝试复用尾节点的 nextDep
   */
  const nextDep = typeof currentDep === 'undefined' ? sub.deps : currentDep.nextDep;
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep;
    return;
  }
  const link = {
    sub,
    dep,
    nextDep,
    nextSub: void 0,
    prevSub: void 0,
  };
  // 关联链表关系, 有尾节点, 则往尾节点添加, 无尾节点, 初始化
  if (dep.subsTail) {
    dep.subsTail.nextSub = link;
    link.prevSub = dep.subsTail;
    dep.subsTail = link;
  } else {
    dep.subs = dep.subsTail = link;
  }
  // 将链表节点和 sub 建立关系
  if (sub.depsTail) {
    sub.depsTail.nextDep = link;
    sub.depsTail = link;
  } else {
    sub.deps = link;
    sub.depsTail = link;
  }
}

/**
 * 传播更新的函数
 */
export function propagate(subs: Link) {
  let link = subs;
  const queuedEffect = [];
  while (link) {
    queuedEffect.push(link.sub);
    link = link.nextSub;
  }
  queuedEffect.forEach(effect => effect.notify());
}

/**
 * 开启依赖追踪, 将 depsTail 尾节点设置成 undefined
 */
export function startTrack(sub: ReactiveEffect) {
  this.depsTail = void 0;
}

/**
 * 结束追踪, 找到需要清理的依赖, 断开关联关系
 */
export function endTrack(sub: ReactiveEffect) {
  const depsTail = sub.depsTail;
  /**
   * depsTail 存在, 并且 depsTail 还有 nextDep
   */
  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep);
      depsTail.nextDep = void 0;
    }
  } else if (sub.deps) {
    clearTracking(sub.deps);
    sub.deps = void 0;
  }
}

/**
 *
 */
export function clearTracking(link: Link) {
  while (link) {
    const { prevSub, nextSub, dep, nextDep } = link;
    /// 如果 prevSub 有, 那就把 prevSub 的下一个节点, 指向当前节点的下一个
    /// 如果没有, 那就是头节点, 那就把 dep.subs 指向 nextSub
    if (prevSub) {
      prevSub.nextSub = nextSub;
      link.nextSub = void 0;
    } else {
      dep.subs = nextSub;
    }

    /// 如果下一个有, 那就把 nextSub 的上一个节点, 指向当前节点的上一个节点
    /// 如果下一个节点没有, 那她就是尾节点, 把 dep.depsTail 指向上一个节点
    if (nextSub) {
      nextSub.prevSub = prevSub;
      link.prevSub = void 0;
    } else {
      dep.subsTail = prevSub;
    }

    link.dep = link.sub = void 0;
    link.nextDep = undefined;

    link = nextDep;
  }
}
