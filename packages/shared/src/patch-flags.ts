export enum PatchFlags {
  /** 动态文本内容 */
  TEXT = 1,
  /** class 动态 */
  CLASS = 1 << 1,
  /** style 动态 */
  STYLE = 1 << 2,
  /** props 动态 */
  PROPS = 1 << 3,
  /** 具有动态键属性, 当键发生变化时, 总是需要完整的差异对比 */
  FULL_PROPS = 1 << 4,
  /** 需要属性水合的元素 */
  NEED_HYDRATION = 1 << 5,
  /** 子元素顺序不会改变的片段 */
  STABLE_FRAGMENT = 1 << 6,
  /** 键控或部分键控子元素的片段 */
  KEYED_FRAGMENT = 1 << 7,
  /** 具有无键子元素的片段 */
  UNKEYED_FRAGMENT = 1 << 8,
  /** 只需要非补丁的元素 */
  DEED_PATCH = 1 << 9,
  /** 有动态插槽 */
  DYNAMIC_SLOTS = 1 << 10,
  /** 模板的跟级别防止了注释而创建的片段 */
  DEV_ROOT_FRAGMENT = 1 << 11,

  // 特殊片段, 负整数, 永远不会进行位运算进行匹配
  /** 缓存的静态 vnode, 水合提示, 跳过整个子树 */
  CACHED = -1,
  /** 差异比较算法应该退出优化模式 */
  BAIL = -2,
}
