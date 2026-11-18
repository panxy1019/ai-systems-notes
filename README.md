# panxy1019 · AI Systems Notes

《AI 系统性能工程》第五章「GPU 存储 I/O 优化」的原创中文伴读站。

网站内容按「本章概要 / 章节详解 / 核心要点 / FAQ」组织，覆盖原书 §5.1–§5.17，附原书阅读页码、技术校正、官方资料链接、三组交互与六道自测。

## 本地阅读与编辑

需要 Node.js 18 或更新版本，无第三方运行依赖。

```bash
npm start
```

打开终端显示的 `http://127.0.0.1:4173`。若端口占用，可设置 `PORT`。

```bash
npm run check
```

检查本地资源、锚点、计算公式、有限批流水线调度及 JavaScript 语法。

| 文件 | 用途 |
| --- | --- |
| `dist/index.html` | 正文、来源、代码与自测题；直接修改即可 |
| `dist/styles.css` | 桌面、手机和深色主题 |
| `dist/app.js` | 搜索、主题、交互、即时测验和本地实践清单 |
| `dist/calculations.mjs` | 带宽与流水线计算模型 |
| `scripts/serve.mjs` | 本地静态预览服务 |
| `scripts/check.mjs` | 内容结构与计算模型检查 |

## GitHub Pages

源码维护于 `main`，Pages 从 `gh-pages` 分支根目录发布。网页资源都使用相对路径，支持 GitHub 项目站的子路径。

完成修改并通过检查后，在本地提交并推送源码，再将 `dist` 子目录发布为独立站点分支：

```bash
git add dist scripts package.json README.md .gitignore .openai/hosting.json
git commit -m "Update chapter notes"
git push origin main
git subtree split --prefix dist -b codex/pages-update
git push origin codex/pages-update:gh-pages
```

`codex/pages-update` 是临时本地分支；后续更新可换一个未使用的分支名。首次发布已由本任务配置。GitHub 构建成功后才可认为站点已更新。

## 内容与测量边界

- 依据 Chris Fregly 的《AI 系统性能工程》用户提供中文伴读译稿第五章，书内 pp.121–139，PDF pp.130–148。
- 正文为原创讲解；图示、交互与题目为教学补充。计算器是假设模型，不读取本机硬件或执行基准测试。
- 书稿的 3FS 配置、等待占比加速、DataLoader 代码与计时口径等校正在页面中明确标注，并链接 NVIDIA、PyTorch、DeepSeek 官方资料。
- Python 示例通过语法检查，运行需要 PyTorch 与 CUDA；当前任务未在 CUDA 设备上执行该示例。
- 不包含原书 PDF、页面截图或全章文本。`research/` 只用于本地核对，已通过 `.gitignore` 排除；上线目录仅为 `dist/`。
- 主题选择和实践清单只保存在访问者自己的浏览器，不使用账号、分析追踪或外部服务。

结构参考 [Se7en 的章节笔记](https://se7en.mintlify.app/books/ai-systems-performance-engineering/chapters/ch19)；使用独立的个人品牌与视觉设计。
