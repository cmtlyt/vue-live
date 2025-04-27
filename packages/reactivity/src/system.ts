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
    nextDep: void 0,
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
