// Friend App 后端 - Deno Deploy 版本
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const JWT_SECRET = "friend-app-secret-key-2024";

// 内存数据库
const db = {
  users: [] as any[],
  friendships: [] as any[],
  messages: [] as any[],
  nextId: 1,
};

// 在线用户
const onlineUsers = new Map();

// 工具函数
function generateId() { return db.nextId++; }

function findUserByUsername(username: string) {
  return db.users.find((u: any) => u.username === username);
}

function findUserById(id: number) {
  return db.users.find((u: any) => u.id === id);
}

// 简单哈希（Deno 没有 bcrypt，用简单方式）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + JWT_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await hashPassword(password) === hash;
}

// JWT 简易实现
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createToken(payload: any): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now() }));
  // 简化版签名
  const sig = base64url(header + '.' + body + JWT_SECRET);
  return `${header}.${body}.${sig}`;
}

function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    const body = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (body.exp && body.exp < Date.now() / 1000) return null;
    return body;
  } catch { return null; }
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 前端 HTML
const HTML = await fetch('https://raw.githubusercontent.com/52Xie/friend-app/main/docs/index.html')
  .then(r => r.text())
  .catch(() => '<h1>Friend App</h1>');

// 路由处理
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 静态文件
  if (path === '/' || path === '/index.html') {
    return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders } });
  }

  // API 路由
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const currentUser = token ? verifyToken(token) : null;

  // 注册
  if (path === '/api/register' && method === 'POST') {
    const body = await request.json();
    const { username, password, nickname } = body;
    if (!username || !password) {
      return Response.json({ error: '用户名和密码必填' }, { status: 400, headers: corsHeaders });
    }
    if (findUserByUsername(username)) {
      return Response.json({ error: '用户名已存在' }, { status: 400, headers: corsHeaders });
    }
    const password_hash = await hashPassword(password);
    const user = { id: generateId(), username, password_hash, nickname: nickname || username, avatar: '' };
    db.users.push(user);
    const jwt = createToken({ id: user.id, username: user.username });
    return Response.json({
      token: jwt,
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }
    }, { headers: corsHeaders });
  }

  // 登录
  if (path === '/api/login' && method === 'POST') {
    const body = await request.json();
    const { username, password } = body;
    const user = findUserByUsername(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return Response.json({ error: '用户名或密码错误' }, { status: 401, headers: corsHeaders });
    }
    const jwt = createToken({ id: user.id, username: user.username });
    return Response.json({
      token: jwt,
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }
    }, { headers: corsHeaders });
  }

  // 需要认证的接口
  if (!currentUser) {
    return Response.json({ error: '未登录' }, { status: 401, headers: corsHeaders });
  }

  // 获取当前用户
  if (path === '/api/me' && method === 'GET') {
    const user = findUserById(currentUser.id);
    return Response.json({ id: user.id, username: user.username, nickname: user.nickname }, { headers: corsHeaders });
  }

  // 搜索用户
  if (path === '/api/users/search' && method === 'GET') {
    const q = url.searchParams.get('q') || '';
    const users = db.users
      .filter((u: any) => u.id !== currentUser.id && u.username.includes(q))
      .map((u: any) => ({ id: u.id, username: u.username, nickname: u.nickname }));
    return Response.json(users, { headers: corsHeaders });
  }

  // 发送好友请求
  if (path === '/api/friends/request' && method === 'POST') {
    const { friend_id } = await request.json();
    if (friend_id === currentUser.id) {
      return Response.json({ error: '不能添加自己' }, { status: 400, headers: corsHeaders });
    }
    const existing = db.friendships.find((f: any) =>
      (f.user_id === currentUser.id && f.friend_id === friend_id) ||
      (f.user_id === friend_id && f.friend_id === currentUser.id)
    );
    if (existing) {
      return Response.json({ error: '好友关系已存在' }, { status: 400, headers: corsHeaders });
    }
    db.friendships.push({ id: generateId(), user_id: currentUser.id, friend_id, status: 'pending', created_at: new Date().toISOString() });
    return Response.json({ success: true }, { headers: corsHeaders });
  }

  // 处理好友请求
  if (path === '/api/friends/respond' && method === 'POST') {
    const { friendship_id, action } = await request.json();
    const f = db.friendships.find((f: any) => f.id === friendship_id);
    if (!f || f.friend_id !== currentUser.id) {
      return Response.json({ error: '请求不存在' }, { status: 404, headers: corsHeaders });
    }
    if (action === 'accept') { f.status = 'accepted'; }
    else { db.friendships = db.friendships.filter((x: any) => x.id !== friendship_id); }
    return Response.json({ success: true }, { headers: corsHeaders });
  }

  // 好友列表
  if (path === '/api/friends' && method === 'GET') {
    const friendIds = db.friendships
      .filter((f: any) => (f.user_id === currentUser.id || f.friend_id === currentUser.id) && f.status === 'accepted')
      .map((f: any) => f.user_id === currentUser.id ? f.friend_id : f.user_id);
    const friends = db.users
      .filter((u: any) => friendIds.includes(u.id))
      .map((u: any) => ({ id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar }));
    return Response.json(friends, { headers: corsHeaders });
  }

  // 获取聊天记录
  if (path.startsWith('/api/messages/') && method === 'GET') {
    const friendId = parseInt(path.split('/').pop() || '0');
    const messages = db.messages.filter((m: any) =>
      (m.sender_id === currentUser.id && m.receiver_id === friendId) ||
      (m.sender_id === friendId && m.receiver_id === currentUser.id)
    );
    return Response.json(messages, { headers: corsHeaders });
  }

  return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
}

serve(handleRequest, { port: 8000 });
