import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;
  private readonly URL = environment.socketUrl;

  // Listeners registrados por la app. Se guardan aquí para re-vincularlos en
  // cada connect(): connect() crea un socket NUEVO (login tras logout,
  // restauración de sesión), así que los handlers del socket anterior se
  // perderían. Persistirlos también desacopla el orden: un store puede
  // suscribirse aunque el socket aún no exista.
  private readonly listeners: {
    event: string;
    callback: (payload: any) => void;
  }[] = [];

  connect(token: string): void {
    this.disconnect();
    this.socket = io(this.URL, { auth: { token } });
    for (const { event, callback } of this.listeners) {
      this.socket.on(event, callback);
    }
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
    this.listeners.push({
      event,
      callback: callback as (payload: any) => void,
    });
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
}
