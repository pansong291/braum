import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readdirSync, statSync } from 'node:fs'

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
  plugins: [react(), mpaHistoryFallbackPlugin(), flattenOutput()],
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
    rollupOptions: {
      input: entryInput,
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.isEntry) return '[name]/[hash].js'
          else return 'asset/chunk-[name]-[hash].js'
        },
        assetFileNames: 'asset/[name]-[hash].[ext]'
      }
    }
  }
})
