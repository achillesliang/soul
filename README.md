# 灵魂家园 Soul Haven — Netlify 部署包

## 文件结构
```
soul-haven-deploy/
├── netlify.toml                    ← Netlify 配置（路由+iframe权限）
├── public/
│   └── index.html                  ← 前端主文件
└── netlify/functions/
    ├── pi-approve.js               ← 支付 approve 后端
    ├── pi-complete.js              ← 支付 complete 后端
    └── pi-me.js                    ← 用户验证后端
```

## 部署步骤

### 1. 上传到 Netlify
把整个 `soul-haven-deploy/` 文件夹拖到：
https://app.netlify.com/drop

### 2. 设置环境变量（重要！）
在 Netlify 控制台 → Site Settings → Environment Variables 添加：
```
PI_API_KEY = 你的Pi Developer Portal API Key
```
获取方式：https://developers.minepi.com → 你的App → API Keys

### 3. 在 Pi Developer Portal 配置
- App URL: https://你的站点.netlify.app
- Whitelist URLs: https://你的站点.netlify.app

### 4. 沙盒测试
- sandbox: true 已设置
- 用 Pi Browser 打开你的 Netlify URL
- 用测试 Pi 账号登录并支付

## 支付流程（修复后）
```
Pi Browser
  → createPayment()
  → onReadyForServerApproval(paymentId)
      → POST /api/pi-approve        ← Netlify Function
          → Pi Platform API (Key认证) ← 服务端，无CORS
  → Pi链处理
  → onReadyForServerCompletion(paymentId, txid)
      → POST /api/pi-complete       ← Netlify Function
  → NFT铸造成功 ✓
```
