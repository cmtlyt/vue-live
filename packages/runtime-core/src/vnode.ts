import { isArray, isFunction, isNumber, isObject, isString, OmitType, ShapeFlags } from '@vlive/shared';
import { ComponentInstance, getCurrentRenderingInstance } from './component';
import { AppContext } from './api-create-app';
import { isRef, isTeleport } from '@vlive/runtime-dom';

/** 文本节点标记 */
export const Text = Symbol('v-txt');

export const Fragment = Symbol('Fragment');

export interface SetupContext {
  attrs: Record<PropertyKey, any>;
  slots: Record<PropertyKey, () => VNode>;
  emit: (event: string, ...args: any[]) => void;
  expose: (exposed: Record<PropertyKey, any>) => void;
}

interface ObjType {
  props?: Record<PropertyKey, any> | string[];
  setup?: (props: OmitType<ObjType['props'], string[]>, ctx: SetupContext) => Record<PropertyKey, any> | (() => VNode);
  render?: () => VNode;
}

interface TransitionHooks {
  beforeEnter: (el: HTMLElement) => void;
  enter: (el: HTMLElement) => void;
  leave: (el: HTMLElement | Text, remove: () => void) => void;
}

export interface VNode {
  name?: string;
  __v_isVNode: boolean;
  appContext: AppContext;
  patchFlag: number;
  type: string | symbol | ObjType | ((props: OmitType<ObjType['props'], string[]>, ctx: SetupContext) => VNode);
  component?: ComponentInstance;
  props: Record<PropertyKey, any>;
  children: any[];
  dynamicChildren: VNode[];
  key: any;
  el: null | HTMLElement | Text;
  shapeFlag: number;
  ref: any;
  transition?: TransitionHooks;
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

export function createVNode(type: any, props?: Record<any, any>, children = null, patchFlag = 0, isBlock = false) {
  let shapeFlag = 0;

  if (isString(type)) {
    shapeFlag |= ShapeFlags.ELEMENT;
  } else if (isTeleport(type)) {
    shapeFlag |= ShapeFlags.TELEPORT;
  } else if (isObject(type)) {
    shapeFlag |= ShapeFlags.STATEFUL_COMPONENT;
  } else if (isFunction(type)) {
    shapeFlag |= ShapeFlags.FUNCTIONAL_COMPONENT;
  }

  const vnode: VNode = {
    /** 是一个虚拟节点 */
    __v_isVNode: true,
    appContext: null,
    type,
    props,
    children: null,
    dynamicChildren: null,
    patchFlag,
    /** 做 diff 用的 */
    key: (props || {}).key,
    /** 虚拟节点要挂载的元素 */
    el: null,
    /** 如果是 9 表示 type 是 dom 元素, children 是字符串 */
    shapeFlag,
    ref: normalizeRef((props || {}).ref),
  };

  if (patchFlag > 0 && currentBlock && !isBlock) {
    // currentBlock 存在并且为动态 vnode
    currentBlock.push(vnode);
  }

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

const blockStack: VNode[][] = [];

/** 当前正在收集的块 */
let currentBlock: VNode[] | null = null;

export function openBlock() {
  currentBlock = [];
  blockStack.push(currentBlock);
}

export function closeBlock() {
  blockStack.pop();
  currentBlock = blockStack.at(-1) || null;
}

/**
 * 收集到的动态节点放到 vnode 上
 */
export function setupBlock(vnode: VNode) {
  vnode.dynamicChildren = currentBlock;
  closeBlock();
  if (currentBlock) {
    currentBlock.push(vnode);
  }
}

/**
 * 创建块元素, 块元素只能被上级块收集, 不能被自己收集
 */
export function createElementBlock(type: any, props?: Record<any, any>, children = null, patchFlag = 0) {
  const vnode = createVNode(type, props, children, patchFlag, true);

  setupBlock(vnode);

  return vnode;
}

export function renderList<T, R>(list: T[], cb: (item: T, idx: number, arr: T[]) => R): R[] {
  return list.map(cb);
}

export function toDisplayString(val: any) {
  if (isString(val)) return val;
  if (val == null) return '';
  if (isRef(val)) {
    return String(val.value);
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}