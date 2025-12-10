import { NodeTypes } from './ast';
import { Tokenizer } from './tokenizer';

let currentInput = '';
let currentRoot = null;

function getSlice(start: number, end: number) {
  return currentInput.slice(start, end);
}

function getLoc(start: number, end: number) {
  return {
    // 开始的位置信息
    start: tokenizer.getPos(start),
    // 结束的位置信息
    end: tokenizer.getPos(end),
    source: getSlice(start, end),
  };
}

const tokenizer = new Tokenizer({
  ontext(start: number, end: number) {
    const content = getSlice(start, end);
    const textNode = {
      type: NodeTypes.TEXT,
      content,
      loc: getLoc(start, end),
    };
    currentRoot.children.push(textNode);
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
