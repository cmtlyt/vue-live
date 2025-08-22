import { h, type Container } from '@vlive/runtime-dom';
import { VNode } from './vnode';

export interface AppContext {
  provides: Record<PropertyKey, any>;
}

export function createAppAPI(render: (vnode: VNode, container: Container) => void) {
  return function createApp(rootComponent: any, rootProps: Record<string, any> = null) {
    const context: AppContext = {
      /** app 使用 provide 注入的组件 */
      provides: {},
    };

    const app = {
      __container: null,
      context,
      mount(container: Element) {
        // 创建虚拟节点
        const vnode = h(rootComponent, rootProps);
        // 为根组件绑定 context
        vnode.appContext = context;

        render(vnode, container);

        app.__container = container;
      },
      unmount() {
        render(null, app.__container);
      },
      provide(key: PropertyKey, value: any) {
        context.provides[key] = value;
      },
    };

    return app;
  };
}
