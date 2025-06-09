import { createRenderer } from '@vlive/runtime-core';
import { nodeOps } from './node-ops';
import { patchProp } from './patch-prop';
import { isString } from '@vlive/shared';

export * from '@vlive/runtime-core';

export const renderOptions = { ...nodeOps, patchProp };

export type RenderOptions = typeof renderOptions;

const renderer = createRenderer(renderOptions);

export function render(vnode: any, container: Element) {
  renderer.render(vnode, container);
}

export function createApp(rootComponent: any, rootProps: Record<string, any> = null) {
  const app = renderer.createApp(rootComponent, rootProps);

  /**
   * 重写 app mount, 支持传入 dom 选择器
   */
  const mount = (selector: Element | string) => {
    if (isString(selector)) {
      selector = document.querySelector('container');
    }

    return app.mount(selector);
  };

  return { ...app, mount };
}
