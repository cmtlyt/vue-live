import { getCurrentInstance } from './component';

export function provide(key: PropertyKey, value: any) {
  const instance = getCurrentInstance();

  // 出于优化考虑默认使用父组件的 provides, 但是这个时候用户主动注入了, 那就需要创建自己的
  if (instance.provides === instance.parent?.provides) {
    instance.provides = Object.create(instance.provides);
  }

  instance.provides[key] = value;
}

export function inject(key: PropertyKey, defaultValue: any) {
  const instance = getCurrentInstance();

  // 父组件没有就拿 app 的
  const { provides = {} } = instance.parent || instance.appContext || {};

  return provides[key] || defaultValue;
}
