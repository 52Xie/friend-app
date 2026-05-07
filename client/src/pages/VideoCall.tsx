import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export default function VideoCall({ user }: { user: any }) {
  const navigate = useNavigate();
  const { socket } = useSocket(user.id);
  const friendId = parseInt(window.location.pathname.split('/').pop() || '0');

  const {
    isCalling, isReceivingCall, callerInfo,
    isMuted, isVideoOff, localVideoRef, remoteVideoRef,
    callUser, acceptCall, rejectCall, endCall, toggleMute, toggleVideo,
    getMedia
  } = useWebRTC({ socket, userId: user.id, friendId, onCallEnded: () => navigate('/') });

  const [hasMedia, setHasMedia] = useState(false);

  useEffect(() => {
    getMedia().then(stream => {
      if (stream) setHasMedia(true);
    });
  }, [getMedia]);

  // 接受通话
  const handleAnswer = () => {
    if (acceptCall) {
      acceptCall();
    }
  };

  if (!hasMedia) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white text-lg">正在获取摄像头和麦克风权限...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col relative">
      {/* 来电弹窗 */}
      {isReceivingCall && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
              {(callerInfo?.nickname || '?')[0].toUpperCase()}
            </div>
            <p className="text-2xl font-bold mb-1">{callerInfo?.nickname || '有人'}</p>
            <p className="text-gray-500 mb-8">邀请你视频通话</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-600 text-white text-3xl hover:bg-red-700 transition shadow-lg"
                title="拒绝"
              >
                📵
              </button>
              <button
                onClick={handleAnswer}
                className="w-16 h-16 rounded-full bg-green-600 text-white text-3xl hover:bg-green-700 transition shadow-lg"
                title="接受"
              >
                📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 视频区域 */}
      <div className="flex-1 relative bg-gray-800">
        {/* 远程视频（全屏） */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {!isCalling && !isReceivingCall && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📹</div>
              <p className="text-xl mb-6">准备视频通话</p>
              <button
                onClick={callUser}
                className="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-green-700 transition shadow-lg"
              >
                拨打视频电话
              </button>
            </div>
          </div>
        )}

        {/* 本地视频（小窗） */}
        <div className="absolute top-4 right-4 w-48 h-64 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 控制栏 */}
      <div className="bg-gray-900/95 backdrop-blur p-4 flex justify-center items-center gap-4">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition shadow-lg ${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition shadow-lg ${
            isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isVideoOff ? '开启摄像头' : '关闭摄像头'}
        >
          {isVideoOff ? '🚫' : '📷'}
        </button>
        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-2xl hover:bg-red-700 transition shadow-lg"
          title="挂断"
        >
          📵
        </button>
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 text-white px-6 py-3 rounded-full hover:bg-gray-600 transition shadow-lg"
        >
          返回聊天
        </button>
      </div>
    </div>
  );
}
