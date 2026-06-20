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
    // Defensivo: si ya hay un socket, lo cerramos antes de abrir otro. Evita
    // sockets duplicados cuando connect() se llama desde varios sitios
    // (restauración de sesión + login posterior).
    this.disconnect();

    this.socket = io(this.URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Realtime conectado');
    });
    this.socket.on('disconnect', (reason) => {
      console.log(`Realtime desconectado: ${reason}`);
    });
    this.socket.on('connect_error', (err) => {
      console.log(`Realtime error de conexión: ${err.message}`);
    });

    // Re-vincula los listeners de negocio sobre el socket nuevo.
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
    if (!this.socket) return;
    // Race condition defensiva: si el componente pide unirse a un grupo antes
    // de que el socket haya completado el handshake, el emit se perdería.
    // Esperamos al evento 'connect' una sola vez y entonces emitimos.
    if (this.socket.connected) {
      this.socket.emit('group:join', { groupId });
    } else {
      this.socket.once('connect', () =>
        this.socket?.emit('group:join', { groupId }),
      );
    }
  }

  leaveGroup(groupId: string): void {
    if (!this.socket) return;
    if (this.socket.connected) {
      this.socket.emit('group:leave', { groupId });
    } else {
      this.socket.once('connect', () =>
        this.socket?.emit('group:leave', { groupId }),
      );
    }
  }

  on<T>(event: string, callback: (payload: T) => void): void {
    this.listeners.push({
      event,
      callback: callback as (payload: any) => void,
    });
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
}
