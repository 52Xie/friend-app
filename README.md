# Friend App - 好友实时互动应用

一个支持好友登录、实时聊天、视频通话的 Web 应用。

## 功能特性

| 功能 | 说明 |
|------|------|
| 用户注册/登录 | JWT 认证，安全登录 |
| 好友系统 | 搜索用户、发送/接受好友请求 |
| 实时聊天 | WebSocket 即时消息，消息历史 |
| 视频通话 | WebRTC P2P 视频通话 |
| 在线状态 | 实时显示好友在线/离线状态 |

## 技术栈

- **前端**: React + TypeScript + Vite + TailwindCSS
- **后端**: Node.js + Express + Socket.io
- **实时通信**: Socket.io (聊天) + WebRTC (视频)
- **数据库**: JSON 文件存储

## 启动方式

### 后端（已启动，端口 3001）
```bash
cd server && node index.js
```

### 前端（已启动，端口 5173）
```bash
cd client && npx vite --host 0.0.0.0 --port 5173
```

## 测试账号

| 用户名 | 密码 | 昵称 |
|--------|------|------|
| alice  | 123456 | 爱丽丝 |
| bob    | 123456 | 鲍勃 |

## 使用步骤

1. 打开应用，注册账号或登录
2. 点击右上角 ＋ 按钮搜索其他用户
3. 发送好友请求，对方接受后即可聊天
4. 点击好友，开始文字聊天
5. 点击"视频通话"按钮发起视频电话

## 项目结构

```
friend-app/
├── server/           # 后端 Express 服务器
│   ├── index.js     # 主服务器（API + Socket.io）
│   └── db.js       # JSON 数据库操作
├── client/          # 前端 React 应用
│   ├── src/
│   │   ├── pages/  # 页面组件
│   │   ├── components/  # UI 组件
│   │   └── hooks/      # 自定义 Hooks
│   └── package.json
└── README.md
```
