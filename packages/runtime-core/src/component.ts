import { proxyRefs } from '@vlive/reactivity';
import { VNode } from './vnode';

type ComponentVNode = VNode & { type: object };

interface ComponentInstance {
  type: ComponentVNode['type'];
  vnode: ComponentVNode;
  props: ComponentVNode['props'];
  attrs: Record<string, any>;
  /** 子树 (render 的返回值) */
  subTree: VNode;
  /** 组件是否已经挂载 */
  isMounted: boolean;
  /** setup 函数的返回值 */
  setupState: ReturnType<ComponentVNode['type']['setup']>;
  /** 渲染虚拟 dom 的方法 */
  render: ComponentVNode['type']['render'];
}

export function createComponentInstance(vnode: VNode & { type: object }) {
  const { type } = vnode;
  const instance: ComponentInstance = {
    type,
    vnode,
    props: {},
    attrs: {},
    subTree: null,
    isMounted: false,
    setupState: null,
    render: () => null,
  };

  return instance;
}

export function setupComponent(instance: ComponentInstance & { type: object }) {
  const { type } = instance;

  const setupResult = proxyRefs(type.setup());
  instance.setupState = setupResult;

  instance.render = type.render;
}
