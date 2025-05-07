export function patchStyle(el: HTMLElement, prevV: object, nextV: object) {
  const style = el.style;

  if (nextV) {
    for (const key in nextV) {
      style[key] = nextV[key];
    }
  }

  if (prevV) {
    for (const key in prevV) {
      if (!(key in nextV)) style[key] = null;
    }
  }
}
