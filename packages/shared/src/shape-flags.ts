export enum ShapeFlags {
  /** dom 元素 */
  ELEMENT = 1,
  /** 函数组件 */
  FUNCTIONAL_COMPONENT = 1 << 1,
  /** 有状态组件 (带有状态, 生命周期等) */
  STATEFUL_COMPONENT = 1 << 2,
  /** 子节点是纯文本 */
  TEXT_CHILDREN = 1 << 3,
  /** 子节点是数组 */
  ARRAY_CHILDREN = 1 << 4,
  /** 子节点通过插槽传入 */
  SLOTS_CHILDREN = 1 << 5,
  /** Teleport 组件, 用于将子节点传送到其他位置 */
  TELEPORT = 1 << 6,
  /** Suspense 组件, 用于处理异步加载组件时显示备用内容 */
  SUSPENSE = 1 << 7,
  /** 该组件应当被 keep-alive (缓存) */
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  /** 该组件已经被 keep-alive (已缓存) */
  COMPONENT_KEPT_ALIVE = 1 << 9,
  /** 组件类型, 有状态与无状态组件的组合 */
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
}
