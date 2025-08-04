import { isArray } from '@vlive/shared';
import { ComponentInstance, getCurrentInstance, setCurrentInstance, unsetCurrentInstance } from './component';

/**
 * 组件生命周期
 */
export enum LifecycleHooks {
  // 挂载
  /** 挂载前 */
  BEFORE_MOUNT = 'bm',
  /** 挂载完成 */
  MOUNTED = 'm',

  // 更新
  /** 更新前 */
  BEFORE_UPDATE = 'bu',
  /** 更新完成 */
  UPDATED = 'u',

  // 卸载
  /** 卸载前 */
  BEFORE_UNMOUNTE = 'bum',
  /** 卸载完成 */
  UNMOUNTED = 'um',
}

function createHook(type: LifecycleHooks) {
  return (hook: () => any, target = getCurrentInstance()) => {
    injectHook(target, hook, type);
  };
}

function injectHook(target: ComponentInstance, hook: () => any, type: LifecycleHooks) {
  target[type] ||= [];
  // 重写 hook 确保用户能访问到 instance
  target[type].push(hook);
}

// 挂载
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);

// 更新
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);

// 卸载
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNTE);
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED);

/**
 * 触发 hooks
 * @param instance 组件实例
 * @param type hook 类型
 */
export function triggerHooks(instance: ComponentInstance, type: LifecycleHooks) {
  const hooks = instance[type];

  if (isArray(hooks)) {
    setCurrentInstance(instance);
    try {
      hooks.forEach(hook => hook());
    } finally {
      unsetCurrentInstance();
    }
  }
}
