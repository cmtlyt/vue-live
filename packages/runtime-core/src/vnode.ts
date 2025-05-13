import { isArray, isString, ShapeFlags } from '@vlive/shared';

interface VNode {
  __v_isVNode: boolean;
  type: string | ((...args: any[]) => any);
  props: Record<any, any>;
  children: any[];
  key: any;
  el: null | HTMLElement;
  shapeFlag: number;
}

export function createVNode(type: any, props?: Record<any, any>, children?: any[]) {
  let shapeFlag = 0;

  if (isString(type)) {
    shapeFlag |= ShapeFlags.ELEMENT;
  }
  if (isString(children)) {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  const vnode: VNode = {
    /** 是一个虚拟节点 */
    __v_isVNode: true,
    type,
    props,
    children,
    /** 做 diff 用的 */
    key: (props || {}).key,
    /** 虚拟节点要挂载的元素 */
    el: null,
    /** 如果是 9 表示 type 是 dom 元素, children 是字符串 */
    shapeFlag,
  };
  return vnode;
}

export function isVNode(value: any) {
  return !!(value && value.__v_isVNode);
}
