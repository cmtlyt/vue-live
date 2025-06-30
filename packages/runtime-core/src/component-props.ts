import { hasOwn, isArray } from '@vlive/shared';
import { VNode } from './vnode';
import { ComponentInstance } from './component';
import { reactive } from '@vlive/reactivity';

export function normalizePropsOptions(props: (VNode & { type: object })['type']['props']): Record<string, any> {
  if (isArray(props)) {
    return props.reduce((prev, cur) => {
      prev[cur] = {};
      return prev;
    }, {} as any);
  }

  return props;
}

function setFullProps(
  instance: ComponentInstance,
  rawProps: Record<string, any>,
  props: Record<string, any>,
  attrs: Record<string, any>,
) {
  const { propsOptions } = instance;
  if (rawProps) {
    Object.entries(rawProps).forEach(([key, value]) => {
      // 如果 propsOptions 有这个 key, 应该放到 props
      if (hasOwn(propsOptions, key)) {
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
