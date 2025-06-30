import { proxyRefs } from '@vlive/reactivity';
import { SetupContext, VNode } from './vnode';
import { initProps, normalizePropsOptions } from './component-props';
import { isFunction, OmitType } from '@vlive/shared';

type ComponentVNode = VNode & { type: object };

export interface ComponentInstance {
  type: ComponentVNode['type'];
  vnode: ComponentVNode;
  /** 用户声明的组件 props */
  propsOptions: OmitType<ComponentVNode['type']['props'], string[]>;
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
    propsOptions: normalizePropsOptions(type.props),
    props: {},
    attrs: {},
    subTree: null,
    isMounted: false,
    setupState: null,
    render: () => null,
  };

  return instance;
}

/**
 * 创建 setupContext
 */
function createSetupContext(instance: ComponentInstance): SetupContext {
  return {
    get attrs() {
      return instance.attrs;
    },
  };
}

export function setupComponent(instance: ComponentInstance & { type: object }) {
  const { type } = instance;

  initProps(instance);

  if (isFunction(type.setup)) {
    const setupContext = createSetupContext(instance);
    const setupResult = proxyRefs(type.setup(instance.props, setupContext));
    instance.setupState = setupResult;
  }

  console.debug(instance);

  instance.render = type.render;
}
