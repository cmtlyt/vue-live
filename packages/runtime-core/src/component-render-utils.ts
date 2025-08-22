import { ShapeFlags } from '@vlive/shared';
import {
  ComponentInstance,
  FunctionalComponentVNode,
  StatefulComponentVNode,
  setCurrentRenderingInstance,
  unsetCurrentInstance,
} from './component';

function hasPropsChanged(prevProps: Record<PropertyKey, any>, nextProps: Record<PropertyKey, any>) {
  const nextKeys = Object.keys(nextProps);

  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }

  for (const key of nextKeys) {
    if (nextKeys[key] !== prevProps[key]) {
      return true;
    }
  }

  return false;
}

export function shouleUpdateComponent(n1: StatefulComponentVNode, n2: StatefulComponentVNode) {
  const { props: prevProps, children: prevChildren } = n1;
  const { props: nextProps, children: nextChildren } = n2;

  /// 任意一个有插槽就需要更新
  if (prevChildren || nextChildren) {
    return true;
  }

  /// 老的没有新的有, 需要更新
  if (!prevProps) {
    /// 老的没有新的也没有, 不需要更新
    return !!nextProps;
  }

  /// 老的有新的没有
  if (!nextProps) {
    return true;
  }

  /// 老的有 新的也有
  return hasPropsChanged(prevProps, nextProps);
}

export function renderComponentRoot(instance: ComponentInstance) {
  const { vnode } = instance;
  setCurrentRenderingInstance(instance);
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      const subTree = instance.render.call(instance.proxy);
      return subTree;
    } else {
      return (vnode as FunctionalComponentVNode).type(instance.props, {
        get attrs() {
          return instance.attrs;
        },
        slots: instance.slots,
        // 提交事件
        emit: instance.emit,
      });
    }
  } finally {
    unsetCurrentInstance();
  }
}
