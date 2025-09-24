import { ref } from '@vlive/reactivity';
import { isFunction } from '@vlive/shared';
import { h } from './h';

export function defineAsyncComponent(options) {
  const defaultComponent = () => h('span', null, '');

  if (isFunction(options)) {
    options = {
      loader: options,
      loadingComponent: defaultComponent,
      errorComponent: defaultComponent,
    };
  }

  const { loader, loadingComponent = defaultComponent, errorComponent = defaultComponent, timeout } = options;

  const loadComp = () => {
    try {
      const res = loader();

      if (typeof res.then === 'function') {
        return new Promise((resolve, reject) => {
          if (timeout && timeout > 0) {
            setTimeout(() => reject('timeout'), timeout);
          }
          res.then(resolve, reject);
        });
      }

      return Promise.resolve(res);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  return {
    setup(props, { attrs, slots }) {
      const component = ref(loadingComponent);

      const failed = err => {
        console.error(err);
        component.value = errorComponent;
      };

      const loaded = comp => {
        component.value = comp.default || comp;
      };

      loadComp().then(loaded, failed);

      return () => {
        return h(component.value, { ...attrs, ...props }, slots);
      };
    },
  };
}
