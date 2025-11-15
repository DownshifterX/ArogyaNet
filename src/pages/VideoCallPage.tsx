import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';

import peerService from '@/services/peerService';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VideoCallPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const { toast } = useToast();

  const [remoteUserId, setRemoteUserId] = useState<string | null>(searchParams.get('remoteUserId'));
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const iceDisconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);
  const isNegotiating = useRef<boolean>(false);
  const didAutoInitRef = useRef<boolean>(false);

  const isDoctor = user?.role === 'doctor';

  // Helper: navigate to dashboard with a full page reload to ensure clean state
  const goToDashboardWithReload = useCallback(() => {
    const path = isDoctor ? '/doctor-dashboard' : '/patient-dashboard';
    // Use hard navigation to force a full reload and media cleanup
    window.location.assign(path);
  }, [isDoctor]);

  // Initialize media stream
  const initializeMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      setMyStream(stream);
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
        try { await myVideoRef.current.play(); } catch (e) { setPlaybackBlocked(true); }
      }

      console.log('📹 Local stream initialized');
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      toast({
        title: 'Camera/Microphone Error',
        description: 'Could not access camera or microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Identify user with socket
  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('identify', user.id);
      console.log('👤 Identified with socket - User ID:', user.id, 'Socket ID:', socket.id);
    }
  }, [socket, user?.id]);

  // Handle incoming call (Patient side) - reference flow
  const handleIncomingCall = useCallback(async ({ from, offer, appointmentId: incomingAppointmentId }: any) => {
    console.log('📞 🔥 INCOMING CALL EVENT RECEIVED 🔥');
    console.log('📞 From userId:', from, 'appointmentId:', incomingAppointmentId, 'expected:', appointmentId);
    console.log('📞 Offer:', offer ? 'PRESENT' : 'MISSING', 'isDoctor:', isDoctor);
    
    if (incomingAppointmentId !== appointmentId) {
      console.log('⚠️ Appointment ID mismatch - ignoring call');
      return;
    }

    setRemoteUserId(from);
    setCallStatus('ringing');

    // Get patient's media stream
    console.log('📹 Patient requesting camera/mic access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      
      console.log('✅ Patient got media stream:', {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
      });
      
      setMyStream(stream);
      
      if (myVideoRef.current) {
        console.log('📺 Setting patient video srcObject');
        myVideoRef.current.srcObject = stream;
        await myVideoRef.current.play().catch((e) => {
          console.error('❌ Patient video play failed:', e);
          setPlaybackBlocked(true);
        });
        console.log('▶️ Patient video playing');
      }

      console.log('📹 Patient stream initialized');
      
      // Create answer
      const ans = await peerService.getAnswer(offer);
      if (ans) {
        socket?.emit('call:accepted', { toUserId: from, ans, appointmentId });
        console.log('✅ Call accepted, answer sent to userId:', from);
        
        // Patient adds their tracks after answer (reference flow)
        peerService.addStream(stream);
        console.log('📤 Patient attached local tracks after answer');
        
        // Rely on negotiationneeded event; avoid proactive renegotiation to prevent races
        
        // Flush any queued ICE candidates now that remote description is set
        if (pendingIceCandidates.current.length) {
          console.log(`🧊 Flushing ${pendingIceCandidates.current.length} queued ICE candidates`);
          for (const c of pendingIceCandidates.current) {
            await peerService.addIceCandidate(c);
          }
          pendingIceCandidates.current = [];
        }

        setCallStatus('connected');
      }
    } catch (error) {
      console.error('❌ Patient getUserMedia failed:', error);
      toast({
        title: 'Camera Access Failed',
        description: 'Could not access camera or microphone',
        variant: 'destructive',
      });
      return;
    }
  }, [appointmentId, socket, remoteUserId, toast, isDoctor]);

  // Handle call accepted (Doctor side) - reference flow
  const handleCallAccepted = useCallback(async ({ from, ans }: any) => {
    console.log('✅ Call accepted by userId:', from);
    setRemoteUserId(from);
    await peerService.setRemoteDescription(ans);
    // Flush any queued ICE candidates now that remote description is set
    if (pendingIceCandidates.current.length) {
      console.log(`🧊 Flushing ${pendingIceCandidates.current.length} queued ICE candidates`);
      for (const c of pendingIceCandidates.current) {
        await peerService.addIceCandidate(c);
      }
      pendingIceCandidates.current = [];
    }
    setCallStatus('connected');

    // Attach local tracks after answer - triggers renegotiation (reference flow)
    if (myStream) {
      peerService.addStream(myStream);
      console.log('📤 Attached local tracks after answer - will trigger renegotiation');
      // Rely on negotiationneeded event; avoid proactive renegotiation to prevent races
    }
  }, [myStream, remoteUserId, socket, appointmentId]);

  // Initiate call (Doctor side) - reference flow
  const initiateCall = useCallback(async () => {
    if (!remoteUserId || !socket) {
      toast({
        title: 'Error',
        description: 'Remote user information missing',
        variant: 'destructive',
      });
      return;
    }

    // Get media stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    
    setMyStream(stream);
    
    if (myVideoRef.current) {
      myVideoRef.current.srcObject = stream;
      myVideoRef.current.play().catch(() => setPlaybackBlocked(true));
    }

    console.log('📹 Local stream initialized');

    // Create offer (no tracks attached yet - reference flow)
    const offer = await peerService.getOffer();
    if (offer) {
      socket.emit('user:call', { 
        toUserId: remoteUserId, 
        offer, 
        appointmentId 
      });
      
      setCallStatus('ringing');
      console.log('📞 Call initiated to:', remoteUserId);

      toast({
        title: 'Calling...',
        description: 'Waiting for patient to answer',
      });
    }
  }, [remoteUserId, socket, appointmentId, toast]);

  // Handle negotiation needed - reference flow
  const handleNegoNeeded = useCallback(async () => {
    if (!remoteUserId) return;
    
    // Prevent multiple simultaneous negotiations
    if (isNegotiating.current) {
      console.log('⚠️ Negotiation already in progress, skipping');
      return;
    }
    
    const signalingState = peerService.peer?.signalingState;
    console.log('🔄 Negotiation needed, signalingState:', signalingState);
    
    // Only create offer if we're in stable state
    if (signalingState !== 'stable') {
      console.log('⚠️ Not in stable state, deferring negotiation');
      return;
    }
    
    try {
      isNegotiating.current = true;
      const offer = await peerService.getOffer();
      if (offer) {
        socket?.emit('peer:nego:needed', { offer, toUserId: remoteUserId, appointmentId });
        console.log('🔄 Negotiation offer sent to userId:', remoteUserId);
      }
    } finally {
      // Will be reset when we receive peer:nego:final
    }
  }, [remoteUserId, socket, appointmentId]);

  // Handle incoming negotiation - reference flow
  const handleNegoIncoming = useCallback(async ({ from, offer }: any) => {
    console.log('🔄 Incoming negotiation from userId:', from);
    const ans = await peerService.getAnswer(offer);
    if (ans) {
      socket?.emit('peer:nego:done', { toUserId: from, ans, appointmentId });
    }
  }, [socket, appointmentId]);

  // Handle negotiation final - reference flow
  const handleNegoFinal = useCallback(async ({ ans }: any) => {
    console.log('✅ Negotiation final, signalingState:', peerService.peer?.signalingState);
    
    // Only set remote description if we're expecting an answer (have-local-offer state)
    if (peerService.peer?.signalingState !== 'have-local-offer') {
      console.warn('⚠️ Ignoring peer:nego:final - not in have-local-offer state');
      isNegotiating.current = false; // Reset flag
      return;
    }
    
    try {
      await peerService.setRemoteDescription(ans);
      console.log('✅ Remote description set successfully');
      isNegotiating.current = false; // Reset negotiation flag
      
      // Flush any queued ICE candidates now that remote description is set
      if (pendingIceCandidates.current.length) {
        console.log(`🧊 Flushing ${pendingIceCandidates.current.length} queued ICE candidates`);
        for (const c of pendingIceCandidates.current) {
          await peerService.addIceCandidate(c);
        }
        pendingIceCandidates.current = [];
      }
    } catch (error) {
      console.error('❌ Failed to set remote description:', error);
      isNegotiating.current = false; // Reset flag on error
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (remoteUserId) {
      socket?.emit('call:ended', { toUserId: remoteUserId, appointmentId });
      console.log('📴 Call ended, notifying userId:', remoteUserId);
    }
    
    myStream?.getTracks().forEach(track => track.stop());
    peerService.closePeer();
    setCallStatus('ended');
    
    toast({
      title: 'Call Ended',
      description: 'Returning to dashboard...',
    });
    
    setTimeout(() => {
      goToDashboardWithReload();
    }, 1000);
  }, [remoteUserId, socket, appointmentId, myStream, toast, isDoctor, goToDashboardWithReload]);

  // Resume playback if blocked by autoplay policy
  const resumePlayback = useCallback(async () => {
    try {
      // Local video is muted, should be allowed to autoplay
      if (myVideoRef.current) {
        await myVideoRef.current.play().catch(() => {});
      }

      // Remote video might be blocked due to audio; temporarily mute to allow play, then restore
      if (remoteVideoRef.current) {
        const el = remoteVideoRef.current;
        const prevMuted = el.muted;
        el.muted = true;
        await el.play().catch(() => {});
        // restore previous mute state after user interaction
        el.muted = prevMuted;
      }

      setPlaybackBlocked(false);
    } catch (e) {
      // Show a gentle prompt
      toast({ title: 'Tap to start video', description: 'Try tapping on the video area to start playback.', variant: 'destructive' });
    }
  }, [toast]);

  // Handle incoming tracks
  useEffect(() => {
    if (!peerService.peer) return;

    const handleTrack = (event: RTCTrackEvent) => {
      console.log('🎥 Received remote track:', event.track.kind);
      const [stream] = event.streams;
      setRemoteStream(stream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };

    peerService.peer.addEventListener('track', handleTrack);

    // Trickle ICE: emit local candidates as they are found
    peerService.peer.onicecandidate = (event) => {
      if (!socket || !remoteUserId) return;
      
      if (event.candidate) {
        console.log('🧊 Emitting local ICE candidate:', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
          relatedAddress: event.candidate.relatedAddress,
          relatedPort: event.candidate.relatedPort,
        });
        socket.emit('peer:ice-candidate', { 
          candidate: event.candidate, 
          toUserId: remoteUserId,
          appointmentId 
        });
      } else {
        console.log('🧊 ICE gathering complete (null candidate)');
      }
    };

    // Monitor ICE connection state for auto-disconnect
    peerService.peer.oniceconnectionstatechange = () => {
      const state = peerService.peer?.iceConnectionState;
      console.log('🔌 ICE Connection State:', state);
      
      // 'disconnected' is transient; only fail on 'failed' state
      if (state === 'failed') {
        console.log('❌ ICE connection failed permanently');
        toast({
          title: 'Connection Failed',
          description: 'Unable to establish video connection. Check your network or firewall.',
          variant: 'destructive',
        });
        endCall();
      } else if (state === 'disconnected') {
        // Give it time to reconnect before showing warning
        console.log('⚠️ ICE disconnected, waiting 15s for recovery...');
        if (iceDisconnectTimeoutRef.current) {
          clearTimeout(iceDisconnectTimeoutRef.current);
        }
        iceDisconnectTimeoutRef.current = setTimeout(() => {
          if (peerService.peer?.iceConnectionState === 'disconnected') {
            console.log('❌ ICE still disconnected after 15s, ending call');
            toast({
              title: 'Connection Lost',
              description: 'Video call disconnected',
              variant: 'destructive',
            });
            endCall();
          }
        }, 15000);
      } else if (state === 'connected' || state === 'completed') {
        // Connection established or recovered, clear timeout
        if (iceDisconnectTimeoutRef.current) {
          console.log('✅ ICE connection established/recovered');
          clearTimeout(iceDisconnectTimeoutRef.current);
          iceDisconnectTimeoutRef.current = null;
        }
      }
    };

    return () => {
      peerService.peer?.removeEventListener('track', handleTrack);
      if (peerService.peer) {
        peerService.peer.onicecandidate = null;
        peerService.peer.oniceconnectionstatechange = null;
      }
      if (iceDisconnectTimeoutRef.current) {
        clearTimeout(iceDisconnectTimeoutRef.current);
      }
    };
  }, [socket, remoteUserId, appointmentId, toast, endCall]);

  // Update remote video element when remoteStream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => setPlaybackBlocked(true));
    }
  }, [remoteStream]);

  // Handle negotiation needed event
  useEffect(() => {
    if (!peerService.peer) return;

    peerService.peer.addEventListener('negotiationneeded', handleNegoNeeded);

    return () => {
      peerService.peer?.removeEventListener('negotiationneeded', handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('incoming:call', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('peer:nego:needed', handleNegoIncoming);
    socket.on('peer:nego:final', handleNegoFinal);
    socket.on('call:prepare', async ({ from, appointmentId: prepAppId }: { from: string; appointmentId: string }) => {
      console.log('📣 Received call:prepare from userId:', from, 'appointmentId:', prepAppId, 'current status:', callStatus, 'signalingState:', peerService.peer?.signalingState);
      // Doctor should re-send offer when patient explicitly requests (after accepting and navigating to video page)
      if (isDoctor && prepAppId === appointmentId) {
        console.log('🔄 Re-initiating call after call:prepare (patient ready)');
        setRemoteUserId(from);
        
        // Reset peer to clean state if stuck in have-local-offer
        if (peerService.peer?.signalingState === 'have-local-offer') {
          console.log('🔄 Resetting peer from have-local-offer state');
          peerService.closePeer();
          await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for cleanup
        }
        
        await initiateCall();
      }
    });
    socket.on('peer:ice-candidate', async ({ from, candidate }) => {
      if (!candidate) return;
      console.log('🧊 Received remote ICE candidate from:', from);
      
      // Check if remote description is set
      if (!peerService.peer?.remoteDescription) {
        console.log('⏳ Queueing ICE candidate (remote description not set yet)');
        pendingIceCandidates.current.push(candidate);
        return;
      }
      
      try {
        await peerService.addIceCandidate(candidate);
        console.log('✅ ICE candidate added successfully');
      } catch (error) {
        console.error('❌ Failed to add ICE candidate:', error);
      }
    });
    socket.on('call:ended', () => {
      setCallStatus('ended');
      toast({
        title: 'Call Ended',
        description: 'The call has been ended',
      });
      setTimeout(() => goToDashboardWithReload(), 2000);
    });
    socket.on('call:rejected', () => {
      toast({
        title: 'Call Rejected',
        description: 'The call was rejected',
        variant: 'destructive',
      });
      setTimeout(() => goToDashboardWithReload(), 2000);
    });
    
    // Handle socket disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      if (callStatus === 'connected' || callStatus === 'ringing') {
        toast({
          title: 'Connection Lost',
          description: 'Socket disconnected, returning to dashboard',
          variant: 'destructive',
        });
        endCall();
      }
    });

    return () => {
      socket.off('incoming:call', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('peer:nego:needed', handleNegoIncoming);
      socket.off('peer:nego:final', handleNegoFinal);
      socket.off('call:prepare');
      socket.off('peer:ice-candidate');
      socket.off('call:ended');
      socket.off('call:rejected');
      socket.off('disconnect');
    };
  }, [socket, handleIncomingCall, handleCallAccepted, handleNegoIncoming, handleNegoFinal, toast, navigate, isDoctor, initiateCall, appointmentId, callStatus, endCall, goToDashboardWithReload]);

  // Auto-initiate call for doctor (guard against StrictMode double-mount)
  useEffect(() => {
    if (didAutoInitRef.current) return;
    didAutoInitRef.current = true;
    if (isDoctor && socket && remoteUserId) {
      console.log('🎬 Doctor auto-initiating call...');
      initiateCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = run only on mount

  // Update local video element when myStream changes
  useEffect(() => {
    if (myStream && myVideoRef.current) {
      myVideoRef.current.srcObject = myStream;
      myVideoRef.current.play().catch(() => setPlaybackBlocked(true));
    }
  }, [myStream]);

  // Cleanup only on unmount (dev StrictMode mounts/unmounts once). Avoid closing peer here to prevent
  // interrupting active calls during StrictMode double-invocation. Calls are ended via endCall().
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up VideoCall page...');
      // Do not stop tracks or close peer here; endCall() manages proper teardown.
    };
  }, []); // Empty deps = only run on unmount

  // Toggle audio
  const toggleAudio = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (myStream) {
      myStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-6xl mx-auto p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Video Consultation</h1>
          <p className="text-sm text-muted-foreground">Appointment ID: {appointmentId}</p>
          <div className="mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              callStatus === 'connected' ? 'bg-green-100 text-green-800' :
              callStatus === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
              callStatus === 'ended' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {callStatus === 'connected' ? '● Connected' :
               callStatus === 'ringing' ? '● Ringing...' :
               callStatus === 'ended' ? '● Ended' :
               '● Connecting...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Remote Video */}
          <Card className="relative aspect-video bg-black overflow-hidden">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for remote video...</p>
                </div>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {isDoctor ? 'Patient' : 'Doctor'}
            </div>
          </Card>

          {/* Local Video */}
          <Card className="relative aspect-video bg-black overflow-hidden">
            {myStream ? (
              <video
                ref={myVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
            {playbackBlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Button onClick={resumePlayback} variant="secondary">Resume Video</Button>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              You
            </div>
          </Card>
        </div>

        {/* Call Controls */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? 'default' : 'destructive'}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isAudioEnabled ? <Mic /> : <MicOff />}
          </Button>

          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? 'default' : 'destructive'}
            size="lg"
            className="rounded-full w-14 h-14"
          >
            {isVideoEnabled ? <Video /> : <VideoOff />}
          </Button>

          <Button
            onClick={endCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
          >
            <PhoneOff />
          </Button>
        </div>
      </Card>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
