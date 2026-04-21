import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readdirSync, statSync } from 'node:fs'
import viteBundleObfuscator from 'vite-plugin-bundle-obfuscator'
import { ObfuscatorOptions } from 'javascript-obfuscator'

type Entry = {
  alias?: string
  key: string
  path: string
}

// 打包结果优先使用别名，开发的时候两者都可以
const entryAlias: Record<string, string> = {
  'sky-fengxu': 'a5ebbee14749',
  'cloud-distribute': 'APe2vddKooc'
}

const obfuscatorOptions: ObfuscatorOptions = {
  compact: true, // 将代码输出到一行
  controlFlowFlattening: true, // 启用代码控制流展平
  controlFlowFlatteningThreshold: 1,
  deadCodeInjection: true, // 随机插入无效代码块
  deadCodeInjectionThreshold: 0.5,
  debugProtection: true, // 无限断点
  debugProtectionInterval: 100,
  disableConsoleOutput: true,
  domainLock: ['braum.dpdns.org', 'braum.pages.dev'],
  domainLockRedirectUrl: 'about:blank',
  identifierNamesGenerator: 'hexadecimal', // 生成十六进制标识符
  ignoreImports: true, // 忽略混淆导入语句
  log: false,
  numbersToExpressions: false, // 数字转运算表达式
  renameGlobals: false, // 重命名全局成员
  renameProperties: false, // 重命名属性
  renamePropertiesMode: 'safe',
  reservedNames: [], // 保留名称
  reservedStrings: [], // 保留字符串
  seed: 123, // 设置随机生成器种子
  selfDefending: true, // 防止代码格式化、防变量重命名
  simplify: true, // 基于代码简化方式的额外代码混淆处理
  sourceMap: false,
  splitStrings: true, // 分割字符串
  splitStringsChunkLength: 10,
  stringArray: true, // 将字符串放入一个特殊的数组中
  stringArrayCallsTransform: true, // 转换对字符串数组的调用
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['rc4'], // 字符串RC4加密
  stringArrayIndexesType: ['hexadecimal-number'], // 字符串数组调用索引转换
  stringArrayIndexShift: true, // 字符串数组索引偏移
  stringArrayRotate: true, // 将字符串数组按照固定偏移量与随机偏移量（代码混淆时生成）进行整体移位
  stringArrayShuffle: true, // 随机打乱字符串数组内的元素顺序
  stringArrayWrappersChainedCalls: true, // 字符串数组包装器之间的链式调用
  stringArrayWrappersCount: 1,
  stringArrayWrappersParametersMaxCount: 3, // 字符串数组包装器最大参数数量
  stringArrayWrappersType: 'function', // 字符串数组包装器类型
  stringArrayThreshold: 0.8,
  target: 'browser',
  transformObjectKeys: true, // 将对象键放入一个数组中
  unicodeEscapeSequence: false // 转为 unicode 序列
}

// 动态获取多页面入口函数
const entryRules = (() => {
  const baseDir = resolve(__dirname, 'src/pages')
  const entries: Entry[] = []
  try {
    // 遍历 pages 目录
    const items = readdirSync(baseDir)
    items.forEach((item) => {
      const itemPath = resolve(baseDir, item)
      // 检查是否是目录且包含 index.html
      if (statSync(itemPath).isDirectory()) {
        const htmlPath = resolve(itemPath, 'index.html')
        try {
          // 检查 index.html 是否存在
          statSync(htmlPath)
          entries.push({ alias: entryAlias[item], key: item, path: htmlPath })
        } catch (e) {
          console.warn(`No index.html found in ${itemPath}, skipping.`)
        }
      }
    })
  } catch (e) {
    console.error('Error reading pages directory:', e)
  }
  return entries
})()

const entryInput = entryRules.reduce((p, v) => {
  // 优先使用别名作为入口
  p[v.alias || v.key] = v.path
  return p
}, {})

// 用于开发模式下路径重写的自定义插件
function mpaHistoryFallbackPlugin(): PluginOption {
  for (const rule of entryRules) {
    if (rule.alias) rule.alias = '/' + rule.alias
    rule.key = '/' + rule.key
    // 将本地的绝对路径替换为 url 的相对路径
    rule.path = rule.path.replace(__dirname, '').replaceAll('\\', '/')
  }

  return {
    name: 'vite-plugin-mpa-history-fallback',
    apply: 'serve',
    configureServer(server) {
      // 添加一个中间件到 Vite 开发服务器
      server.middlewares.use((req, res, next) => {
        if (req.url === '/') {
          req.url = '/index.html'
        } else
          for (const rule of entryRules) {
            const originUrl = req.url
            if (originUrl.startsWith(rule.alias)) {
              req.url = originUrl.replace(rule.alias, rule.key)
            }
            if (req.url === rule.key) {
              // 当访问无斜杠结尾的目录时，需要补充斜杠并引导浏览器重定向
              res.writeHead(308, { Location: originUrl + '/' })
              res.end()
              return
            } else if (req.url.startsWith(rule.key)) {
              req.url = '/src/pages' + req.url // 重写请求的 URL
              break
            }
          }
        next() // 继续处理请求
      })
    }
  }
}

// 处理打包后的目录结构
function flattenOutput(): PluginOption {
  const reg = new RegExp('src/pages/([^/]+)')

  return {
    name: 'vite-plugin-flatten-output',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        if (typeof output === 'object' && output.fileName?.endsWith('.html')) {
          const exeArr = reg.exec(output.fileName)
          const folder = exeArr?.[1]
          if (folder) {
            // 去掉 pages 目录层级并替换为别名
            output.fileName = output.fileName.replace(exeArr[0], entryAlias[folder] || folder)
          }
        }
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // base: './',
  plugins: [
    react(),
    mpaHistoryFallbackPlugin(),
    flattenOutput(),
    viteBundleObfuscator({
      log: false,
      enable: true,
      excludes: ['01d96b68.js'],
      autoExcludeNodeModules: true,
      apply: 'build',
      threadPool: true,
      options: obfuscatorOptions
    })
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src')
      }
    ]
  },
  server: {
    port: 10987
  },
  build: {
    minify: 'esbuild', // 最高效压缩
    sourcemap: false, // 关闭源码映射
    rollupOptions: {
      input: entryInput,
      output: {
        entryFileNames: '[name]/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'], // 移除所有console、debugger断点
    minifyIdentifiers: true // 原生变量压缩
  }
})
