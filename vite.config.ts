import { defineConfig, PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readdirSync, statSync } from 'node:fs'

// 动态获取多页面入口函数
const multiPageInput = (() => {
  const baseDir = resolve(__dirname, 'src/pages')
  const entries: Record<string, any> = {
    // 主入口
    index: resolve(__dirname, 'index.html')
  }
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
          entries[item] = htmlPath // 使用文件夹名作为入口名
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

// 用于开发模式下路径重写的自定义插件
function mpaHistoryFallbackPlugin(): PluginOption {
  const rules = Object.entries(multiPageInput)
  for (const rule of rules) {
    rule[0] = '/' + rule[0]
    // 将本地的绝对路径替换为 url 的相对路径
    rule[1] = rule[1].replace(__dirname, '').replaceAll('\\', '/')
  }

  return {
    name: 'vite-plugin-mpa-history-fallback',
    apply: 'serve',
    configureServer(server) {
      // 添加一个中间件到 Vite 开发服务器
      server.middlewares.use((req, res, next) => {
        for (const rule of rules) {
          if (req.url === rule[0]) {
            // 当访问无斜杠结尾的目录时，需要补充斜杠并引导浏览器重定向
            res.writeHead(301, { Location: req.url + '/' })
            res.end()
            return
          } else if (req.url.startsWith(rule[0])) {
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
  return {
    name: 'vite-plugin-flatten-output',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        if (typeof output === 'object' && output.fileName?.endsWith('.html')) {
          // 去掉 pages 目录层级
          output.fileName = output.fileName.replace('src/pages/', '')
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
      input: multiPageInput,
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.isEntry) return '[name]/[hash].js'
          else return 'chunk-[name]-[hash].js'
        },
        assetFileNames: 'asset/[name]-[hash].[ext]'
      }
    }
  }
})
