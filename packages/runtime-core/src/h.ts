import { isArray, isObject } from '@vlive/shared';

function createVNode(type: any, props: Record<any, any> = {}, children: any[] = []) {
  const vnode = {
    /** 是一个虚拟节点 */
    __v_isVNode: true,
    type,
    props,
    children,
    /** 做 diff 用的 */
    key: props.key,
    /** 虚拟节点要挂载的元素 */
    el: null,
    shapeFlag: 9,
  };
  return vnode;
}

export function h(type: any, propsOrChildren?: any, ...children: any[]) {
  /// 对 createVNode 参数进行标准化
  const _children = [];
  let props = {};
  if (isArray(propsOrChildren)) {
    _children.push(...propsOrChildren);
  } else if (isObject(propsOrChildren)) {
    if (isVNode(propsOrChildren)) {
      _children.push(propsOrChildren);
    } else {
      props = propsOrChildren;
    }
  } else if (typeof propsOrChildren === 'string') {
    _children.push(propsOrChildren);
  }
  return createVNode(type, props, [..._children, ...children]);
}

export function isVNode(value: any) {
  return !!(value && value.__v_isVNode);
}
