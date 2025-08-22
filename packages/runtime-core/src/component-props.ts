import { hasOwn, isArray, ShapeFlags } from '@vlive/shared';
import { ComponentInstance, StatefulComponentVNode } from './component';
import { reactive } from '@vlive/reactivity';

export function normalizePropsOptions(props: StatefulComponentVNode['type']['props']): Record<PropertyKey, any> {
  if (isArray(props)) {
    return props.reduce((prev, cur) => {
      prev[cur] = {};
      return prev;
    }, {} as any);
  }

  return props || {};
}

/**
 * 设置所有的 props 和 attrs
 */
function setFullProps(
  instance: ComponentInstance,
  rawProps: Record<PropertyKey, any>,
  props: Record<PropertyKey, any>,
  attrs: Record<PropertyKey, any>,
) {
  const { propsOptions, vnode } = instance;

  const isFunctionalComponent = vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT;

  const hasProps = Object.keys(propsOptions).length > 0;

  if (rawProps) {
    Object.entries(rawProps).forEach(([key, value]) => {
      // 如果 propsOptions 有这个 key, 应该放到 props
      if (hasOwn(propsOptions, key) || (isFunctionalComponent && !hasProps)) {
        props[key] = value;
      }
      // 否则放到 attrs
      else {
        attrs[key] = value;
      }
    });
  }
}

export function initProps(instance: ComponentInstance) {
  const { vnode } = instance;
  const rawProps = vnode.props;

  const props = {};
  const attrs = {};

  setFullProps(instance, rawProps, props, attrs);

  // props 是响应式数据, 需要 reactive
  instance.props = reactive(props);
  // attrs 不是响应式
  instance.attrs = attrs;
}

export function updateProps(instance: ComponentInstance, nextVNode: StatefulComponentVNode) {
  const { props, attrs } = instance;
  const rawProps = nextVNode.props;

  setFullProps(instance, rawProps, props, attrs);

  /// 删除之前有现在没有的 props 和 attrs

  for (const key in props) {
    if (!hasOwn(rawProps, key)) {
      delete props[key];
    }
  }

  for (const key in attrs) {
    if (!hasOwn(rawProps, key)) {
      delete props[key];
    }
  }
}
