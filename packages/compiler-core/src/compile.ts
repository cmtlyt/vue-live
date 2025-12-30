/**
 * sfc 处理流程
 *
 * 1. parser 解析阶段
 * 2. transform 转换阶段
 * 3. codegen 生成 render 函数
 */

import { NodeTypes } from './ast';
import { parse } from './parser';
import { helperNameMap, TO_DISPLAY_STRING } from './runtime-helper';

function traverseChildren(node, ctx) {
  node.children.forEach(child => {
    ctx.parentNode = node;
    traverseNode(child, ctx);
  });
}

/**
 * 前序遍历
 */
function traverseNode(node, ctx) {
  const nodeTransforms = ctx.nodeTransforms;
  ctx.currentNode = node;
  const exits = [];
  nodeTransforms.forEach(cb => {
    const exit = cb(node);
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

function transformElement(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // TODO
    return () => {};
  }
}

function transformText(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // TODO
    return () => {};
  }
}

function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // TODO
    node.content.content = `_ctx.${node.content.content}`;
  }
}

function createTransformContext(root) {
  const ctx = {
    root,
    currentNode: root,
    parentNode: null,
    nodeTransforms: [transformElement, transformText, transformExpression],
    /** 汇总需要用到的方法 createElementBlock, toDisplayString 等 */
    helpers: new Set(),
    helper(name) {
      ctx.helpers.add(name);
    },
  };

  return ctx;
}

function transform(root) {
  const ctx = createTransformContext(root);

  traverseNode(root, ctx);
}

export function compile(template: string) {
  const ast = parse(template);

  transform(ast);

  return { ast };
}
