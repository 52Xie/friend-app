import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

// 从 localStorage 获取 token
function getToken() {
  return localStorage.getItem('token');
}

// 请求拦截器
client.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

// API 方法
export const authAPI = {
  register: (username: string, password: string, nickname: string) =>
    client.post('/register', { username, password, nickname }),
  login: (username: string, password: string) =>
    client.post('/login', { username, password }),
  me: () => client.get('/me'),
};

export const friendAPI = {
  search: (q: string) => client.get(`/users/search?q=${encodeURIComponent(q)}`),
  sendRequest: (friend_id: number) => client.post('/friends/request', { friend_id }),
  respond: (friendship_id: number, action: 'accept' | 'reject') =>
    client.post('/friends/respond', { friendship_id, action }),
  getList: () => client.get('/friends'),
};

export const messageAPI = {
  getMessages: (friendId: number) => client.get(`/messages/${friendId}`),
};

export const videoAPI = {
  upload: (title: string, file: File) => {
    const form = new FormData();
    form.append('title', title);
    form.append('video', file);
    return client.post('/videos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  list: () => client.get('/videos'),
};
