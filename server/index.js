import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import db from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const JWT_SECRET = 'friend-app-secret-key-change-in-production';
const PORT = 3001;
const UPLOAD_DIR = join(__dirname, 'uploads');

// 确保上传目录存在
async function ensureUploadDir() {
  try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch (e) {}
}
ensureUploadDir();

// 中间件
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// JWT 验证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== 认证 API ====================

// 注册
app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  const existing = db.findUserByUsername(username);
  if (existing) return res.status(400).json({ error: '用户名已存在' });

  const password_hash = bcrypt.hashSync(password, 10);
  const user = db.createUser({ username, password_hash, nickname: nickname || username, avatar: '' });
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar } });
});

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar } });
});

// 获取当前用户
app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar });
});

// ==================== 好友 API ====================

// 搜索用户
app.get('/api/users/search', authMiddleware, (req, res) => {
  const { q } = req.query;
  const dbData = db.read();
  const users = dbData.users
    .filter(u => u.id !== req.user.id && u.username.includes(q || ''))
    .map(u => ({ id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar }));
  res.json(users);
});

// 发送好友请求
app.post('/api/friends/request', authMiddleware, (req, res) => {
  const { friend_id } = req.body;
  if (friend_id === req.user.id) return res.status(400).json({ error: '不能添加自己' });

  const existing = db.findFriendship(req.user.id, friend_id);
  if (existing) return res.status(400).json({ error: '好友关系已存在' });

  const friendship = db.createFriendship({
    user_id: req.user.id,
    friend_id,
    status: 'pending',
    created_at: new Date().toISOString()
  });

  // 通知目标用户
  const targetSocket = onlineUsers.get(friend_id);
  if (targetSocket) {
    targetSocket.emit('friend_request', {
      from: { id: req.user.id, username: db.findUserById(req.user.id).username },
      friendship_id: friendship.id
    });
  }

  res.json({ success: true, friendship });
});

// 处理好友请求
app.post('/api/friends/respond', authMiddleware, (req, res) => {
  const { friendship_id, action } = req.body; // action: 'accept' or 'reject'
  const friendship = db.read().friendships.find(f => f.id === friendship_id);
  
  if (!friendship || friendship.friend_id !== req.user.id) {
    return res.status(404).json({ error: '请求不存在' });
  }

  if (action === 'accept') {
    db.updateFriendship(friendship_id, 'accepted');
  } else {
    const data = db.read();
    data.friendships = data.friendships.filter(f => f.id !== friendship_id);
    db.write(data);
  }

  // 通知发送请求的用户
  const requesterSocket = onlineUsers.get(friendship.user_id);
  if (requesterSocket) {
    requesterSocket.emit('friend_request_' + action, { friendship_id });
  }

  res.json({ success: true });
});

// 获取好友列表
app.get('/api/friends', authMiddleware, (req, res) => {
  const friends = db.getFriends(req.user.id);
  res.json(friends);
});

// ==================== 聊天 API ====================

// 获取聊天记录
app.get('/api/messages/:friendId', authMiddleware, (req, res) => {
  const messages = db.getMessagesBetween(req.user.id, parseInt(req.params.friendId));
  res.json(messages);
});

// ==================== 视频 API ====================

// 上传视频
app.post('/api/videos/upload', authMiddleware, async (req, res) => {
  try {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      // 解析 multipart/form-data 的一个简单方式
      const contentType = req.headers['content-type'] || '';
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) return res.status(400).json({ error: '无效的表单数据' });

      // 使用 busboy 或直接存文件 - 简化版：直接接受 base64
      // 实际上这里我们用 JSON 方式上传
      res.json({ error: '请使用 JSON 方式上传' });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// JSON 方式上传视频（base64）
app.post('/api/videos', authMiddleware, async (req, res) => {
  const { title, content_type, data } = req.body;
  if (!title || !data) return res.status(400).json({ error: '标题和数据必填' });

  // data 是 base64 编码的视频数据
  const buffer = Buffer.from(data, 'base64');
  const filename = `${Date.now()}_${req.user.id}.mp4`;
  const filepath = join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);

  const video = db.saveVideo({
    user_id: req.user.id,
    title,
    file_path: `/uploads/${filename}`,
    created_at: new Date().toISOString()
  });

  res.json(video);
});

// 获取视频列表
app.get('/api/videos', authMiddleware, (req, res) => {
  const videos = db.getAllVideos();
  res.json(videos);
});

// ==================== 前端静态文件 ====================

// 托管前端构建产物
app.use(express.static(join(__dirname, '../client/dist')));

// 所有非 API 路由返回 index.html（支持 React Router）
app.get('*', (req, res) => {
  // 跳过 API 和 uploads 路径（已由上面中间件处理）
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// ==================== Socket.io 实时通信 ====================

const onlineUsers = new Map(); // userId -> socket

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 用户上线
  socket.on('register', (userId) => {
    socket.userId = userId;
    onlineUsers.set(userId, socket);
    // 广播在线状态
    socket.broadcast.emit('user_status', { user_id: userId, online: true });
    console.log(`用户 ${userId} 上线`);
  });

  // 发送聊天消息
  socket.on('send_message', (data) => {
    const { receiver_id, content, type } = data;
    const message = db.saveMessage({
      sender_id: socket.userId,
      receiver_id,
      content,
      type: type || 'text',
      created_at: new Date().toISOString()
    });

    // 发送给接收者
    const receiverSocket = onlineUsers.get(receiver_id);
    if (receiverSocket) {
      receiverSocket.emit('receive_message', message);
    }
    // 回传给发送者确认
    socket.emit('message_sent', message);
  });

  // WebRTC 信令 - 发起视频通话
  socket.on('call_user', (data) => {
    const { target_user_id, offer } = data;
    const targetSocket = onlineUsers.get(target_user_id);
    if (targetSocket) {
      targetSocket.emit('incoming_call', {
        from_user_id: socket.userId,
        from_nickname: db.findUserById(socket.userId)?.nickname,
        offer
      });
    }
  });

  // WebRTC 信令 - 接受通话
  socket.on('accept_call', (data) => {
    const { target_user_id, answer } = data;
    const targetSocket = onlineUsers.get(target_user_id);
    if (targetSocket) {
      targetSocket.emit('call_accepted', { answer });
    }
  });

  // WebRTC 信令 - ICE candidate
  socket.on('ice_candidate', (data) => {
    const { target_user_id, candidate } = data;
    const targetSocket = onlineUsers.get(target_user_id);
    if (targetSocket) {
      targetSocket.emit('ice_candidate', { candidate });
    }
  });

  // 挂断电话
  socket.on('end_call', (data) => {
    const { target_user_id } = data;
    const targetSocket = onlineUsers.get(target_user_id);
    if (targetSocket) {
      targetSocket.emit('call_ended');
    }
  });

  // 拒绝通话
  socket.on('reject_call', (data) => {
    const { target_user_id } = data;
    const targetSocket = onlineUsers.get(target_user_id);
    if (targetSocket) {
      targetSocket.emit('call_rejected');
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit('user_status', { user_id: socket.userId, online: false });
      console.log(`用户 ${socket.userId} 下线`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});
