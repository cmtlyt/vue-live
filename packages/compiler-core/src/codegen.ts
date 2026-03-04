import { isArray, isString } from "@vlive/shared";
import { NodeTypes } from "./ast";
import { helperNameMap, OPEN_BLOCK } from "./runtime-helper";

function createCodegenContext(ast) {
  const context = {
    ast,
    code: '',
    indentLevel: 0,
    helper(name) {
      return `_${helperNameMap[name]}`;
    },
    push(code) {
      context.code += code;
    },
    indent() {
      newline(++context.indentLevel);
    },
    deindent() {
      newline(--context.indentLevel);
    },
    newline() {
      newline(context.indentLevel);
    },
  };

  function newline(n: number) {
    context.push(`\n${'  '.repeat(n)}`);
  }

  return context;
}

type Context = ReturnType<typeof createCodegenContext>;

function generateFunction(ast, ctx: Context) {
  const helpers = Array.from(ast.helpers.keys()).map((name: string) => `${helperNameMap[name]}: ${ctx.helper(name)}`);

  if (helpers.length) {
    ctx.push(`const { ${helpers.join(', ')} } = Vue;`);
  
    ctx.newline();
    ctx.newline();
  }

  ctx.push(`return function render(_ctx) {`)
  ctx.indent();
}

function genText(node, ctx: Context){
  ctx.push(JSON.stringify(node.content));
}

function genNodeListAsArray(nodes, ctx: Context) {
  ctx.push(`[`)
  ctx.indent();

  genNodeList(nodes, ctx);

  ctx.deindent();
  ctx.push(`]`)
}

function genNodeList(nodes, ctx: Context) {
  nodes.forEach((node, idx) => {
    if (node == null) {
      ctx.push(`null`)
    } else if (isString(node)) {
      ctx.push(`${node}`);
    } else if (isArray(node)) {
      genNodeListAsArray(node, ctx);
    } else {
      genNode(node, ctx);
    }
    if(idx < nodes.length - 1){
      ctx.push(',');
      ctx.newline();
    }
  });
}

function genVNodeCall(node, ctx: Context) {
  const { isBlock, tag, props, children, callee } = node;
  
  if (isBlock) {
    ctx.push(`${ctx.helper(OPEN_BLOCK)}(),`);
    ctx.newline();
  }

  const helper = ctx.helper(callee);
  ctx.push(`${helper}(`)
  ctx.indent();

  const args = [JSON.stringify(tag), props];
  // 如果 children 有内容的话, props 必须传递
  if (children.length) {
    args.push(children);
  } else if (props == null) {
    // 否则判断没有 props 则弹出 props
    args.pop();
  }
  genNodeList(args, ctx);

  ctx.deindent();
  ctx.push(')');
}

function genInterpolation(node, ctx: Context) {
  console.debug(node);
  ctx.push(node.content.content);
}

function genObjectExpression(node, ctx: Context) {
  const { properties } = node;
  ctx.push(`{`);
  ctx.indent();

  properties.forEach((prop, idx) => {
    const { key, value } = prop;
    ctx.push(key.isStatic ? `${JSON.stringify(key.content)}: ` : `[${key.content}]: `);
    ctx.push(value.isStatic ? `${JSON.stringify(value.content)}` :`_ctx.${value.content}`);
    if (idx < properties.length - 1) {
      ctx.push(',');
      ctx.newline();
    }
  });

  ctx.deindent();
  ctx.push(`}`);
}

function genNode(node, ctx: Context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, ctx);
      break;
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, ctx);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, ctx);
      break;
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, ctx);
      break;
  }
}

export function generate(ast) {
  const ctx = createCodegenContext(ast);

  generateFunction(ast, ctx)

  ctx.push(`return (`);
  ctx.indent();

  genNode(ast.codegenNode, ctx);

  ctx.deindent();
  ctx.push(`);`);

  ctx.deindent();
  ctx.push(`}`);
  
  return ctx.code;
}
