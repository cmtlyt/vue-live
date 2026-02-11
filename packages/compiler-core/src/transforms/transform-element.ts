import {
  createObjectExpression,
  createObjectProperty,
  createSimpleExpression,
  createVNodeCall,
  NodeTypes,
} from '../ast';
import { CREATE_ELEMENT_VNODE } from '../runtime-helper';

function buildProps(props) {
  if (!props) return;
  const properties = props.reduce((acc, current) => {
    const key = createSimpleExpression(current.name.replace(/^:/, ''));
    const value = createSimpleExpression(current.value, !current.name.startsWith(':'));
    const propertie = createObjectProperty(key, value);
    acc.push(propertie);
    return acc;
  }, []);
  return createObjectExpression(properties);
}

export function transformElement(node, ctx) {
  if (node.type === NodeTypes.ELEMENT) {
    // TODO
    return () => {
      const { children, tag, props } = node;
      const _props = buildProps(props);
      const codegenNode = createVNodeCall(ctx.helper(CREATE_ELEMENT_VNODE), tag, _props, children);
      node.codegenNode = codegenNode;
    };
  }
}
