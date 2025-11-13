import { useRef, useState, useCallback, useEffect } from 'react';

// WebRTC Configuration
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun01.sipphone.com' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.fwdnet.net' },
  { urls: 'stun:stun.ideasip.com' },
  { urls: 'stun:stun.iptel.org' },
  { urls: 'stun:stun.rixtelecom.se' },
  { urls: 'stun:stun.schlund.de' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stunserver.org' },
  { urls: 'stun:stun.softjoys.com' },
  { urls: 'stun:stun.voiparound.com' },
  { urls: 'stun:stun.voipbuster.com' },
  { urls: 'stun:stun.voipstunt.com' },
  { urls: 'stun:stun.voxgratia.org' },
  { urls: 'stun:stun.xten.com' },
];

const PC_CONFIG: RTCConfiguration = {
  iceServers: STUN_SERVERS,
};

/**
 * Custom hook for WebRTC peer connection management
 */
export const useWebRTC = (socket) => {
  const localStreamRef = useRef(null);
  const localPeerConnectionRef = useRef(null);
  const sendChannelRef = useRef(null);
  const receiveChannelRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, connected, ended
  const [error, setError] = useState(null);

  /**
   * Get local media stream
   */
  const getLocalStream = useCallback(async (constraints = { audio: true, video: true }) => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      const isSecureContext = window.isSecureContext || 
        window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1';

      if (!isSecureContext) {
        const currentUrl = window.location.href;
        throw new Error(
          `WebRTC requires HTTPS. You are accessing via HTTP (${currentUrl}). `
        );
      }

      const nav: any = navigator;

      if (nav.mediaDevices?.getUserMedia) {
        const stream = await nav.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      }

      const legacyGetUserMedia =
        nav.getUserMedia ||
        nav.webkitGetUserMedia ||
        nav.mozGetUserMedia ||
        nav.msGetUserMedia;

      if (legacyGetUserMedia) {
        const stream: MediaStream = await new Promise((resolve, reject) => {
          legacyGetUserMedia.call(nav, constraints, resolve, reject);
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      }

      throw new Error(
        'Browser does not support media capture. Ensure you are using a secure context (https) and the latest browser.'
      );
    } catch (err) {
      const errorMessage = `Failed to get local stream: ${(err as Error).message}`;
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err;
    }
  }, []);

  /**
   * Stop local stream
   */
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  /**
   * Create peer connection
   */
  const createPeerConnection = useCallback(
    async (onIceCandidate, onRemoteStream, onDataChannel) => {
      try {
        const peerConnection = new RTCPeerConnection(PC_CONFIG);

        // Add local stream if available
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStreamRef.current);
          });
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate && onIceCandidate) {
            onIceCandidate(event.candidate);
          }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            remoteStreamRef.current = event.streams[0];
            setRemoteStream(event.streams[0]);
            if (onRemoteStream) {
              onRemoteStream(event.streams[0]);
            }
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log('Connection state:', peerConnection.connectionState);
          if (peerConnection.connectionState === 'connected') {
            setCallState('connected');
          } else if (peerConnection.connectionState === 'failed') {
            setError('Connection failed');
            setCallState('ended');
          } else if (peerConnection.connectionState === 'disconnected') {
            setCallState('ended');
          }
        };

        // Handle data channel
        peerConnection.ondatachannel = (event) => {
          if (onDataChannel) {
            onDataChannel(event.channel);
          }
        };

        localPeerConnectionRef.current = peerConnection;
        return peerConnection;
      } catch (err) {
        const errorMessage = `Failed to create peer connection: ${err.message}`;
        setError(errorMessage);
        console.error(errorMessage, err);
        throw err;
      }
    },
    []
  );

  /**
   * Setup data channel event handlers
   */
  const setupDataChannelHandlers = useCallback((channel) => {
    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onclose = () => {
      console.log('Data channel closed');
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }, []);

  /**
   * Create data channel
   */
  const createDataChannel = useCallback(() => {
    if (!localPeerConnectionRef.current) return null;

    try {
      const channel = localPeerConnectionRef.current.createDataChannel('chat', {
        ordered: true,
      });
      sendChannelRef.current = channel;
      setupDataChannelHandlers(channel);
      return channel;
    } catch (err) {
      console.error('Failed to create data channel:', err);
      throw err;
    }
  }, [setupDataChannelHandlers]);

  /**
   * Send data through data channel
   */
  const sendData = useCallback((data) => {
    if (sendChannelRef.current && sendChannelRef.current.readyState === 'open') {
      try {
        sendChannelRef.current.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.error('Failed to send data:', err);
        return false;
      }
    }
    return false;
  }, []);

  /**
   * Create offer
   */
  const createOffer = useCallback(async () => {
    if (!localPeerConnectionRef.current) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await localPeerConnectionRef.current.createOffer();
      await localPeerConnectionRef.current.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error('Failed to create offer:', err);
      throw err;
    }
  }, []);

  /**
   * Create answer
   */
  const createAnswer = useCallback(async (offer) => {
    if (!localPeerConnectionRef.current) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await localPeerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await localPeerConnectionRef.current.createAnswer();
      await localPeerConnectionRef.current.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error('Failed to create answer:', err);
      throw err;
    }
  }, []);

  /**
   * Set remote description
   */
  const setRemoteDescription = useCallback(async (description) => {
    if (!localPeerConnectionRef.current) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await localPeerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(description)
      );
    } catch (err) {
      console.error('Failed to set remote description:', err);
      throw err;
    }
  }, []);

  /**
   * Add ICE candidate
   */
  const addIceCandidate = useCallback(async (candidate) => {
    if (!localPeerConnectionRef.current) return;

    try {
      if (candidate) {
        await localPeerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  }, []);

  /**
   * Close peer connection
   */
  const closePeerConnection = useCallback(() => {
    if (localPeerConnectionRef.current) {
      localPeerConnectionRef.current.close();
      localPeerConnectionRef.current = null;
    }

    if (sendChannelRef.current) {
      sendChannelRef.current.close();
      sendChannelRef.current = null;
    }

    if (receiveChannelRef.current) {
      receiveChannelRef.current.close();
      receiveChannelRef.current = null;
    }

    remoteStreamRef.current = null;
    setRemoteStream(null);
    setCallState('idle');
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopLocalStream();
      closePeerConnection();
    };
  }, [stopLocalStream, closePeerConnection]);

  return {
    localStream,
    remoteStream,
    callState,
    error,
    getLocalStream,
    stopLocalStream,
    createPeerConnection,
    createDataChannel,
    sendData,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    closePeerConnection,
    setCallState,
    setupDataChannelHandlers,
  };
};

export default useWebRTC;
