import { useState, useEffect } from 'react';
import { friendAPI } from '../api/client';
import { useSocket } from '../hooks/useSocket';

interface Friend {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
}

interface Props {
  friends: Friend[];
  onlineUsers: Set<number>;
  selectedFriend: Friend | null;
  onSelectFriend: (f: Friend) => void;
  userId: number;
  onRefresh: () => void;
}

export default function FriendList({ friends, onlineUsers, selectedFriend, onSelectFriend, userId, onRefresh }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { emit, on, off } = useSocket(userId);

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await friendAPI.search(searchQuery);
      setSearchResults(res.data);
    } finally { setLoading(false); }
  };

  // 发送好友请求
  const sendRequest = async (friendId: number) => {
    await friendAPI.sendRequest(friendId);
    alert('好友请求已发送！');
  };

  // 监听好友请求
  useEffect(() => {
    on('friend_request', (data: any) => {
      setRequests(prev => [...prev, data]);
    });
    on('friend_request_accept', () => {
      onRefresh();
    });
    return () => { off('friend_request'); off('friend_request_accept'); };
  }, [on, off, onRefresh]);

  // 处理好友请求
  const respondRequest = async (friendship_id: number, action: 'accept' | 'reject') => {
    await friendAPI.respond(friendship_id, action);
    setRequests(prev => prev.filter(r => r.friendship_id !== friendship_id));
    if (action === 'accept') onRefresh();
  };

  return (
    <div className="w-72 bg-white border-r flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-gray-800">好友</h2>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
            title="添加好友"
          >
            ＋
          </button>
        </div>

        {/* 好友请求通知 */}
        {requests.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-semibold text-orange-600 mb-2">新的好友请求 ({requests.length})</p>
            {requests.map(r => (
              <div key={r.friendship_id} className="flex items-center gap-2 text-sm bg-orange-50 p-2 rounded mb-1">
                <span className="flex-1">{r.from_user.username}</span>
                <button onClick={() => respondRequest(r.friendship_id, 'accept')} className="text-green-600 text-xs">接受</button>
                <button onClick={() => respondRequest(r.friendship_id, 'reject')} className="text-red-600 text-xs">拒绝</button>
              </div>
            ))}
          </div>
        )}

        {/* 搜索面板 */}
        {searchOpen && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="搜索用户名..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleSearch} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">搜</button>
            </div>
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                <span>{u.nickname} (@{u.username})</span>
                <button onClick={() => sendRequest(u.id)} className="text-blue-600 text-xs">添加</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto">
        {friends.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-8">还没有好友，快去添加吧！</p>
        )}
        {friends.map(f => (
          <div
            key={f.id}
            onClick={() => onSelectFriend(f)}
            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition ${
              selectedFriend?.id === f.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
            }`}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                {(f.nickname || f.username)[0].toUpperCase()}
              </div>
              {onlineUsers.has(f.id) && (
                <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{f.nickname || f.username}</p>
              <p className="text-xs text-gray-500">@{f.username}</p>
            </div>
            {onlineUsers.has(f.id) ? (
              <span className="text-xs text-green-600">在线</span>
            ) : (
              <span className="text-xs text-gray-400">离线</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
