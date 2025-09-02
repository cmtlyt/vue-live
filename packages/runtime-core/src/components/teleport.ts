import { RenderOptions } from '@vlive/runtime-dom';
import { ComponentInstance } from '../component';
import { Container } from '../renderer';
import { VNode } from '../vnode';

export function isTeleport(type) {
  return type.__isTeleport || false;
}

interface Internals {
  mountChildren: (children: VNode[], el: HTMLElement, parentComponent?: ComponentInstance) => void;
  patchChildren: (n1: VNode, n2: VNode, el: HTMLElement, parentComponent?: ComponentInstance) => void;
  options: RenderOptions;
}

export const Teleport = {
  name: 'Teleport',
  __isTeleport: true,
  props: {
    /** 挂载到目标容器 */
    to: { type: String },
    /** 是否禁用 */
    disabled: { type: Boolean },
  },
  process(
    n1: VNode,
    n2: VNode,
    container: Container,
    anchor: any,
    parentComponent: ComponentInstance,
    internals: Internals,
  ) {
    const { to, disabled } = n2.props;
    const {
      mountChildren,
      patchChildren,
      options: { querySelector, insert },
    } = internals;
    if (n1 == null) {
      /// 挂载
      // 如果禁用就挂载到 container 上, 否则查询到目标元素去挂载
      const target = disabled ? container : querySelector(to);

      if (target) {
        (n2 as any).target = target;
        mountChildren(n2.children, target, parentComponent);
      }
    } else {
      const el = (n1 as any).target;
      /// 更新
      patchChildren(n1, n2, el, parentComponent);
      (n2 as any).target = el;

      const prevProps = n1.props;
      if (prevProps.to !== to || prevProps.disabled !== disabled) {
        const target = disabled ? container : querySelector(to);

        for (const child of n2.children) {
          insert(child.el, target, null);
        }

        (n2 as any).target = target;
      }
    }
  },
};
