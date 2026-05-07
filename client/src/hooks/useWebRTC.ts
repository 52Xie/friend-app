import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';

interface UseWebRTCProps {
  socket: any;
  userId: number;
  friendId: number;
  onCallEnded: () => void;
}

export function useWebRTC({ socket, userId, friendId, onCallEnded }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{ id: number; nickname: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);

  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 本地视频 ref（由组件通过 ref callback 设置）
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // 安全的 destroy peer
  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  }, []);

  // 结束通话（通用）
  const endCall = useCallback(() => {
    destroyPeer();
    setIsCalling(false);
    setIsReceivingCall(false);
    setCallerInfo(null);
    setIncomingOffer(null);

    // 停止本地流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (socket && isCalling) {
      socket.emit('end_call', { target_user_id: friendId });
    }
    onCallEnded();
  }, [destroyPeer, socket, friendId, isCalling, onCallEnded]);

  // 获取本地媒体流
  const getMedia = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('无法获取摄像头/麦克风', err);
      alert('请允许访问摄像头和麦克风');
      return null;
    }
  }, []);

  // 发起视频通话
  const callUser = useCallback(async () => {
    const stream = await getMedia();
    if (!stream || !socket) return;

    destroyPeer();
    setIsCalling(true);

    const peer = new SimplePeer({ initiator: true, trickle: false, stream });

    peer.on('signal', (data: any) => {
      socket.emit('call_user', { target_user_id: friendId, offer: data });
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });

    peer.on('error', (err: any) => console.error('Peer error:', err));
    peer.on('close', () => {
      if (peerRef.current === peer) endCall();
    });

    peerRef.current = peer;
  }, [getMedia, socket, friendId, destroyPeer, endCall]);

  // 接受视频通话
  const acceptCall = useCallback(async () => {
    const stream = await getMedia();
    if (!stream || !socket || !incomingOffer) return;

    destroyPeer();
    setIsReceivingCall(false);
    setIsCalling(true);

    const peer = new SimplePeer({ initiator: false, trickle: false, stream });

    peer.on('signal', (data: any) => {
      socket.emit('accept_call', { target_user_id: callerInfo?.id, answer: data });
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });

    peer.on('error', (err: any) => console.error('Peer error:', err));
    peer.on('close', () => {
      if (peerRef.current === peer) endCall();
    });

    peer.signal(incomingOffer);
    peerRef.current = peer;
    setIncomingOffer(null);
  }, [getMedia, socket, incomingOffer, callerInfo, destroyPeer, endCall]);

  // 拒绝通话
  const rejectCall = useCallback(() => {
    if (socket && callerInfo) {
      socket.emit('reject_call', { target_user_id: callerInfo.id });
    }
    setIsReceivingCall(false);
    setCallerInfo(null);
    setIncomingOffer(null);
  }, [socket, callerInfo]);

  // 静音切换
  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(t => (t.enabled = !t.enabled));
      setIsMuted(prev => !prev);
    }
  }, []);

  // 摄像头切换
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(t => (t.enabled = !t.enabled));
      setIsVideoOff(prev => !prev);
    }
  }, []);

  // 监听 Socket 来电事件
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: any) => {
      setIsReceivingCall(true);
      setCallerInfo({ id: data.from_user_id, nickname: data.from_nickname });
      setIncomingOffer(data.offer);
    };

    const handleCallAccepted = (data: any) => {
      if (peerRef.current) {
        peerRef.current.signal(data.answer);
      }
    };

    const handleCallRejected = () => {
      alert('对方拒绝了视频通话');
      endCall();
    };

    const handleCallEnded = () => {
      endCall();
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, endCall]);

  return {
    localStream, remoteStream, isCalling, isReceivingCall, callerInfo,
    isMuted, isVideoOff,
    localVideoRef, remoteVideoRef,
    callUser, acceptCall, rejectCall, endCall, toggleMute, toggleVideo,
    getMedia
  };
}
