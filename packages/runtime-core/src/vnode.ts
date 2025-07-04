import { isArray, isNumber, isObject, isString, OmitType, ShapeFlags } from '@vlive/shared';

/** 文本节点标记 */
export const Text = Symbol('v-txt');

export interface SetupContext {
  attrs: Record<PropertyKey, any>;
}

interface ObjType {
  props: Record<PropertyKey, any> | string[];
  setup: (props: OmitType<ObjType['props'], string[]>, ctx: SetupContext) => Record<PropertyKey, any> | (() => VNode);
  render: () => VNode;
}

export interface VNode {
  __v_isVNode: boolean;
  type: string | symbol | ObjType;
  props: Record<PropertyKey, any>;
  children: any[];
  key: any;
  el: null | HTMLElement | Text;
  shapeFlag: number;
}

/**
 * 标准化 children
 */
function normalizeChildren(children: any[] = null) {
  return (
    children &&
    children.map(item => {
      if (isNumber(item)) {
        return String(item);
      }
      return item;
    })
  );
}

export function createVNode(type: any, props?: Record<any, any>, children: any[] = null) {
  let shapeFlag = 0;
  children = normalizeChildren(children);

  if (isString(type)) {
    shapeFlag |= ShapeFlags.ELEMENT;
  } else if (isObject(type)) {
    shapeFlag |= ShapeFlags.STATEFUL_COMPONENT;
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

export function isSameVNodeType(n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1.key === n2.key;
}

export function normalizeVNode(vnode: any) {
  /// 字符串和数字转换为文本节点
  if (isString(vnode) || isNumber(vnode)) {
    return createVNode(Text, null, [String(vnode)]);
  }
  return vnode;
}
