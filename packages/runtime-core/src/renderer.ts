import { isKeepAlive, LifecycleHooks, ReactiveEffect, triggerHooks, type RenderOptions } from '@vlive/runtime-dom';
import { isSameVNodeType, normalizeVNode, Text, type VNode } from './vnode';
import { ShapeFlags } from '@vlive/shared';
import { createAppAPI } from './api-create-app';
import { ComponentInstance, StatefulComponentVNode, createComponentInstance, setupComponent } from './component';
import { queueJob } from './scheduler';
import { renderComponentRoot, shouleUpdateComponent } from './component-render-utils';
import { updateProps } from './component-props';
import { updateSlots } from './component-slots';
import { setRef } from './render-template-ref';

export interface Container extends Element {
  _vnode?: VNode;
}

/** 求最长递增子序列 */
function getSequence(arr: number[]) {
  const result: number[] = [];
  // 记录前驱节点
  const map = new Map();

  for (let i = 0; i < arr.length; ++i) {
    const item = arr[i];

    // -1 不在计算范围内
    if (item < 0 || typeof item === 'undefined') {
      continue;
    }

    /// 如果 result 里面什么都没有, 就直接放进去
    if (!result.length) {
      result.push(i);
      continue;
    }

    const lastIndex = result[result.length - 1];
    const lastItem = arr[lastIndex];

    /// 如果当前项大于上一项, 直接将索引放入 result
    if (item > lastItem) {
      result.push(i);
      map.set(i, lastIndex);
      continue;
    }

    /// item 小于上一项, 二分查找最合适的位置替换
    let left = 0;
    let right = result.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midItem = arr[result[mid]];

      if (midItem < item) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    if (arr[result[left]] > item) {
      result[left] = i;
      map.set(i, map.get(left));
    }
  }

  /// 反向追溯
  let l = result.length;
  let last = result[l - 1];
  while (l > 0) {
    --l;
    /// 纠正顺序
    result[l] = last;
    last = map.get(last);
  }

  return result;
}

export function createRenderer(options: RenderOptions) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = options;

  /** 挂载子元素 */
  const mountChildren = (children: VNode[], el: HTMLElement, parentComponent: ComponentInstance = null) => {
    for (let i = 0; i < children.length; ++i) {
      // 标准化 vnode
      const child = (children[i] = normalizeVNode(children[i]));
      patch(null, child, el, null, parentComponent);
    }
  };

  /** 挂载元素 */
  const mountElement = (
    vnode: VNode,
    container: Container,
    anchor = null,
    parentComponent: ComponentInstance = null,
  ) => {
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

    hostInsert(el, container, anchor);

    /// 挂载子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      /// 子节点是文本
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      /// 子节点是数组
      mountChildren(children, el, parentComponent);
    }
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

  const patchKeyedChildren = (
    c1: VNode[],
    c2: VNode[],
    container: Container,
    parentComponent: ComponentInstance = null,
  ) => {
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
      const n2 = (c2[i] = normalizeVNode(c2[i]));
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent);
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
      const n2 = (c2[e2] = normalizeVNode(c2[e2]));
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent);
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
        patch(null, (c2[i] = normalizeVNode(c2[i])), container, anchor, parentComponent);
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
    const newIndexToOldIndexMap = new Array(Math.max(0, e2 - s2 + 1)).fill(-1);

    for (let j = s2; j <= e2; ++j) {
      const n2 = (c2[j] = normalizeVNode(c2[j]));
      keyToNewIndexMap.set(n2.key, j);
    }

    let pos = -1;
    let moved = false;

    /// 遍历老的子节点
    for (let j = s1; j <= e1; ++j) {
      const n1 = c1[j];
      const newIndex = keyToNewIndexMap.get(n1.key);

      if (newIndex != null) {
        /// 判断下标是否连续
        if (newIndex > pos) {
          pos = newIndex;
        } else {
          moved = true;
        }
        newIndexToOldIndexMap[newIndex] = j;
        patch(n1, c2[newIndex], container, null, parentComponent);
      } else {
        unmount(n1);
      }
    }

    /// 不需要移动则不计算
    const newIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
    const sequenceSet = new Set(newIndexSequence);

    /// 遍历新子元素, 调整顺序 (倒序插入)
    for (let j = e2; j >= s2; --j) {
      const n2 = c2[j];
      // 拿到下一个子元素
      const anchor = (c2[j + 1] || {}).el || null;

      if (n2.el) {
        /// 如果不在最长递增子序列则需要移动
        if (moved && !sequenceSet.has(j)) hostInsert(n2.el, container, anchor);
      } else {
        /// 新节点
        patch(null, n2, container, anchor, parentComponent);
      }
    }
  };

  /** 修订子元素 */
  const patchChildren = (n1: VNode, n2: VNode, el: HTMLElement, parentComponent: ComponentInstance = null) => {
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
          mountChildren(n2.children, el, parentComponent);
        }
      } else {
        /// 老的是数组或者 null
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          /// 老的是数组
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            /// TODO: 新的是数组, 全量 diff
            patchKeyedChildren(n1.children, n2.children, el, parentComponent);
          } else {
            /// 新的是 null
            unmountChildren(n1.children);
          }
        } else {
          /// 老的是 null
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            /// 新的是数组
            mountChildren(n2.children, el, parentComponent);
          }
        }
      }
    }
  };

  /** 修订元素 */
  const patchElement = (n1: VNode, n2: VNode, parentComponent: ComponentInstance = null) => {
    /// 复用 dom 元素
    const el = (n2.el = n1.el) as HTMLElement;
    /// 更新 props
    const oldProps = n1.props;
    const newProps = n2.props;
    patchProps(el, oldProps, newProps);
    /// 更新 children
    patchChildren(n1, n2, el, parentComponent);
  };

  /**
   * 处理 dom 元素
   * @param n1 老节点
   * @param n2 新节点
   * @param container 容器
   * @param anchor
   */
  const processElement = (
    n1: VNode,
    n2: VNode,
    container: Container,
    anchor = null,
    parentComponent: ComponentInstance = null,
  ) => {
    if (n1 == null) {
      /// 挂载
      mountElement(n2, container, anchor, parentComponent);
    } else {
      /// 更新
      patchElement(n1, n2, parentComponent);
    }
  };

  /**
   * 处理文本节点
   * @param n1
   * @param n2
   * @param container
   * @param anchor
   */
  const processText = (n1: VNode, n2: VNode, container: Container, anchor = null) => {
    if (n1 == null) {
      const el = hostCreateText(n2.children);
      n2.el = el;
      hostInsert(el, container, anchor);
    } else {
      // 复用节点
      const el = (n2.el = n1.el);
      // 产生变更, 更新文本
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };

  const updateComponentPreRender = (instance: ComponentInstance, nextVNode: StatefulComponentVNode) => {
    /// 复用虚拟节点, 并删除更新标识
    instance.vnode = nextVNode;
    instance.next = null;
    /// 更新 props
    updateProps(instance, nextVNode);
    /// 更新 slots
    updateSlots(instance, nextVNode);
  };

  const setupRenderEffect = (instance: ComponentInstance, container: Container, anchor = null) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const { vnode } = instance;
        // 挂载前 beforeMounte
        triggerHooks(instance, LifecycleHooks.BEFORE_MOUNT);
        // 调用 render 拿到 subTree, this 指向 setupState
        const subTree = renderComponentRoot(instance);
        // 将 subTree 挂载到页面
        patch(null, subTree, container, anchor, instance);
        // 组件的 vnode 的 el, 会指向 subTree 的 el, 但是他们是相同的
        vnode.el = subTree.el;
        // 保存子树
        instance.subTree = subTree;
        instance.isMounted = true;
        // 挂载完成
        triggerHooks(instance, LifecycleHooks.MOUNTED);
      } else {
        let { vnode, next } = instance;

        /// 有 next 表示父组件 props 更新触发的更新
        if (next) {
          updateComponentPreRender(instance, next);
        }
        /// 自身响应式属性触发的更新
        else {
          // 如果没有就用之前的
          next = vnode;
        }

        // 更新前
        triggerHooks(instance, LifecycleHooks.BEFORE_UPDATE);

        // 调用 render 拿到 subTree, this 指向 setupState
        const subTree = renderComponentRoot(instance);
        // 将 subTree 挂载到页面
        patch(instance.subTree, subTree, container, anchor, instance);
        // 组件的 vnode 的 el, 会指向 subTree 的 el, 但是他们是相同的
        next.el = subTree.el;
        // 更新
        instance.subTree = subTree;

        // 更新完成
        triggerHooks(instance, LifecycleHooks.UPDATED);
      }
    };

    // 创建 effect
    const effect = new ReactiveEffect(componentUpdateFn);
    const update = effect.run.bind(effect);

    instance.update = update;

    effect.scheduler = () => {
      queueJob(update);
    };

    update();
  };

  const mountComponent = (
    vnode: StatefulComponentVNode,
    container: Container,
    anchor = null,
    parentComponent: ComponentInstance,
  ) => {
    // 创建组件实例
    const instance = createComponentInstance(vnode, parentComponent);
    if (isKeepAlive(vnode.type)) {
      instance.ctx.renderer = {
        options,
      };
    }
    vnode.component = instance;
    // 初始化组件状态
    setupComponent(instance);

    setupRenderEffect(instance, container, anchor);
  };

  const updateComponent = (n1: StatefulComponentVNode, n2: StatefulComponentVNode) => {
    const instance = (n2.component = n1.component);
    if (shouleUpdateComponent(n1, n2)) {
      // 绑定新的虚拟节点
      instance.next = n2;
      instance.update();
    } else {
      /// 没有任何属性发生变化, 不需要更新, 但是需要复用元素, 更新虚拟节点
      n2.el = n1.el;
      instance.vnode = n2;
    }
  };

  /**
   * 处理组件
   */
  const processComponent = (
    n1: StatefulComponentVNode,
    n2: StatefulComponentVNode,
    container: Container,
    anchor = null,
    parentComponent: ComponentInstance = null,
  ) => {
    if (n1 == null) {
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        parentComponent.ctx.activate?.(n2, container, anchor);
        return;
      }
      // 挂载
      mountComponent(n2, container, anchor, parentComponent);
    } else {
      // 更新
      updateComponent(n1, n2);
    }
  };

  /**
   * 更新和挂载
   * @param n1 老节点
   * @param n2 新节点
   */
  const patch = (
    n1: VNode,
    n2: VNode = null,
    container: Container,
    anchor = null,
    parentComponent: ComponentInstance = null,
  ) => {
    // 如果两次传递的同一个虚拟节点则什么都不干
    if (n1 === n2) return;
    if (n1 && !isSameVNodeType(n1, n2)) {
      // 不是同一个节点则获取下一个元素, 用于将 n2 挂载到 n1 原来的位置
      anchor = hostNextSibling(n1.el);
      /// 如果两个节点不是同一类元素, 则不更新, 走挂载逻辑
      unmount(n1);
      n1 = null;
    }
    const { type, shapeFlag, ref } = n2;

    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1 as any, n2 as any, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          (type as any).process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            options,
          });
        }
    }

    if (ref != null) {
      setRef(ref, n2);
    }
  };

  /** 卸载子元素 */
  const unmountChildren = (children: VNode[]) => {
    for (let i = 0; i < children.length; ++i) {
      unmount(children[i]);
    }
  };

  const unmountComponent = (instance: ComponentInstance) => {
    // 卸载前
    triggerHooks(instance, LifecycleHooks.BEFORE_UNMOUNTE);

    // 卸载子树
    unmount(instance.subTree);

    // 卸载完成
    triggerHooks(instance, LifecycleHooks.UNMOUNTED);
  };

  /** 卸载元素 */
  const unmount = (vnode: VNode) => {
    const { shapeFlag, children, ref } = vnode;

    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      vnode.component.parent.ctx.deactivate?.(vnode);
      // 需要缓存, 不卸载
      return;
    }

    // 组件卸载
    if (shapeFlag & ShapeFlags.COMPONENT) {
      unmountComponent(vnode.component);
    } else if (shapeFlag & ShapeFlags.TELEPORT) {
      unmountChildren(children);
      return;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(children);
    }
    hostRemove(vnode.el);

    if (ref != null) {
      setRef(ref, null);
    }
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
    createApp: createAppAPI(render),
  };
}
