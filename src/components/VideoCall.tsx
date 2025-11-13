/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, PhoneOff, Maximize2, Minimize2, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';

interface VideoCallProps {
  remoteUserId: string;
  appointmentId?: string;
  socket: any;
  onCallEnd?: () => void;
  isInitiator?: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({
  remoteUserId,
  appointmentId,
  socket,
  onCallEnd,
  isInitiator = false,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    localStream,
    remoteStream,
    callState,
    error,
    getLocalStream,
    stopLocalStream,
    createPeerConnection,
    createDataChannel,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    closePeerConnection,
    setCallState,
  } = useWebRTC(socket);

  // Update local video ref
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video ref
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle call duration
  useEffect(() => {
    if (callState === 'connected') {
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callState]);

  // Initialize local stream on mount
  useEffect(() => {
    const initializeCall = async () => {
      try {
        await getLocalStream();
        setCallState('idle');
      } catch (err) {
        console.error('Failed to initialize call:', err);
      }
    };

    initializeCall();

    // Socket.io listeners for signaling
    socket?.on('incomingOffer', handleIncomingOffer);
    socket?.on('incomingAnswer', handleIncomingAnswer);
    socket?.on('incomingIceCandidate', handleIncomingIceCandidate);
    socket?.on('callRejected', handleCallRejected);
    socket?.on('callEnded', handleCallEnded);

    return () => {
      socket?.off('incomingOffer', handleIncomingOffer);
      socket?.off('incomingAnswer', handleIncomingAnswer);
      socket?.off('incomingIceCandidate', handleIncomingIceCandidate);
      socket?.off('callRejected', handleCallRejected);
      socket?.off('callEnded', handleCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, getLocalStream, setCallState]);


  const handleEndCall = useCallback(async () => {
    try {
      // Save call duration
      if (appointmentId && callDuration > 0) {
        // You can send this to your backend
        socket?.emit('callEnded', {
          appointmentId,
          duration: callDuration,
        });
      }

      closePeerConnection();
      stopLocalStream();
      onCallEnd?.();
    } catch (err) {
      console.error('Error ending call:', err);
    }
  }, [appointmentId, callDuration, socket, closePeerConnection, stopLocalStream, onCallEnd]);

  const handleIncomingOffer = useCallback(async (data: any) => {
    const offer = data?.offer ?? data;
    console.log('📥 Incoming offer received:', offer);
    if (!offer) {
      console.warn('⚠️ Incoming offer payload missing `offer`');
      return;
    }
    setIncomingOffer(offer);
  }, []);

  const handleIncomingAnswer = useCallback(
    async (data: any) => {
      const answer = data?.answer ?? data;
      if (!answer) {
        console.warn('⚠️ Incoming answer payload missing `answer`');
        return;
      }
      try {
        await setRemoteDescription(answer);
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    },
    [setRemoteDescription]
  );

  const handleIncomingIceCandidate = useCallback(
    async (data: any) => {
      const candidate = data?.candidate ?? data;
      if (!candidate) {
        console.warn('⚠️ Incoming ICE payload missing `candidate`');
        return;
      }
      try {
        await addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    },
    [addIceCandidate]
  );

  const handleCallRejected = useCallback(() => {
    alert('Call was rejected');
    handleEndCall();
  }, [handleEndCall]);

  const handleCallEnded = useCallback(() => {
    handleEndCall();
  }, [handleEndCall]);

  const handleStartCall = useCallback(async () => {
    try {
      console.log('🎬 handleStartCall invoked');
      setCallState('calling');

      // Create peer connection
      const peerConn = await createPeerConnection(
        (candidate) => {
          console.log('🧊 ICE candidate:', candidate);
          socket?.emit('sendIceCandidate', {
            remoteUserId,
            candidate,
            appointmentId,
          });
        },
        null,
        null
      );

      // Create data channel for messaging
      createDataChannel();

      // Create offer
      const offer = await createOffer();
      console.log('📤 Offer created:', offer);

      // Send offer through socket
      socket?.emit('sendOffer', {
        remoteUserId,
        offer,
        appointmentId,
      });
      console.log('✅ Offer emitted to backend');
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Failed to start call');
    }
  }, [remoteUserId, appointmentId, socket, createPeerConnection, createDataChannel, createOffer, setCallState]);

  useEffect(() => {
    if (!socket || !isInitiator) return;

    const handleOfferRequest = () => {
      console.log('📨 Offer requested by remote participant');
      if (callState === 'calling' || callState === 'connected') {
        return;
      }
      handleStartCall();
    };

    socket.on('requestOffer', handleOfferRequest);

    return () => {
      socket.off('requestOffer', handleOfferRequest);
    };
  }, [socket, isInitiator, handleStartCall, callState]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingOffer) return;

    try {
      setCallState('calling');

      // Create peer connection
      const peerConn = await createPeerConnection(
        (candidate) => {
          socket?.emit('sendIceCandidate', {
            remoteUserId,
            candidate,
            appointmentId,
          });
        },
        null,
        (channel) => {
          console.log('Received data channel:', channel.label);
        }
      );

      // Create answer
      const answer = await createAnswer(incomingOffer);

      // Send answer through socket
      socket?.emit('sendAnswer', {
        remoteUserId,
        answer,
        appointmentId,
      });

      setIncomingOffer(null);
    } catch (err) {
      console.error('Error accepting call:', err);
      alert('Failed to accept call');
    }
  }, [incomingOffer, remoteUserId, appointmentId, socket, createPeerConnection, createAnswer, setCallState]);

  const handleRejectCall = useCallback(() => {
    socket?.emit('rejectCall', {
      remoteUserId,
      appointmentId,
    });
    setIncomingOffer(null);
  }, [remoteUserId, appointmentId, socket]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMicEnabled(!micEnabled);
    }
  }, [localStream, micEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  }, [localStream, videoEnabled]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(!isFullScreen);
  }, [isFullScreen]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full h-full ${isFullScreen ? 'fixed inset-0 z-50' : ''} bg-black`}>
      <div className="flex flex-col h-full">
        {/* Video Container */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs uppercase tracking-wide border border-white/20">
              {callState === 'connected'
                ? 'Live'
                : callState === 'calling'
                  ? 'Connecting'
                  : callState === 'idle'
                    ? 'Ready'
                    : callState}
            </span>
            <Button
              onClick={handleEndCall}
              variant="secondary"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white border border-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local Video */}
          <div className="absolute bottom-4 right-4 w-36 h-28 bg-gray-900 rounded-lg overflow-hidden border border-white/40 shadow-xl backdrop-blur-sm">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Call Duration */}
          {callState === 'connected' && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-semibold">
              {formatDuration(callDuration)}
            </div>
          )}

          {/* Connection Status */}
          {callState !== 'connected' && callState !== 'idle' && (
            <div className="absolute top-4 left-4 bg-blue-500/70 text-white px-4 py-2 rounded-lg text-sm">
              {callState === 'calling' ? 'Connecting...' : callState}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="m-4 bg-red-500/20 border-red-500 text-red-100">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Incoming Call Notification */}
        {incomingOffer && (
          <Card className="m-4 bg-green-500/20 border-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Incoming Video Call</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={handleAcceptCall}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-4 h-4 mr-2" />
                Accept
              </Button>
              <Button
                onClick={handleRejectCall}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Control Bar */}
        <div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-between items-center gap-4">
          <div className="text-white/70 text-sm">
            {callState === 'connected'
              ? 'Call in progress'
              : callState === 'calling'
                ? 'Attempting to connect…'
                : callState === 'idle'
                  ? isInitiator
                    ? 'Waiting for patient to join…'
                    : 'Waiting for incoming call…'
                  : callState}
          </div>

          {callState === 'idle' && !incomingOffer && (
            <>
              {isInitiator ? (
                <div className="text-white text-sm">
                  Waiting for patient to accept the call...
                </div>
              ) : (
                <div className="text-white text-sm">Waiting for incoming call...</div>
              )}
            </>
          )}

          {callState !== 'idle' && !incomingOffer && (
            <>
              <Button
                onClick={toggleMic}
                variant={micEnabled ? 'default' : 'destructive'}
                size="sm"
              >
                {micEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </Button>

              <Button
                onClick={toggleVideo}
                variant={videoEnabled ? 'default' : 'destructive'}
                size="sm"
              >
                {videoEnabled ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
              </Button>

              <Button
                onClick={handleEndCall}
                className="bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>

              <Button
                onClick={toggleFullScreen}
                variant="outline"
                size="sm"
              >
                {isFullScreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
