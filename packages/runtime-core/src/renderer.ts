export function createRenderer(options) {
  /// 虚拟节点渲染到页面上的功能
  const render = (vnode: any, container: HTMLElement) => {};

  return {
    render,
    createApp(rootComponent: any) {
      return {
        mount(container: HTMLElement) {
          return render(rootComponent, container);
        },
      };
    },
  };
}
