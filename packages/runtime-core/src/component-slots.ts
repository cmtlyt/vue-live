import { ShapeFlags } from '@vlive/shared';
import { ComponentInstance, StatefulComponentVNode } from './component';

export function initSlots(instance: ComponentInstance) {
  const { slots, vnode } = instance;

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const { children } = vnode;
    Object.entries(children).forEach(([key, value]) => {
      slots[key] = value;
    });
  }
}

export function updateSlots(instance: ComponentInstance, vnode: StatefulComponentVNode) {
  const { slots } = instance;

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const { children } = vnode;

    // 将最新的更新到 slots 中
    Object.entries(children).forEach(([key, value]) => {
      slots[key] = value;
    });

    // 删除之前有现在没有的
    Object.keys(slots).forEach(key => {
      if (children[key] == null) {
        delete slots[key];
      }
    });
  }
}
