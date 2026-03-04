import { covertToBlock, createVNodeCall, NodeTypes } from './ast';
import { CREATE_ELEMENT_VNODE, FRAGMENT, TO_DISPLAY_STRING } from './runtime-helper';
import { transformText } from './transforms/transform-text';
import { transformElement } from './transforms/transform-element';
import { transformExpression } from './transforms/transform-expression';

function traverseChildren(node, ctx: Context) {
  node.children.forEach(child => {
    ctx.parentNode = node;
    traverseNode(child, ctx);
  });
}

/**
 * 前序遍历
 */
function traverseNode(node, ctx: Context) {
  const nodeTransforms = ctx.nodeTransforms;
  ctx.currentNode = node;
  const exits = [];
  nodeTransforms.forEach(cb => {
    const exit: any = cb(node, ctx);
    exit && exits.push(exit);
  });

  switch (node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT: {
      traverseChildren(node, ctx);
      break;
    }
    case NodeTypes.INTERPOLATION: {
      ctx.helper(TO_DISPLAY_STRING);
      break;
    }
  }

  ctx.currentNode = node;
  while (exits.length) {
    exits.pop()();
  }
}

function createTransformContext(root) {
  const ctx = {
    root,
    currentNode: root,
    parentNode: null,
    nodeTransforms: [transformElement, transformText, transformExpression],
    /** 汇总需要用到的方法 createElementBlock, toDisplayString 等 */
    helpers: new Map(),
    helper(name) {
      const count = ctx.helpers.get(name) || 0;
      ctx.helpers.set(name, count + 1);
      return name;
    },
    removeHelper(name) {
      let count = ctx.helpers.get(name);
      if (count > 0) {
        --count;
        if (count === 0) {
          ctx.helpers.delete(name);
        } else {
          ctx.helpers.set(name, count);
        }
      }
    },
  };

  return ctx;
}

type Context = ReturnType<typeof createTransformContext>;

/**
 * 转换根节点的逻辑
 * 1. 只有一个根节点会加上 openBlock 和 createElementBlock
 * 2. 如果有多个根节点, 回加上 openBlock 和 createElementBlock, 但是 createElementBlock 会创建一个 Fragment
 */

export function transform(root) {
  const ctx = createTransformContext(root);

  traverseNode(root, ctx);
  createRootCodegenNode(root, ctx);

  root.helpers = ctx.helpers;
}

function isElementNode(node) {
  return node.type === NodeTypes.ELEMENT;
}

function createRootCodegenNode(root, ctx: Context) {
  const { children } = root;

  if (children.length === 1) {
    // 单根节点
    const child = children[0];
    if (isElementNode(child)) {
      const { codegenNode } = child;
      covertToBlock(codegenNode, ctx);
      root.codegenNode = codegenNode;
    } else {
      // 不是元素节点可能是文本之类
      root.codegenNode = child;
    }
  } else if (children.length > 1) {
    // 多根节点, 创建 Fragment
    const codegenNode = createVNodeCall(ctx.helper(CREATE_ELEMENT_VNODE), ctx.helper(FRAGMENT), null, root.children);
    covertToBlock(codegenNode, ctx);
    root.codegenNode = codegenNode;
  }
}
