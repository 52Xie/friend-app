# Friend App — 打包成手机 App 完整指南

## 方案一：PWA（最简单，无需应用商店）

用户用手机浏览器打开网站 → 点击"添加到主屏幕" → 像原生 App 一样使用。

### 已实现的功能
- `manifest.json` ✅ 已创建
- `sw.js` Service Worker ✅ 已创建
- `index.html` PWA 配置 ✅ 已配置

### 部署步骤（部署后才可 PWA 安装）

```bash
# 1. 构建前端
cd friend-app/client
npm install
npx vite build          # 生成 dist/ 目录

# 2. 部署 dist/ 目录到任意静态托管
# 推荐：Vercel（免费、自动 HTTPS）
npm install -g vercel
cd dist && vercel --prod

# 3. 用手机浏览器打开部署后的网址
#    iOS Safari：底部署加按钮 → "添加到主屏幕"
#    Android Chrome：右上角 ⋮ → "安装应用"
```

---

## 方案二：Capacitor 打包成原生 App（推荐）

可以打包成 Android APK（发给好友安装）或 iOS IPA（上架 App Store）。

### 环境要求
| 平台 |  required |
|------|----------|
| Android | Android Studio + Android SDK（Windows/Mac/Linux） |
| iOS | Mac + Xcode（仅 Mac） |

### 打包步骤

#### 第一步：安装依赖
```bash
cd friend-app/client
npm install
npm install -D @capacitor/core @capacitor/cli
```

#### 第二步：构建前端
```bash
npx vite build        # 生成 dist/ 目录
```

#### 第三步：初始化 Capacitor
```bash
npx cap init "Friend App" "com.friendapp.app" --web-dir=dist
npx cap add android    # 添加 Android 平台
# npx cap add ios      # 如需 iOS（仅 Mac）
```

#### 第四步：构建并打开
```bash
npx cap sync           # 同步 Web 代码到原生项目
npx cap open android   # 用 Android Studio 打开
```

在 Android Studio 里点击 ▶ Run 即可在模拟器或真机上运行，或：
```bash
cd android && ./gradlew assembleDebug    # 生成 APK
# APK 位置：android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 方案三：直接发给好友 APK（最快）

如果你不想自己配环境，可以：

1. 把 `/workspace/friend-app/` 整个文件夹下载到本地
2. 按照「方案二」步骤打包
3. 把生成的 `app-debug.apk` 发给好友安装（需开启"允许安装未知来源"）

---

## 后端也需要部署

手机 App 需要连接后端服务器，你需要把后端也部署到公网：

```bash
# 最简单：部署到 Render.com（免费）
# 1. 把代码推到 GitHub
# 2. 在 Render.com 创建 Web Service
# 3. 设置环境变量 PORT=3001
# 4. 启动命令：node server/index.js
```

或者修改前端，让 Socket.io 连接你的公网服务器地址：
```js
// client/src/api/client.ts 顶部添加
axios.defaults.baseURL = 'https://your-server.com'

// client/src/hooks/useSocket.ts 修改
const socket = io('https://your-server.com');
```

---

## 总结

| 方案 | 难度 | 用户体验 | 推荐度 |
|------|------|----------|--------|
| PWA（添加到桌面）| ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ 最简单 |
| Capacitor APK | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ 可分发 |
| App Store 上架 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ 需开发者账号 |
