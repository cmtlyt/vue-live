import { h, type Container } from '@vlive/runtime-dom';
import { VNode } from './vnode';

export function createAppAPI(render: (vnode: VNode, container: Container) => void) {
  return function createApp(rootComponent: any, rootProps: Record<string, any> = null) {
    const app = {
      __container: null,
      mount(container: Element) {
        // 创建虚拟节点
        const vnode = h(rootComponent, rootProps);

        render(vnode, container);

        app.__container = container;
      },
      unmount() {
        render(null, app.__container);
      },
    };

    return app;
  };
}
