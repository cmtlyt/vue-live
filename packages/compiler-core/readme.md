# 编译时

## 什么是运行时

代码在浏览器运行的时候, 就是运行时

## 什么是编译时

将模板编译成 js 的过程, 就是编译时

```html
<template>
  <div id="id-1">111 {{msg}}</div>
</template>
```

把上面这一坨当作一个字符串来解析, 解析成 js 文件, 这个过程就叫做编译时

1. 把 .vue 文件的内容当作一个字符串, 转换成 ast 语法树(ast 语法树只是用来描述语法的), 他是一个对象
2. 把 ast 语法树转换成我们运行时的代码 `createElementBlock`, `createElementVNode`, `createVNode`

```js
const ast = {
  type: 1, // 元素节点
  tag: 'div',
  props: [
    {
      type: 3, // 属性节点
      name: 'id',
      content: 'id-1',
    },
  ],
  children: [
    {
      type: 2, // 文本节点
      content: '111',
    },
    {
      type: 4, // 表达式
      content: 'setupState.msg',
    },
  ],
};

// 把上面的 ast 语法树转换成我们的运行时的代码

const vnode = createElementBlock('div', { id: 'id-1' }, ['111', setupState.msg]);
```

https://astexplorer.net/ 可以看到 ast 语法树解析出来的结果

编译时是在构建工具里面使用的
