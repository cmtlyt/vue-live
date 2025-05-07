export function patchAttr(el: HTMLElement, key: string, value: any) {
  // 判断 null 和 undefined
  if (value == void 0) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
