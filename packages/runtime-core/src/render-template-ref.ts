import { isRef } from '@vlive/reactivity';
import { VNode } from './vnode';
import { isString, ShapeFlags } from '@vlive/shared';
import { getComponentPublicInstance } from './component';

export function setRef(ref: any, vnode: VNode) {
  const { r: rawRef, i: instance } = ref;

  if (vnode == null) {
    if (isRef(rawRef)) {
      rawRef.value = null;
    } else {
      instance.refs[rawRef] = null;
    }

    return;
  }

  const { shapeFlag } = vnode;

  if (isRef(rawRef)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 组件类型
      rawRef.value = getComponentPublicInstance(vnode.component);
    } else {
      // dom 元素类型
      rawRef.value = vnode.el;
    }
  } else if (isString(rawRef)) {
    // vnode.el 绑定到 instance.$refs[ref] 上
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 组件
      instance.refs[rawRef] = getComponentPublicInstance(vnode.component);
    } else {
      // dom 元素
      instance.refs[rawRef] = vnode.el;
    }
  }
}
