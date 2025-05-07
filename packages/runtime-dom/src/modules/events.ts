function createInvoker(value: Function | null) {
  /// 创建一个事件处理函数, 内部调用 invoker.value
  /// 如果需要更新时间, 那后面直接修改 invoker.value 就可以完成事件换绑
  const invoker = (e: Event) => {
    invoker.value(e);
  };
  invoker.value = value;
  return invoker;
}

const VEI_KEY = Symbol('_vei');

export function patchEvent(el: HTMLElement, rawName: string, nextV: Function | null) {
  const name = rawName.slice(2).toLowerCase();

  const invokers = (el[VEI_KEY] ||= {});

  /// 如果存在, 则直接替换处理方法
  const existingInvoker = invokers[rawName];
  if (nextV) {
    if (existingInvoker) {
      existingInvoker.value = nextV;
      return;
    }

    const invoker = createInvoker(nextV);

    invokers[rawName] = invoker;

    el.addEventListener(name, invoker);
  } else {
    if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[rawName] = void 0;
    }
  }
}
