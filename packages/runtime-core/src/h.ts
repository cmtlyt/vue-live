import { isArray, isObject } from '@vlive/shared';
import { createVNode, isVNode } from './vnode';

export function h(type: any, propsOrChildren?: any, children?: any) {
  /// 对 createVNode 参数进行标准化
  const l = arguments.length;

  if (l === 2) {
    if (isArray(propsOrChildren)) {
      return createVNode(type, null, propsOrChildren);
    }
    if (isObject(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren);
    }
    return createVNode(type, null, [propsOrChildren]);
  } else {
    if (l > 3) {
      children = [...arguments].slice(2);
    } else if (isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }

  // const _children = [];
  // let props = {};
  // if (isArray(propsOrChildren)) {
  //   _children.push(...propsOrChildren);
  // } else if (isObject(propsOrChildren)) {
  //   if (isVNode(propsOrChildren)) {
  //     _children.push(propsOrChildren);
  //   } else {
  //     props = propsOrChildren;
  //   }
  // } else if (typeof propsOrChildren === 'string') {
  //   _children.push(propsOrChildren);
  // }
  // return createVNode(type, props, [..._children, ...children]);
}
