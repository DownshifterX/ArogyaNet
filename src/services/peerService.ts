import { env } from '@/config/env';

// WebRTC Peer Service - Handles peer connection and SDP negotiation
class PeerService {
  public peer: RTCPeerConnection | null = null;
  private iceServersCache: RTCIceServer[] | null = null;

  constructor() {
    this.initializePeer();
  }

  // Fetch TURN credentials from REST API
  private async fetchIceServers(): Promise<RTCIceServer[]> {
    // Return cached servers if available
    if (this.iceServersCache) {
      return this.iceServersCache;
    }

    // For local network connections, we can work without STUN/TURN (host candidates)
    // But include some public STUN servers as fallback
    const fallbackServers: RTCIceServer[] = [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ];

    // If no TURN API configured, return minimal config (host candidates work without servers)
    if (!env.turnApiUrl) {
      console.log('ℹ️ No TURN API URL, relying on host candidates for LAN connection');
      this.iceServersCache = fallbackServers;
      return fallbackServers;
    }

    try {
      console.log('🔄 Fetching TURN credentials from:', env.turnApiUrl);
      const response = await fetch(env.turnApiUrl, { 
        signal: AbortSignal.timeout(3000) // 3s timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const iceServers = await response.json();
      
      if (Array.isArray(iceServers) && iceServers.length > 0) {
        console.log('✅ Fetched ICE servers:', iceServers.length, 'servers');
        this.iceServersCache = iceServers;
        return iceServers;
      }
      
      console.warn('⚠️ API returned empty iceServers, using fallback');
      this.iceServersCache = fallbackServers;
      return fallbackServers;
    } catch (error) {
      console.error('❌ Failed to fetch TURN credentials:', error);
      console.log('ℹ️ Continuing with host candidates (LAN should work)');
      this.iceServersCache = fallbackServers;
      return fallbackServers;
    }
  }

  private async initializePeer() {
    if (!this.peer) {
      // Fetch ICE servers (includes TURN from API)
      const iceServers = await this.fetchIceServers();

      // Create peer connection
      // For local network: allow host, srflx, relay candidates
      // NOTE: Removed bundlePolicy 'max-bundle' - it causes errors when creating offer without tracks
      this.peer = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: env.iceRelayOnly ? 'relay' : 'all',
        iceCandidatePoolSize: 10, // Pre-gather candidates
      });

      console.log('🔧 Peer connection created with', iceServers.length, 'ICE server(s)');
      console.log('📋 ICE Servers configured:', JSON.stringify(iceServers, null, 2));
      console.log('🔧 ICE transport policy:', env.iceRelayOnly ? 'relay-only' : 'all (host/srflx/relay)');

      // Log ICE connection state changes
      this.peer.oniceconnectionstatechange = () => {
        console.log('🔌 ICE Connection State:', this.peer?.iceConnectionState);
      };

      this.peer.onconnectionstatechange = () => {
        console.log('🔗 Connection State:', this.peer?.connectionState);
      };

      this.peer.onicegatheringstatechange = () => {
        console.log('🧊 ICE Gathering State:', this.peer?.iceGatheringState);
      };

      this.peer.onicecandidateerror = (e: RTCPeerConnectionIceErrorEvent) => {
        console.error('🧊 ICE Candidate Error:', {
          errorCode: e.errorCode,
          errorText: e.errorText,
          url: e.url,
          address: e.address,
          port: e.port,
        });
      };
    }
  }

  // Ensure peer is initialized (async-safe)
  private async ensurePeer(): Promise<void> {
    if (!this.peer) {
      await this.initializePeer();
    }
  }

  // Create and return an offer
  async getOffer(): Promise<RTCSessionDescriptionInit | undefined> {
    await this.ensurePeer();
    if (this.peer) {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      console.log('📤 Created offer:', offer);
      return offer;
    }
  }

  // Receive offer and create answer (simple like reference)
  async getAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | undefined> {
    await this.ensurePeer();
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      console.log('📥 Created answer:', ans);
      return ans;
    }
  }

  // Set remote description (when receiving answer)
  async setRemoteDescription(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Set remote description');
    }
  }

  // Add a received ICE candidate
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peer && candidate) {
      try {
        await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 Added remote ICE candidate');
      } catch (err) {
        console.warn('⚠️ Failed to add ICE candidate:', err);
      }
    }
  }

  // Add local stream tracks to peer connection
  // Simple addTrack like reference implementation
  addStream(stream: MediaStream): void {
    if (this.peer) {
      const signalingState = this.peer.signalingState;
      console.log('🎥 Adding tracks, current signalingState:', signalingState);
      
      for (const track of stream.getTracks()) {
        this.peer.addTrack(track, stream);
        console.log('🎥 Added track:', track.kind);
      }
      
      console.log('🎥 All tracks added, awaiting negotiationneeded event...');
    }
  }

  // Close peer connection
  closePeer(): void {
    if (this.peer) {
      this.peer.close();
      console.log('❌ Peer connection closed');
      this.peer = null;
      // Don't reinitialize synchronously; let next getOffer/getAnswer call it async
    }
  }
}

// Export singleton instance
export default new PeerService();
