# X互关雷达

一个基于 Chrome Manifest V3 的 X / Twitter 扩展，用来在 x.com 页面标记：

- 和当前登录账号互关的作者
- 单向关注关系：`我关注`、`关注我`
- 可选显示 `Following / Followers` 关注率

## 功能

- 监听页面新增帖子并自动增量扫描
- 从页面已加载的数据中识别关注关系，不依赖额外接口
- 支持中 / 日 / 英三种语言，默认英文
- 支持配置标签位置、是否显示关注率、是否高亮帖子

## 本地开发

```bash
npm install
npm test
```

## GitHub Actions 打包

- 推送到 `main` / `master`，或手动触发工作流后，会自动生成 `zip` 和 `crx` 制品
- 推送以 `release` 开头的 tag（如 `release-v0.1.0`）时，会自动创建 GitHub Release 并上传 `zip` / `crx`
- 如需稳定的 `crx` 签名，请在 GitHub 仓库 Secrets 中配置 `EXTENSION_PRIVATE_KEY`
- `EXTENSION_PRIVATE_KEY` 支持直接填写 PEM 文本，或填写 Base64 编码后的 PEM 内容

## 安装到 Chrome

1. 打开 `chrome://extensions`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选中当前项目目录

## 已知限制

- 仅支持 `https://x.com/*`
- 页面结构依赖 X 当前前端实现，如果 X 页面结构变化，插件需要随之调整
- 仅基于页面已有数据和公开界面信息判断，不会请求站外接口
