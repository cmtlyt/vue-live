/**
 * sfc 处理流程
 *
 * 1. parser 解析阶段
 * 2. transform 转换阶段
 * 3. codegen 生成 render 函数
 */

import { PatchFlags } from '@vlive/shared';
import { createCallExpression, NodeTypes } from './ast';
import { parse } from './parser';
import { CREATE_TEXT, TO_DISPLAY_STRING } from './runtime-helper';

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
    const exit = cb(node, ctx);
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

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

function transformText(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const children = node.children;
      const _children = [];
      let hasText = false;
      for (const child of children) {
        const last = _children.at(-1);
        if (last && isText(child) && (isText(last) || last.type === NodeTypes.COMPOUND_EXPRESSION)) {
          hasText = true;
          if (last.type !== NodeTypes.COMPOUND_EXPRESSION) {
            _children[_children.length - 1] = {
              type: NodeTypes.COMPOUND_EXPRESSION,
              children: [last],
            };
          }
          _children.at(-1).children.push('+', child);
        } else {
          _children.push(child);
        }
      }

      const childLen = _children.length;
      // 只有在存在文本节点, 并且 _children 的长度大于 1
      if (hasText && childLen > 1) {
        for (let i = 0; i < childLen; ++i) {
          const child = _children[i];
          if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
            const args = [child];
            // 不是存文本就是动态的
            if (child.type !== NodeTypes.TEXT) {
              args.push(PatchFlags.TEXT);
            }
            _children[i] = {
              type: NodeTypes.TEXT_CALL,
              content: child,
              codegenNode: createCallExpression(ctx.helper(CREATE_TEXT), args),
            };
          }
        }
      }

      node.children = _children;
    };
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
      return name;
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
