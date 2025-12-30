import { NodeTypes } from './ast';
import { isWhitespace, Pos, Tokenizer } from './tokenizer';

let currentInput = '';
let currentRoot = null;

function getSlice(start: number, end: number) {
  return currentInput.slice(start, end);
}

interface Loc {
  start: Pos;
  end: Pos;
  source: string;
}

function getLoc(start: number, end: number): Loc {
  return {
    // 开始的位置信息
    start: tokenizer.getPos(start),
    // 结束的位置信息
    end: tokenizer.getPos(end),
    source: getSlice(start, end),
  };
}

function setLocEnd(loc: Loc, end: number) {
  loc.source = getSlice(loc.start.offset, end);
  loc.end = tokenizer.getPos(end);
}

let currentOpenTag = null;

const stack = [];

function addNode(node) {
  // 找到栈的最后一个, 如果有就往 children 里面加, 如果没有就加入到 root 中
  const lastNode = stack.at(-1);
  if (lastNode) {
    lastNode.children.push(node);
  } else {
    currentRoot.children.push(node);
  }
}

let currentProp = null;

function isAllWhitespace(text: string) {
  for (let i = 0; i < text.length; i++) {
    if (!isWhitespace(text[i])) {
      return false;
    }
  }
  return true;
}

function condenseWhitespace(children) {
  const _children = [...children];
  for (let i = 0; i < _children.length; i++) {
    const node = _children[i];
    if (node.type === NodeTypes.TEXT) {
      if (isAllWhitespace(node.content)) {
        if (i === 0 || i === _children.length - 1) _children[i] = null;
        else node.content = ' ';
      }
    }
  }
  return _children.filter(Boolean);
}

const tokenizer = new Tokenizer({
  ontext(start, end) {
    const content = getSlice(start, end);
    const textNode = {
      type: NodeTypes.TEXT,
      content,
      loc: getLoc(start, end),
    };
    addNode(textNode);
  },
  onopentagname(start, end) {
    const tag = getSlice(start, end);
    // 把 currentOpenTag 的作用域提升到外面, 用于方便解析属性节点的时候可以拿到他
    currentOpenTag = {
      type: NodeTypes.ELEMENT,
      tag,
      children: [],
      loc: getLoc(start - 1, end),
    };
  },
  onopentagend() {
    addNode(currentOpenTag);
    stack.push(currentOpenTag);
    currentOpenTag = null;
  },
  onclosetag(start, end) {
    const tag = getSlice(start, end);
    const lastNode = stack.at(-1);
    if (lastNode && lastNode.tag === tag) {
      stack.pop();
      setLocEnd(lastNode.loc, end + 1);
    } else {
      console.debug('onclosetag 写错了');
    }

    lastNode.children = condenseWhitespace(lastNode.children);
  },
  onattrname(start, end) {
    currentProp = {
      name: getSlice(start, end),
      loc: getLoc(start, end),
      value: undefined,
    };
  },
  onattrvalue(start, end, isNq) {
    const value = getSlice(start, end);
    currentProp.value = value;
    setLocEnd(currentProp.loc, end + (isNq ? 0 : 1));
    if (currentOpenTag) {
      const props = (currentOpenTag.props ||= []);
      props.push(currentProp);
    } else {
      console.debug('onattrvalue 写错了');
    }
    currentProp = null;
  },
  oninterpolation(start, end) {
    // {{ msg }}
    let innerStart = start + 2;
    let innerEnd = end - 2;
    // ' msg '
    // 去除前端空格
    for (; isWhitespace(currentInput[innerStart]); ++innerStart);
    // 去除后端空格
    for (; isWhitespace(currentInput[innerEnd - 1]); --innerEnd);
    addNode({
      type: NodeTypes.INTERPOLATION,
      loc: getLoc(start, end),
      content: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: getSlice(innerStart, innerEnd),
        loc: getLoc(innerStart, innerEnd),
      },
    });
  },
});

/** 创建 ast 语法树的根节点 */
function createRoot(source: string) {
  return {
    type: NodeTypes.ROOT,
    children: [],
    source,
  };
}

export function parse(input: string) {
  // 把迪昂钱正在解析的字符串暴露给外部
  currentInput = input;

  const root = createRoot(input);
  currentRoot = root;

  // 开始解析 input
  tokenizer.parse(input);

  return root;
}
