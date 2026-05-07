import { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../api/client';
import { useSocket } from '../hooks/useSocket';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  type: string;
  created_at: string;
}

interface Props {
  userId: number;
  friend: { id: number; nickname: string; username: string };
}

export default function ChatWindow({ userId, friend }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { emit, on, off } = useSocket(userId);

  // 加载历史消息
  const loadMessages = async () => {
    const res = await messageAPI.getMessages(friend.id);
    setMessages(res.data);
  };

  useEffect(() => {
    loadMessages();
  }, [friend.id]);

  // 监听新消息
  useEffect(() => {
    on('receive_message', (msg: Message) => {
      if (msg.sender_id === friend.id || msg.receiver_id === friend.id) {
        setMessages(prev => [...prev, msg]);
      }
    });
    on('message_sent', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      off('receive_message');
      off('message_sent');
    };
  }, [friend.id, on, off]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    emit('send_message', {
      receiver_id: friend.id,
      content: input.trim(),
      type: 'text'
    });
    setInput('');
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 聊天头部 */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
            {(friend.nickname || friend.username)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{friend.nickname || friend.username}</p>
            <p className="text-xs text-gray-500">@{friend.username}</p>
          </div>
        </div>
        <a
          href={`/video-call/${friend.id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          📹 视频通话
        </a>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">还没有消息，开始聊天吧！</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                isMe
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 rounded-bl-md border'
              }`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
