import { PatchFlags } from '@vlive/shared';
import { createCallExpression, NodeTypes } from '../ast';
import { CREATE_TEXT } from '../runtime-helper';

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

export function transformText(node, ctx) {
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
