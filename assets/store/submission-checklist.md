# Chrome Web Store 提交清单

## 已准备文件

- 扩展图标
  - `assets/icons/icon-16.png`
  - `assets/icons/icon-32.png`
  - `assets/icons/icon-48.png`
  - `assets/icons/icon-128.png`
- 商店截图
  - `assets/store/screenshot-1-home-highlight.png`
  - `assets/store/screenshot-2-label-states.png`
  - `assets/store/screenshot-3-popup-settings.png`
- 宣传素材 (生成的)
  - `assets/screen/` (包含海报、实景图及功能宣传图)
- 商店文案
  - `assets/store/chrome-web-store-listing.md`
- 隐私政策
  - `assets/store/privacy-policy.md`

## 上传前检查

- 确认 `manifest.json` 中版本号正确
- 确认 `manifest.json` 已包含图标字段
- 运行测试：`npm test`
- 重新打包 zip
- 确认 zip 根目录直接包含 `manifest.json`
- 不要把 `.git`、`node_modules`、`tests` 打进上架 zip

## Web Store 后台填写建议

- 名称：`X互关雷达`
- 类别：`Productivity`
- 语言：`zh-CN`
- 简介与详细描述：参考 `assets/store/chrome-web-store-listing.md`
- 隐私政策：可使用 `assets/store/privacy-policy.md`

## 上架后建议

- 首次审核通过后，安装正式商店版本做一轮回归验证
- 每次发布前递增 `manifest.json` 中的版本号
- 如果 X 页面结构变化，优先更新识别逻辑后再重新提交审核

