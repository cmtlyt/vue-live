import { ShapeFlags } from '@vlive/shared';
import { getCurrentInstance, StatefulComponentVNode } from '../component';
import { VNode } from '../vnode';

export function isKeepAlive(type) {
  return (type || {}).__isKeepAlive || false;
}

export const KeepAlive = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  props: {
    max: { type: Number },
  },

  setup(props, { slots }) {
    const instance = getCurrentInstance();

    const { options, unmount } = instance.ctx.renderer || {};

    const { createElement, insert } = options || {};

    /**
     * 缓存
     *
     * component -> vnode
     * key -> vnode
     */
    const cache = new LRUCache(props.max);

    const storageContainer = createElement('div');

    /**
     * unmount 不卸载, 但是需要处理组件替换
     */
    instance.ctx.deactivate = vnode => {
      insert(vnode.el, storageContainer, null);
    };

    /**
     * 激活的时候将 dom 移动到页面上
     */
    instance.ctx.activate = (vnode, container, anchor) => {
      insert(vnode.el, container, anchor);
    };

    return () => {
      const vnode = slots.default();

      const key = vnode.key != null ? vnode.key : vnode.type;

      const cachedVNode = cache.get(key);

      if (cachedVNode) {
        // 存在缓存, 复用组件实例和 dom
        vnode.component = cachedVNode.component;
        vnode.el = cachedVNode.el;
        // 打个标, 告诉 mount 不挂载, 因为已经存在缓存的组件了
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
      }
      const _vnode = cache.set(key, vnode);
      if (_vnode) {
        resetShapeFlag(_vnode);
        unmount(_vnode);
      }

      // 打个标, 告诉 unmount 不卸载
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;

      return vnode;
    };
  },
} satisfies StatefulComponentVNode['type'];

/**
 * 移除所有缓存相关标记
 */
function resetShapeFlag(vnode: VNode) {
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE;
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
}

export class LRUCache {
  private cache = new Map();

  constructor(private max: number = Infinity) {}

  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // 调整顺序
    const value = this.cache.get(key);
    // this.cache.delete(key);
    // this.cache.set(key, value);
    this.set(key, value);

    return value;
  }

  set(key, value) {
    let vnode;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else {
      if (this.cache.size >= this.max) {
        const firstKey = this.cache.keys().next().value;
        vnode = this.cache.get(firstKey);
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);

    return vnode;
  }
}
