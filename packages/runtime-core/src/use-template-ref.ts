import { ref } from '@vlive/reactivity';
import { getCurrentInstance } from './component';

export function useTemplateRef(key: string) {
  const vm = getCurrentInstance();
  const { refs } = vm;

  const elRef = ref(null);

  Object.defineProperty(refs, key, {
    get() {
      return elRef.value;
    },
    set(v) {
      elRef.value = v;
    },
  });

  return elRef;
}
