export function patchClass(el: HTMLElement, value: string | null) {
  // 判断 undefined 和 null
  if (value == void 0) {
    el.removeAttribute('class');
  } else {
    el.className = value;
  }
}
