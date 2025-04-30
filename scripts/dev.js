/// 打包开发环境
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: {
      type: 'string',
      short: 'f',
      default: 'esm',
    },
  },
});

const { format } = args;
// 获取打包目标包, 默认是 vue
const target = positionals[0] || 'vue';

// 创建 esm 的 filename 和 dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 获取目标包的入口文件路径
const entry = path.resolve(__dirname, '../packages', target, 'src/index.ts');

const outfile = path.resolve(__dirname, '../packages', target, `dist/${target}.${format}.js`);

const pkg = require(`../packages/${target}/package.json`);

esbuild
  .context({
    // 入口文件
    entryPoints: [entry],
    // 输出文件
    outfile,
    // 打包格式
    format,
    // 打包平台
    platform: format === 'cjs' ? 'node' : 'browser',
    // 生成 sourcemap 方便调试
    sourcemap: true,
    // 把所有的依赖打包到一个文件
    bundle: true,
    globalName: pkg.buildOptions.name,
  })
  .then(ctx => ctx.watch());
