import { proxyRefs } from '@vlive/reactivity';
import { SetupContext, VNode } from './vnode';
import { initProps, normalizePropsOptions } from './component-props';
import { hasOwn, isFunction, isObject, OmitType } from '@vlive/shared';
import { nextTick } from './scheduler';
import { initSlots } from './component-slots';
import { AppContext } from './api-create-app';

export type StatefulComponentVNode = VNode & { type: Record<PropertyKey, any> };

export type FunctionalComponentVNode = VNode & { type: (...args: any[]) => any };

export type ComponentVNode = StatefulComponentVNode | FunctionalComponentVNode;

export type StatefulComponent = ComponentInstance & { type: Record<PropertyKey, any> };

export type FunctionalComponent = ComponentInstance & { type: (...args: any[]) => any };

interface ComponentInstanceCtx {
  _: ComponentInstance;
}

export interface ComponentInstance {
  type: ComponentVNode['type'];
  vnode: ComponentVNode;
  /** createApp 产生的 appContext */
  appContext: AppContext;
  /** 用户声明的组件 props */
  propsOptions: OmitType<StatefulComponentVNode['type']['props'], string[]>;
  props: ComponentVNode['props'];
  attrs: Record<string, any>;
  /** 子树 (render 的返回值) */
  subTree: VNode;
  /** 组件是否已经挂载 */
  isMounted: boolean;
  /** setup 函数的返回值 */
  setupState: ReturnType<StatefulComponentVNode['type']['setup']>;
  proxy: Record<PropertyKey, any>;
  exposedProxy?: Record<PropertyKey, any>;
  setupContext: SetupContext;
  ctx: ComponentInstanceCtx;
  slots: Record<PropertyKey, () => VNode>;
  refs: Record<PropertyKey, any>;
  /** 新的虚拟节点 */
  next?: ComponentVNode;
  /** 渲染虚拟 dom 的方法 */
  render: StatefulComponentVNode['type']['render'];
  update: () => void;
  emit: SetupContext['emit'];
  /** 暴露的属性 */
  exposed?: Record<PropertyKey, any>;
  parent: ComponentInstance;
  provides: Record<PropertyKey, any>;
}

export function getComponentPublicInstance(instance: ComponentInstance) {
  if (instance.exposed) {
    instance.exposedProxy ||= new Proxy(proxyRefs(instance.exposed), {
      get(target, p, receiver) {
        if (p in target) {
          return Reflect.get(target, p, receiver);
        }
        if (p in publicPropertiesMap) {
          return publicPropertiesMap[p](instance);
        }
      },
    });

    return instance.exposedProxy;
  } else {
    return instance.proxy;
  }
}

export function createComponentInstance(vnode: StatefulComponentVNode, parent: ComponentInstance = null) {
  const { type } = vnode;

  /** 如果 parent 不存在, 则从 vnode 中直接获取 appContext */
  const appContext = (parent || vnode || {}).appContext || null;

  const instance: ComponentInstance = {
    type,
    vnode,
    appContext,
    propsOptions: normalizePropsOptions(type.props),
    props: {},
    attrs: {},
    subTree: null,
    isMounted: false,
    setupState: null,
    proxy: {} as ComponentInstance['proxy'],
    setupContext: {} as ComponentInstance['setupContext'],
    ctx: {} as ComponentInstance['ctx'],
    slots: {},
    refs: {},
    render: null,
    update: null,
    emit: null,
    parent,
    provides: parent?.provides || appContext?.provides,
  };

  instance.ctx = { _: instance };
  instance.emit = (event, ...args) => emit(instance, event, ...args);

  return instance;
}

const publicPropertiesMap: Record<PropertyKey, (instance: ComponentInstance) => any> = {
  $el: instance => instance.vnode.el,
  $attrs: instance => instance.attrs,
  $slots: instance => instance.slots,
  $refs: instance => instance.refs,
  $nextTick: instance => nextTick.bind(instance),
  $forceUpdate: instance => () => instance.update(),
  $emit: instance => instance.emit,
};

const publicInstanceProxyHandlers: ProxyHandler<ComponentInstanceCtx> = {
  get(target, p) {
    const { _: instance } = target;

    const { setupState, props } = instance;

    // 访问属性先访问 setupState, 然后访问 props
    if (hasOwn(setupState, p)) {
      return setupState[p];
    }

    if (hasOwn(props, p)) {
      return props[p];
    }

    // $attrs, $slots, $refs
    if (hasOwn(publicPropertiesMap, p)) {
      const publicGetter = publicPropertiesMap[p];
      return publicGetter(instance);
    }

    return instance[p];
  },
  set(target, p, newValue) {
    const { _: instance } = target;

    const { setupState } = instance;

    // 修改 setupState
    if (hasOwn(setupState, p)) {
      setupState[p] = newValue;
    }

    return true;
  },
};

function handleSetupResult(instance: ComponentInstance, setupResult: ComponentInstance['setupState']) {
  if (isFunction(setupResult)) {
    // 如果 setup 返回了函数则认定为是 render
    instance.render = setupResult;
    instance.setupState = {};
  } else if (isObject(setupResult)) {
    instance.setupState = proxyRefs(setupResult);
  }
}

function setupStatefulComponent(instance: StatefulComponent) {
  const { type } = instance;

  instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers);

  if (isFunction(type.setup)) {
    const setupContext = createSetupContext(instance);
    instance.setupContext = setupContext;

    // 设置当前组件实例
    setCurrentInstance(instance);

    const setupResult = type.setup(instance.props, setupContext);

    // 清除当前组件实例
    unsetCurrentInstance();

    handleSetupResult(instance, setupResult);
  }

  // 如果处理完了还是没有 render, 则使用组件的 render 属性
  if (!instance.render) {
    instance.render = type.render;
  }
}

function emit(instance: ComponentInstance, event: string, ...args: any[]) {
  const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`;

  const handler = instance.vnode.props[eventName];

  if (isFunction(handler)) {
    handler(...args);
  }
}

/**
 * 创建 setupContext
 */
function createSetupContext(instance: ComponentInstance): SetupContext {
  return {
    // 除了 props 之外的属性
    get attrs() {
      return instance.attrs;
    },
    // 插槽
    slots: instance.slots,
    // 提交事件
    emit(event, ...args) {
      emit(instance, event, ...args);
    },
    // 暴露属性
    expose(exposed) {
      instance.exposed = exposed;
    },
  };
}

export function setupComponent(instance: StatefulComponent) {
  const { type } = instance;

  // 初始化属性
  initProps(instance);

  // 初始化插槽
  initSlots(instance);

  // 初始化状态
  setupStatefulComponent(instance);
}

let currentInstance: ComponentInstance | null = null;

export function setCurrentInstance(instance: ComponentInstance) {
  currentInstance = instance;
}

export function getCurrentInstance() {
  return currentInstance || null;
}

export function unsetCurrentInstance() {
  currentInstance = null;
}

/** 当前正在渲染的组件实例 */
let currentRenderingInstance = null;

export function setCurrentRenderingInstance(instance: ComponentInstance) {
  currentRenderingInstance = instance;
}

export function unsetCurrentRenderingInstance() {
  currentRenderingInstance = null;
}

export function getCurrentRenderingInstance(): ComponentInstance {
  return currentRenderingInstance;
}
