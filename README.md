# AIBazaar
基于大巴扎的游戏

在线试玩：https://ciki-9876.github.io/AIBazaar/

## 发布

推送到 `main` 后，GitHub Actions 自动构建并部署到 GitHub Pages。
本地运行 `npm ci`、`npm run build:pages` 可生成同样的 `dist/client` 静态站点。
`NEXT_PUBLIC_BASE_PATH` 默认是 `/AIBazaar`；普通 `npm run dev` 和 `npm run build` 仍使用根路径。
六个精修3D模型包含在发布产物中。

Pages 构建脚本补齐目录首页、清理无对应文件的可选预加载提示，并校验 HTML 的本地资源与链接。
游戏规则、存档格式保持不变。旧站存档需先导出，再在新站导入；不同域名不共享浏览器本地存档。
