import type { RenderOptions } from '@vlive/runtime-dom';
import { isSameVNodeType, type VNode } from './vnode';
import { ShapeFlags } from '@vlive/shared';

interface Container extends HTMLElement {
  _vnode?: VNode;
}

export function createRenderer(options: RenderOptions) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    setText: hostText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = options;

  /** 挂载子元素 */
  const mountChildren = (children: VNode[], el: HTMLElement) => {
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      patch(null, child, el);
    }
  };

  /** 挂载元素 */
  const mountElement = (vnode: VNode, container: Container) => {
    const { type, props, children, shapeFlag } = vnode;
    /// 创建 dom 节点
    const el = hostCreateElement(type);

    vnode.el = el;

    /// 设置 props
    if (props) {
      for (const key of Object.keys(props)) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    /// 挂载子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      /// 子节点是文本
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      /// 子节点是数组
      mountChildren(children, el);
    }

    hostInsert(el, container, null);
  };

  /** 修订属性 */
  const patchProps = (el: HTMLElement, oldProps: Record<string, any>, newProps: Record<string, any>) => {
    if (oldProps) {
      for (const key of Object.keys(oldProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    } else {
      oldProps = {};
    }

    if (newProps) {
      for (const key of Object.keys(newProps)) {
        hostPatchProp(el, key, oldProps[key], newProps[key]);
      }
    }
  };

  /** 修订子元素 */
  const patchChildren = (n1: VNode, n2: VNode) => {
    const el = n2.el;
    /// 新节点子节点是文本
    ///   老的是数组
    ///   老的是文本
    /// 新的是数组或 null
    ///   老的是数组
    ///   老的是文本
    ///   老的是 null
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      /// 新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        /// 老的是数组
        unmountChildren(n1.children);
      }
      /// 老的是文本
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children);
      }
    } else {
      /// 新的是数组或 null
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        /// 老的是文本
        hostSetElementText(el, '');
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(n2.children, el);
        }
      } else {
        /// 老的是数组或者 null
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          /// 老的是数组
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            /// TODO: 新的是数组, 全量 diff
          } else {
            /// 新的是 null
            unmountChildren(n1.children);
          }
        } else {
          /// 老的是 null
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            /// 新的是数组
            mountChildren(n2.children, el);
          }
        }
      }
    }
  };

  /** 修订元素 */
  const patchElement = (n1: VNode, n2: VNode) => {
    /// 复用 dom 元素
    const el = (n2.el = n1.el);
    /// 更新 props
    const oldProps = n1.props;
    const newProps = n2.props;
    patchProps(el, oldProps, newProps);
    /// 更新 children
    patchChildren(n1, n2);
  };

  /**
   * 更新和挂载
   * @param n1 老节点
   * @param n2 新节点
   */
  const patch = (n1: VNode, n2: VNode, container: Container) => {
    // 如果两次传递的同一个虚拟节点则什么都不干
    if (n1 === n2) return;
    if (n1 && !isSameVNodeType(n1, n2)) {
      /// 如果两个节点不是同一类元素, 则不更新, 走挂载逻辑
      unmount(n1);
      n1 = null;
    }
    if (n1 == null) {
      /// 挂载
      mountElement(n2, container);
    } else {
      /// 更新
      patchElement(n1, n2);
    }
  };

  /** 卸载子元素 */
  const unmountChildren = (children: VNode[]) => {
    for (let i = 0; i < children.length; ++i) {
      unmount(children[i]);
    }
  };

  /** 卸载元素 */
  const unmount = (vnode: VNode) => {
    const { type, shapeFlag, children } = vnode;
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(children);
    }
    hostRemove(vnode.el);
  };

  /// 虚拟节点渲染到页面上的功能
  const render = (vnode: VNode, container: Container) => {
    if (vnode == null) {
      if (container._vnode) {
        /// 卸载
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };

  return {
    render,
    createApp(rootComponent: any) {
      return {
        mount(container: Container) {
          return render(rootComponent, container);
        },
      };
    },
  };
}
