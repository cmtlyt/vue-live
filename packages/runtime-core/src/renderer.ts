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
  const mountElement = (vnode: VNode, container: Container, anchor = null) => {
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

    hostInsert(el, container, anchor);
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

  const patchKeyedChildren = (c1: VNode[], c2: VNode[], container: Container) => {
    /// 1. 双端 diff
    /** 开始对比的下标 */
    let i = 0;
    /** 老的子节点的最后一个元素的下标 */
    let e1 = c1.length - 1;
    /** 新的子节点的最后一个元素的下标 */
    let e2 = c2.length - 1;
    /**
     * 1.1 头部对比
     *
     * c1 = [a, b]
     * c2 = [a, b, c]
     *
     * 开始 i = 0; e1 = 1; e2 = 2;
     * 结束 i = 2; e1 = 1; e2 = 2;
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      ++i;
    }
    /**
     * 1.2 尾部对比
     *
     * c1 = [a, b]
     * c2 = [c, a, b]
     *
     * 开始 i = 0; e1 = 1; e2 = 2;
     * 开始 i = 0; e1 = -1; e2 = 0;
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      --e1;
      --e2;
    }
    if (i > e1) {
      /// 老的少, 新的多, 挂载新的
      while (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < c2.length ? c2[nextPos].el : null;
        patch(null, c2[i], container, anchor);
        i++;
      }
    } else if (i > e2) {
      /// 老的多, 新的少, 移除多余, 范围 i...e1
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    }

    /// 乱序 diff
    /**
     * c1 = [a, b, c, d, e]
     * c2 = [a, c, d, b, e]
     *
     * 双端对比结果
     *
     * i = 1, e1 = 3, e2 = 3
     */
    /** 老的子节点开始查找的位置 */
    let s1 = i;
    /** 新的子节点开始查找的位置 */
    let s2 = i;

    /**
     * 新子节点 key 和下标的映射关系
     *
     * map = {
     *   c: 1,
     *   d: 2,
     *   b: 3,
     * }
     */
    const keyToNewIndexMap = new Map();

    for (let j = s2; j <= e2; ++j) {
      const n2 = c2[j];
      keyToNewIndexMap.set(n2.key, j);
    }

    for (let j = s1; j <= e1; ++j) {
      const n1 = c1[j];
      const newIndex = keyToNewIndexMap.get(n1.key);

      if (newIndex != null) {
        patch(n1, c2[newIndex], container);
      } else {
        unmount(n1);
      }
    }

    /// 遍历新子元素, 调整顺序 (倒序插入)
    for (let j = e2; j >= s2; --j) {
      const n2 = c2[j];
      // 拿到下一个子元素
      const anchor = (c2[j + 1] || {}).el || null;

      if (n2.el) {
        hostInsert(n2.el, container, anchor);
      } else {
        /// 新节点
        patch(null, n2, container, anchor);
      }
    }

    console.debug(i, e1, e2);
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
            patchKeyedChildren(n1.children, n2.children, el);
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
  const patch = (n1: VNode, n2: VNode, container: Container, anchor = null) => {
    // 如果两次传递的同一个虚拟节点则什么都不干
    if (n1 === n2) return;
    if (n1 && !isSameVNodeType(n1, n2)) {
      /// 如果两个节点不是同一类元素, 则不更新, 走挂载逻辑
      unmount(n1);
      n1 = null;
    }
    if (n1 == null) {
      /// 挂载
      mountElement(n2, container, anchor);
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
