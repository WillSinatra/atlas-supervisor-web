import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/ws',
})
export class WebsocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketsGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}`);
    this.server.emit('clients', { count: this.connectedClients.size });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
    this.server.emit('clients', { count: this.connectedClients.size });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, room: string) {
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
  }

  // Emitir actualización de ubicación de cuadrilla
  emitCrewLocation(data: { crewId: string; latitude: number; longitude: number; status: string }) {
    this.server.emit('crew:location', data);
  }

  // Emitir cambio de estado de orden
  emitOrderStatusChange(data: { orderId: string; status: string; orderNumber: string }) {
    this.server.emit('order:status-change', data);
  }

  // Emitir nueva notificación
  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Emitir alerta SLA
  emitSlaAlert(data: { orderId: string; orderNumber: string; slaName: string; timeRemaining: number }) {
    this.server.emit('sla:alert', data);
  }

  // Emitir actualización del dashboard
  emitDashboardUpdate(data: any) {
    this.server.emit('dashboard:update', data);
  }
}