import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;
  private readonly URL = 'http://localhost:3000';

  connect(token: string): void {
    this.disconnect();
    this.socket = io(this.URL, { auth: { token } });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:join', groupId);
    }
  }

  leaveGroup(groupId: string): void {
    if (this.socket) {
      this.socket.emit('group:leave', groupId);
    }
  }

  on<T>(event: string, callback: (payload: T) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
}
