import { NodeTypes } from '../ast';

export function transformExpression(node, ctx) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // TODO
    node.content.content = `_ctx.${node.content.content}`;
  }
}
