import { ComponentVNode } from './component';

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

export function shouleUpdateComponent(n1: ComponentVNode, n2: ComponentVNode) {
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
