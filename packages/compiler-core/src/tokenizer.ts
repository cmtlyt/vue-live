export enum State {
  /** 普通文本, 处理标签和差值表达式之外的内容 */
  Text = 1,

  // 差值表达式相关状态
  /** 开始解析差值表达式 {{ */
  InterpolationOpen,
  /** 解析差值表达式内容 */
  Interpolation,
  /** 结束解析差值表达式 }} */
  InterpolationClose,

  // HTML 标签相关状态
  /** 遇到 < 后的状态, 准备解析标签名 */
  BeforeTagName,
  /** 正在解析标签名 */
  InTagName,
  /** 处理自闭和标签 /> */
  InSelfClosingTag,
  /** 处理结束标签的开始 </ */
  BeforeClosingTagName,
  /** 解析结束标签的标签名 */
  InClosingTagName,
  /** 结束标签名后的状态 */
  AfterClosingTagName,

  // 属性和指令相关状态
  /** 准备解析属性名 */
  BeforeAttrName,
  /** 解析普通属性名 */
  InAttrName,
  /** 解析指令名 (v-if, v-for 等) */
  InDirName,
  /** 解析指令参数 (v-bind:arg) */
  InDirArg,
  /** 解析动态指令参数 (v-bind:[arg]) */
  InDirDynamicArg,
  /** 解析指令修饰符 (v-on:click.prevent) */
  InDirModifier,
  /** 属性名后的状态 */
  AfterAttrName,
  /** 准备解析属性值 */
  BeforeAttrValue,
  /** 双引号属性值 "value" */
  InAttrValueDq,
  /** 单引号属性值 'value' */
  InAttrValueSq,
  /** 无印好属性值 value */
  InAttrValueNq,

  // 声明相关状态
  /** 开始的声明 <! */
  BeforeDeclaration,
  /** 解析声明内容 */
  InDeclaration,

  // 处理指令相关状态
  /** 处理 XML 处理指令 <?xml ?> */
  InprocessingInstruction,

  // 注释和 CDATA 相关状态
  /** 准备解析注释 */
  BeforeComment,
  /** 解析 CDATA 序列 */
  CDATASequence,
  /** 特殊注释处理 */
  InSpecialComment,
  /** 类注释内容处理 */
  InCommentLike,

  // 特殊标签处理状态
  /** 处理 <script> 或 <style> */
  BeforeSpecialS,
  /** 处理 <title> 或 <textarea> */
  BeforeSpecialT,
  /** 特殊标签的开始序列 */
  SpecialStartSquence,
  /** 处理 RRCDATA 内容 (script/style/textarea 等) */
  InRCDATA,

  // 实体解析状态
  /** 解析 HTML 实体 (如 &amp;) */
  InEntity,

  // SFC 相关状态
  /** 解析单文件组件根标签名 */
  InSFCRootTagName,
}

function isTagStart(char: string) {
  return /[a-z]/i.test(char);
}

function isWhitespace(char: string) {
  return char === ' ' || char === '\n' || char === '\t' || char === '\r';
}

type TokenizerCallback = (start: number, end: number) => void;

type TokenizerCallbackNames = 'ontext' | 'onopentagname' | 'onclosetag' | 'onattrname';

type TokenizerCallbacks = Record<TokenizerCallbackNames, TokenizerCallback> & {
  onopentagend: () => void;
  onattrvalue: (start: number, end: number, isNq?: boolean) => void;
};

export interface Pos {
  line: number;
  column: number;
  offset: number;
}

/**
 * 基于状态机实现的解析器
 *
 * 不同的状态要做的事情是不一样的
 */
export class Tokenizer {
  /** 状态机的状态 */
  state = State.Text;
  /** 当前正在解析的字符下标 */
  index = 0;
  /** 解析开始的位置, 当前状态的初始位置 */
  sectionStart = 0;
  /** 当前正在解析的字符串 */
  buffer = '';

  constructor(public cbs: TokenizerCallbacks) {}

  parse(input: string) {
    this.buffer = input;
    while (this.index < this.buffer.length) {
      const char = this.buffer[this.index];
      switch (this.state) {
        case State.Text: {
          // 解析文本
          this.stateText(char);
          break;
        }
        case State.BeforeTagName: {
          // 解析开始标签
          this.stateBeforeTagName(char);
          break;
        }
        case State.InTagName: {
          // 解析标签名
          this.stateInTagName(char);
          break;
        }
        case State.BeforeAttrName: {
          this.stateBeforeAttrName(char);
          break;
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(char);
          break;
        }
        case State.InAttrName: {
          this.stateInAttrName(char);
          break;
        }
        case State.AfterAttrName: {
          this.stateAfterAttrName(char);
          break;
        }
        case State.BeforeAttrValue: {
          this.stateBeforeAttrValue(char);
          break;
        }
        case State.InAttrValueDq: {
          this.stateInAttrValueDq(char);
          break;
        }
        case State.InAttrValueSq: {
          this.stateInAttrValueSq(char);
          break;
        }
        case State.InAttrValueNq: {
          this.stateInAttrValueNq(char);
          break;
        }
      }
      ++this.index;
    }

    this.cleanup();
  }

  private stateText(char: string) {
    if (char === '<') {
      console.log('切换状态, 开始解析标签');
      // 处理没处理的文本
      if (this.sectionStart < this.index) {
        this.cbs.ontext(this.sectionStart, this.index);
      }
      // 开始解析标签
      // 切换状态
      this.state = State.BeforeTagName;
      // 移动 section 位置
      this.sectionStart = this.index;
    }
  }

  private stateBeforeTagName(char: string) {
    if (isTagStart(char)) {
      // 开始标签
      this.state = State.InTagName;
      this.sectionStart = this.index;
    } else if (char === '/') {
      this.state = State.InClosingTagName;
      // 当前匹配的字符串是斜杠, 需要从下一个开始
      this.sectionStart = this.index + 1;
    } else {
      // 不是标签
      this.state = State.Text;
    }
  }

  private stateInTagName(char: string) {
    if (char === '>' || isWhitespace(char)) {
      // 标签名结束
      this.cbs.onopentagname(this.sectionStart, this.index);
      // 状态切换到开始解析属性名
      this.state = State.BeforeAttrName;
      this.sectionStart = this.index;
      this.stateBeforeAttrName(char);
    }
  }

  private stateBeforeAttrName(char: string) {
    if (char === '>') {
      // 开始标签解析结束
      this.cbs.onopentagend();
      // 继续解析文本
      this.state = State.Text;
      // 从下一个开始不能包含 >
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(char)) {
      this.state = State.InAttrName;
      this.sectionStart = this.index;
    }
  }

  private stateInClosingTagName(char: string) {
    if (char === '>') {
      this.cbs.onclosetag(this.sectionStart, this.index);
      this.state = State.Text;
      // 从下一个开始不能包含 >
      this.sectionStart = this.index + 1;
    }
  }

  private stateInAttrName(char: string) {
    if (char === '=' || isWhitespace(char)) {
      // 属性名解析好了
      this.cbs.onattrname(this.sectionStart, this.index);
      this.state = State.AfterAttrName;
      this.sectionStart = this.index + 1;
      this.stateAfterAttrName(char);
    }
  }

  private stateAfterAttrName(char: string) {
    if (char === '=') {
      this.state = State.BeforeAttrValue;
      this.sectionStart = this.index + 1;
    }
  }

  private stateBeforeAttrValue(char: string) {
    if (char === '"') {
      // 开始解析属性值
      this.state = State.InAttrValueDq;
      this.sectionStart = this.index + 1;
    } else if (char === "'") {
      this.state = State.InAttrValueSq;
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(char)) {
      this.state = State.InAttrValueNq;
      this.sectionStart = this.index;
    }
  }

  private stateInAttrValueDq(char: string) {
    if (char === '"') {
      this.cbs.onattrvalue(this.sectionStart, this.index);
      this.state = State.BeforeAttrName;
    }
  }

  private stateInAttrValueSq(char: string) {
    if (char === "'") {
      this.cbs.onattrvalue(this.sectionStart, this.index);
      this.state = State.BeforeAttrName;
    }
  }

  private stateInAttrValueNq(char: string) {
    if (char === '>' || isWhitespace(char)) {
      this.cbs.onattrvalue(this.sectionStart, this.index, true);
      this.state = State.BeforeAttrName;
      this.stateBeforeAttrName(char);
    }
  }

  cleanup() {
    if (this.sectionStart < this.index) {
      // 证明还有没处理的
      if (this.state === State.Text) {
        // 要处理文本节点
        // 把开始的位置和结束的位置传过去
        this.cbs.ontext(this.sectionStart, this.index);
        this.sectionStart = this.index;
      }
    }
  }

  getPos(index: number) {
    return {
      // TODO
      line: 1,
      column: index + 1,
      offset: index,
    };
  }
}
