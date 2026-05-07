import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FriendList from '../components/FriendList';
import ChatWindow from '../components/ChatWindow';
import { friendAPI } from '../api/client';
import { useSocket } from '../hooks/useSocket';

interface Friend {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
}

export default function Home({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const navigate = useNavigate();
  const { onlineUsers, on, off, emit } = useSocket(user.id);

  // 加载好友列表
  const loadFriends = async () => {
    const res = await friendAPI.getList();
    setFriends(res.data);
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // 监听好友请求响应
  useEffect(() => {
    on('friend_request_accept', () => loadFriends());
    on('friend_request_reject', () => loadFriends());
    return () => { off('friend_request_accept'); off('friend_request_reject'); };
  }, [on, off]);

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Friend App</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.nickname || user.username} 
            <span className="text-green-600 ml-1">● 在线</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
          >
            退出登录
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 好友列表 */}
        <FriendList
          friends={friends}
          onlineUsers={onlineUsers}
          selectedFriend={selectedFriend}
          onSelectFriend={setSelectedFriend}
          userId={user.id}
          onRefresh={loadFriends}
        />

        {/* 聊天区域 */}
        <div className="flex-1 flex flex-col">
          {selectedFriend ? (
            <ChatWindow userId={user.id} friend={selectedFriend} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-400 text-lg">选择一个好友开始聊天</p>
                <p className="text-gray-300 text-sm mt-2">或点击 ＋ 添加新好友</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
