/**
 * 链表节点
 */
export interface Link {
  // 保存 effect
  sub: Function;
  // 下一个节点
  nextSub: Link | undefined;
  // 上一个节点
  prevSub: Link | undefined;
}

/**
 * 建立链表关系
 */
export function link(dep: any, sub: any) {
  const link = {
    sub,
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
  queuedEffect.forEach(effect => effect());
}
