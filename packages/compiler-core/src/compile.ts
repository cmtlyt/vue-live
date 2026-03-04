/**
 * sfc 处理流程
 *
 * 1. parser 解析阶段
 * 2. transform 转换阶段
 * 3. codegen 生成 render 函数
 */

import { parse } from './parser';
import { transform } from './transform';

export function compile(template: string) {
  const ast = parse(template);

  transform(ast);

  return { ast };
}
