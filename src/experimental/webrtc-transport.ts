/**
 * WebRTC Transport - Experimental
 *
 * STATUS: EXPERIMENTAL - API may change significantly
 *
 * This transport uses WebRTC for lower latency audio/video streaming.
 * Currently in early development - do not use in production.
 *
 * TODO:
 * - [ ] Implement ICE candidate handling
 * - [ ] Add TURN server configuration
 * - [ ] Handle reconnection gracefully
 * - [ ] Implement data channel for text messages
 * - [ ] Add quality adaptation based on network conditions
 * - [ ] Support simulcast for video
 */

import EventEmitter from 'eventemitter3';
import { TransportMessage } from '../types';
import { logger } from '../utils/logger';

interface WebRTCTransportConfig {
  signalingUrl: string;
  apiKey: string;
  sessionId: string;
  iceServers?: RTCIceServer[];
}

interface WebRTCTransportEvents {
  'message': (message: TransportMessage) => void;
  'close': (code: number, reason: string) => void;
  'error': (error: Error) => void;
  'track': (track: MediaStreamTrack, streams: MediaStream[]) => void;
}

// EXPERIMENTAL: Not fully implemented
export class WebRTCTransport extends EventEmitter<WebRTCTransportEvents> {
  private config: WebRTCTransportConfig;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingWs: WebSocket | null = null;

  constructor(config: WebRTCTransportConfig) {
    super();
    this.config = {
      ...config,
      iceServers: config.iceServers ?? [
        { urls: 'stun:stun.l.google.com:19302' },
        // TODO: Add TURN servers for NAT traversal
      ],
    };

    logger.warn('WebRTC transport is experimental and not fully implemented');
  }

  async connect(): Promise<void> {
    // Step 1: Connect to signaling server
    await this.connectSignaling();

    // Step 2: Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    this.setupPeerConnectionHandlers();

    // Step 3: Create data channel for messages
    this.dataChannel = this.peerConnection.createDataChannel('messages', {
      ordered: true,
    });

    this.setupDataChannelHandlers();

    // Step 4: Create and send offer
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,  // TODO: Add video support
    });

    await this.peerConnection.setLocalDescription(offer);

    // Send offer through signaling
    this.sendSignaling({
      type: 'offer',
      sdp: offer.sdp,
    });

    // TODO: Wait for answer and complete connection
    // This is incomplete - needs answer handling
  }

  private async connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.signalingUrl);
      url.searchParams.set('session', this.config.sessionId);

      this.signalingWs = new WebSocket(url.toString());

      this.signalingWs.onopen = () => {
        logger.debug('Signaling connected');
        resolve();
      };

      this.signalingWs.onerror = (event) => {
        reject(new Error('Signaling connection failed'));
      };

      this.signalingWs.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };

      this.signalingWs.onclose = () => {
        logger.debug('Signaling disconnected');
      };
    });
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      logger.debug('Received track', { kind: event.track.kind });
      this.emit('track', event.track, event.streams as MediaStream[]);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection!.iceConnectionState;
      logger.debug('ICE connection state', { state });

      if (state === 'failed' || state === 'disconnected') {
        this.emit('error', new Error(`ICE connection ${state}`));
      }
    };

    // TODO: Handle connection state changes for reconnection
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      logger.debug('Data channel open');
    };

    this.dataChannel.onclose = () => {
      logger.debug('Data channel closed');
      this.emit('close', 1000, 'Data channel closed');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as TransportMessage;
        this.emit('message', message);
      } catch (error) {
        logger.error('Failed to parse data channel message', { error });
      }
    };

    this.dataChannel.onerror = (event) => {
      this.emit('error', new Error('Data channel error'));
    };
  }

  private handleSignalingMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'answer':
        // TODO: Handle answer
        // await this.peerConnection?.setRemoteDescription({
        //   type: 'answer',
        //   sdp: message.sdp as string,
        // });
        logger.debug('Received answer - not yet implemented');
        break;

      case 'ice-candidate':
        // TODO: Handle ICE candidate
        // await this.peerConnection?.addIceCandidate(message.candidate as RTCIceCandidateInit);
        logger.debug('Received ICE candidate - not yet implemented');
        break;

      default:
        logger.warn('Unknown signaling message type', { type: message.type });
    }
  }

  private sendSignaling(message: unknown): void {
    if (this.signalingWs?.readyState === WebSocket.OPEN) {
      this.signalingWs.send(JSON.stringify(message));
    }
  }

  async send(message: TransportMessage): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.dataChannel.send(JSON.stringify(message));
  }

  async sendAudio(audioTrack: MediaStreamTrack): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not established');
    }

    // TODO: Add audio track to peer connection
    // this.peerConnection.addTrack(audioTrack);
    logger.warn('sendAudio not yet implemented');
  }

  async close(): Promise<void> {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.signalingWs?.close();

    this.dataChannel = null;
    this.peerConnection = null;
    this.signalingWs = null;
  }

  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected' &&
           this.dataChannel?.readyState === 'open';
  }
}
