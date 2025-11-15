import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';

interface IncomingCallData {
  doctorName: string;
  appointmentId: string;
  doctorUserId: string;  // Changed from doctorSocketId
}

export function IncomingCallNotification() {
  const socket = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const ringRef = useRef<{ stop: () => void } | null>(null);

  // Lightweight beep without loading audio files (avoids NotSupportedError and 404s)
  const startBeep = () => {
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AudioCtx: typeof AudioContext | undefined = w.AudioContext || w.webkitAudioContext;
      if (!AudioCtx) return; // No WebAudio support
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 800; // Hz
      o.connect(g);
      g.connect(ctx.destination);
      // quick fade in/out
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
      o.start();
      ringRef.current = {
        stop: () => {
          const t = ctx.currentTime;
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
          try { o.stop(t + 0.22); } catch (e) { /* noop */ }
          ctx.close().catch(() => {});
        },
      };
      // try resume in case of suspended context (autoplay policy)
      ctx.resume().catch(() => {});
      // auto-stop after 1s
      setTimeout(() => ringRef.current?.stop(), 1000);
    } catch {
      // ignore audio issues silently
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: IncomingCallData) => {
      console.log('📞 Incoming call notification:', data);
      setIncomingCall(data);
      // Beep once to notify (no external media needed)
      startBeep();
    };

    socket.on('notification:incoming:call', handleIncomingCall);

    return () => {
      socket.off('notification:incoming:call', handleIncomingCall);
    };
  }, [socket]);

  const handleAccept = () => {
    if (!incomingCall) return;
    ringRef.current?.stop();

    // Ask doctor to (re)send offer to avoid race where offer was sent before we navigated
    socket?.emit('call:prepare', { toUserId: incomingCall.doctorUserId, appointmentId: incomingCall.appointmentId });

    // Navigate to video call page
    navigate(`/videocall/${incomingCall.appointmentId}?remoteUserId=${incomingCall.doctorUserId}`);
    setIncomingCall(null);
  };

  const handleReject = () => {
    if (!incomingCall || !socket) return;
    ringRef.current?.stop();

    // Notify doctor that call was rejected
    socket.emit('call:rejected', { toUserId: incomingCall.doctorUserId, appointmentId: incomingCall.appointmentId });
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <Dialog open={!!incomingCall} onOpenChange={(open) => !open && handleReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Incoming Video Call</DialogTitle>
          <DialogDescription className="text-lg">
            <strong>{incomingCall.doctorName}</strong> is calling you
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
              <Phone className="w-12 h-12 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25"></div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-center gap-4 sm:justify-center">
          <Button
            onClick={handleReject}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
          <Button
            onClick={handleAccept}
            variant="default"
            size="lg"
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
          >
            <Phone className="w-8 h-8" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
