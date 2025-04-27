/**
 * 用来保存当前正在执行的 effect
 */
export let activeSub: any;

export function effect(fn: () => void) {
  activeSub = fn;
  activeSub();
  activeSub = void 0;
}
