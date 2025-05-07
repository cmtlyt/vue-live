import { isOn } from '@vlive/shared';
import { patchClass } from './modules/patch-class';
import { patchStyle } from './modules/patch-style';
import { patchEvent } from './modules/events';
import { patchAttr } from './modules/patch-attr';

export function patchProp(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  if (key === 'class') {
    return patchClass(el, nextValue);
  }
  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue);
  }
  if (isOn(key)) {
    return patchEvent(el, key, nextValue);
  }
  patchAttr(el, key, nextValue);
}
