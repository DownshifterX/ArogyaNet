import React, { useEffect, useCallback, useState, useRef } from "react";
import type { Socket } from "socket.io-client";
import peer from "@/services/peer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

interface VideoCallRoomProps {
  socket: Socket;
  userId: string;
  appointmentId: string;
  isInitiator: boolean;
  onCallEnd?: () => void;
}

const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  socket,
  userId,
  appointmentId,
  isInitiator,
  onCallEnd,
}) => {
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Join the room on mount
  useEffect(() => {
    console.log('🚪 Joining room:', { userId, appointmentId });
    socket.emit("room:join", { userId, appointmentId });

    return () => {
      // Cleanup on unmount
      if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
      }
      peer.closePeer();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [socket, userId, appointmentId]);

  // Handle user joined
  const handleUserJoined = useCallback(({ userId: joinedUserId, id }: { userId: string; id: string }) => {
    console.log(`✅ User ${joinedUserId} joined room with socket ${id}`);
    setRemoteSocketId(id);
  }, []);

  // Handle room join confirmation
  const handleRoomJoin = useCallback((data: { userId: string; appointmentId: string }) => {
    console.log("✅ Room joined successfully:", data);
  }, []);

  // Initiator calls the other user
  const handleCallUser = useCallback(async () => {
    if (!remoteSocketId) {
      console.error("❌ No remote user to call");
      return;
    }

    try {
      console.log("📞 Getting user media...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      
      console.log("📞 Creating peer connection...");
      peer.initializePeer();
      
      const offer = await peer.getOffer();
      console.log("📤 Sending offer to:", remoteSocketId);
      socket.emit("user:call", { to: remoteSocketId, offer });
      setMyStream(stream);
      
      // Start call duration timer
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    } catch (error) {
      console.error("❌ Error calling user:", error);
      alert("Failed to access camera/microphone. Please check permissions.");
    }
  }, [remoteSocketId, socket]);

  // Handle incoming call
  const handleIncommingCall = useCallback(
    async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log(`📥 Incoming call from ${from}`);
      setRemoteSocketId(from);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
        
        console.log("📞 Creating peer connection...");
        peer.initializePeer();
        
        const ans = await peer.getAnswer(offer);
        console.log("📤 Sending answer to:", from);
        socket.emit("call:accepted", { to: from, ans });
        
        // Start call duration timer
        callStartTimeRef.current = Date.now();
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
        }, 1000);
      } catch (error) {
        console.error("❌ Error handling incoming call:", error);
        alert("Failed to access camera/microphone. Please check permissions.");
      }
    },
    [socket]
  );

  // Send local stream tracks to peer
  const sendStreams = useCallback(() => {
    if (!myStream || !peer.peer) {
      console.error("❌ Cannot send streams - myStream or peer not ready");
      return;
    }
    
    console.log("📤 Sending local stream tracks to peer");
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  // Handle call accepted
  const handleCallAccepted = useCallback(
    ({ ans }: { from: string; ans: RTCSessionDescriptionInit }) => {
      console.log("✅ Call accepted, setting remote description");
      peer.setLocalDescription(ans);
      console.log("📤 Sending streams...");
      sendStreams();
    },
    [sendStreams]
  );

  // Handle negotiation needed
  const handleNegoNeeded = useCallback(async () => {
    if (!remoteSocketId) return;
    
    console.log("🔄 Negotiation needed");
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  // Set up negotiation listener
  useEffect(() => {
    if (!peer.peer) return;
    
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      if (peer.peer) {
        peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
      }
    };
  }, [handleNegoNeeded]);

  // Handle incoming negotiation
  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log("🔄 Incoming negotiation from:", from);
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  // Handle negotiation final
  const handleNegoNeedFinal = useCallback(async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
    console.log("✅ Negotiation final");
    await peer.setLocalDescription(ans);
  }, []);

  // Handle incoming tracks
  useEffect(() => {
    if (!peer.peer) return;
    
    const handleTrack = (ev: RTCTrackEvent) => {
      console.log("🎥 GOT REMOTE TRACKS!!");
      const streams = ev.streams;
      setRemoteStream(streams[0]);
    };
    
    peer.peer.addEventListener("track", handleTrack);
    return () => {
      if (peer.peer) {
        peer.peer.removeEventListener("track", handleTrack);
      }
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("room:join", handleRoomJoin);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("room:join", handleRoomJoin);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleRoomJoin,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  // Update video refs
  useEffect(() => {
    if (localVideoRef.current && myStream) {
      localVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Toggle mic
  const toggleMic = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (myStream) {
      myStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // End call
  const handleEndCall = () => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    peer.closePeer();
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    onCallEnd?.();
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Local Video (Picture-in-Picture) */}
        {myStream && (
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Call Duration */}
        {myStream && remoteStream && (
          <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-semibold">
            {formatDuration(callDuration)}
          </div>
        )}

        {/* Connection Status */}
        {!remoteStream && myStream && (
          <div className="absolute top-4 left-4 bg-blue-500/70 text-white px-4 py-2 rounded-lg text-sm">
            {remoteSocketId ? "Connecting..." : "Waiting for other user..."}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-center items-center gap-4">
        {/* If no stream yet and we have remote user, show call button for initiator */}
        {!myStream && remoteSocketId && isInitiator && (
          <Button
            onClick={handleCallUser}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Phone className="w-5 h-5 mr-2" />
            Start Call
          </Button>
        )}

        {/* If no stream yet and no remote user */}
        {!myStream && !remoteSocketId && (
          <div className="text-white text-sm">
            {isInitiator ? "Waiting for other user to join..." : "Waiting to join room..."}
          </div>
        )}

        {/* If we have stream, show send stream button if not sent yet */}
        {myStream && !remoteStream && remoteSocketId && (
          <Button
            onClick={sendStreams}
            className="bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            Send Stream
          </Button>
        )}

        {/* Call controls when stream is active */}
        {myStream && (
          <>
            <Button
              onClick={toggleMic}
              variant={micEnabled ? "default" : "destructive"}
              size="lg"
            >
              {micEnabled ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </Button>

            <Button
              onClick={toggleVideo}
              variant={videoEnabled ? "default" : "destructive"}
              size="lg"
            >
              {videoEnabled ? (
                <VideoIcon className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
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
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCallRoom;
