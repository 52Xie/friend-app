import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'database.json');

// 初始化数据库文件
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      friendships: [],
      messages: [],
      videos: [],
      sessions: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// 读取数据库
function readDB() {
  initDB();
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

// 写入数据库
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// 生成 ID
function generateId(collection) {
  const db = readDB();
  const items = db[collection] || [];
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

// 通用 CRUD 操作
const db = {
  read: readDB,
  write: writeDB,
  generateId,

  // 用户操作
  findUserByUsername(username) {
    const db = readDB();
    return db.users.find(u => u.username === username);
  },

  findUserById(id) {
    const db = readDB();
    return db.users.find(u => u.id === id);
  },

  createUser(user) {
    const db = readDB();
    user.id = generateId('users');
    db.users.push(user);
    writeDB(db);
    return user;
  },

  // 好友关系操作
  getFriends(userId) {
    const db = readDB();
    const relations = db.friendships.filter(
      f => (f.user_id === userId || f.friend_id === userId) && f.status === 'accepted'
    );
    const friendIds = relations.map(f => f.user_id === userId ? f.friend_id : f.user_id);
    return db.users.filter(u => friendIds.includes(u.id)).map(u => ({ ...u, password_hash: undefined }));
  },

  getPendingRequests(userId) {
    const db = readDB();
    const requests = db.friendships.filter(
      f => f.friend_id === userId && f.status === 'pending'
    );
    return requests.map(r => {
      const fromUser = db.users.find(u => u.id === r.user_id);
      return {
        id: r.id,
        from_user: { id: fromUser.id, username: fromUser.username, nickname: fromUser.nickname },
        created_at: r.created_at
      };
    });
  },

  findFriendship(userA, userB) {
    const db = readDB();
    return db.friendships.find(
      f => (f.user_id === userA && f.friend_id === userB) ||
           (f.user_id === userB && f.friend_id === userA)
    );
  },

  createFriendship(friendship) {
    const db = readDB();
    friendship.id = generateId('friendships');
    db.friendships.push(friendship);
    writeDB(db);
    return friendship;
  },

  updateFriendship(id, status) {
    const db = readDB();
    const f = db.friendships.find(f => f.id === id);
    if (f) f.status = status;
    writeDB(db);
    return f;
  },

  // 消息操作
  saveMessage(message) {
    const db = readDB();
    message.id = generateId('messages');
    db.messages.push(message);
    writeDB(db);
    return message;
  },

  getMessagesBetween(userA, userB) {
    const db = readDB();
    return db.messages
      .filter(m => 
        (m.sender_id === userA && m.receiver_id === userB) ||
        (m.sender_id === userB && m.receiver_id === userA)
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  // 视频操作
  saveVideo(video) {
    const db = readDB();
    video.id = generateId('videos');
    db.videos.push(video);
    writeDB(db);
    return video;
  },

  getVideosByUser(userId) {
    const db = readDB();
    return db.videos.filter(v => v.user_id === userId);
  },

  getAllVideos() {
    const db = readDB();
    return db.videos.map(v => {
      const user = db.users.find(u => u.id === v.user_id);
      return { ...v, user_nickname: user?.nickname || 'Unknown' };
    });
  }
};

export default db;
