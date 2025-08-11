import { isArray, isFunction, isNumber, isObject, isString, OmitType, ShapeFlags } from '@vlive/shared';
import { ComponentInstance, getCurrentRenderingInstance } from './component';

/** 文本节点标记 */
export const Text = Symbol('v-txt');

export interface SetupContext {
  attrs: Record<PropertyKey, any>;
  slots: Record<PropertyKey, () => VNode>;
  emit: (event: string, ...args: any[]) => void;
  expose: (exposed: Record<PropertyKey, any>) => void;
}

interface ObjType {
  props: Record<PropertyKey, any> | string[];
  setup: (props: OmitType<ObjType['props'], string[]>, ctx: SetupContext) => Record<PropertyKey, any> | (() => VNode);
  render: () => VNode;
}

export interface VNode {
  __v_isVNode: boolean;
  type: string | symbol | ObjType;
  component?: ComponentInstance;
  props: Record<PropertyKey, any>;
  children: any[];
  key: any;
  el: null | HTMLElement | Text;
  shapeFlag: number;
  ref: any;
}

/**
 * 标准化 children
 */
function normalizeChildren(vnode: VNode, children = null) {
  let { shapeFlag } = vnode;

  if (isString(children) || isNumber(children)) {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    children = String(children);
  } else if (isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    children = children.filter(item => item != null);
  } else if (isFunction(children)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
      children = { default: children };
    }
  } else if (isObject(children)) {
    if (shapeFlag & ShapeFlags.COMPONENT) {
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
  }

  vnode.children = children;
  vnode.shapeFlag = shapeFlag;

  return children;
}

function normalizeRef(ref: any): { r: any; i: ComponentInstance } {
  if (ref == null) return;
  return {
    r: ref,
    i: getCurrentRenderingInstance(),
  };
}

export function createVNode(type: any, props?: Record<any, any>, children = null) {
  let shapeFlag = 0;

  if (isString(type)) {
    shapeFlag |= ShapeFlags.ELEMENT;
  } else if (isObject(type)) {
    shapeFlag |= ShapeFlags.STATEFUL_COMPONENT;
  }

  const vnode: VNode = {
    /** 是一个虚拟节点 */
    __v_isVNode: true,
    type,
    props,
    children: null,
    /** 做 diff 用的 */
    key: (props || {}).key,
    /** 虚拟节点要挂载的元素 */
    el: null,
    /** 如果是 9 表示 type 是 dom 元素, children 是字符串 */
    shapeFlag,
    ref: normalizeRef((props || {}).ref),
  };

  normalizeChildren(vnode, children);

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
