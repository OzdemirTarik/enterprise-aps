import * as signalR from '@microsoft/signalr';
import { useScheduleStore } from '../store/useScheduleStore';
import {
  ScheduleDelta,
  LockInfo,
  UserPresence,
  ScheduleKpis,
  Resource,
  WorkOrder,
  ResourceDowntime,
} from '../types/schedule';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;

  public async start(): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl('/hubs/scheduling', {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.registerHandlers();

      await this.connection.start();
      console.log('[APS SignalR] Connected successfully.');
    } catch (err) {
      console.warn('[APS SignalR] Connection error, retrying in 5s...', err);
      setTimeout(() => this.start(), 5000);
    } finally {
      this.isConnecting = false;
    }
  }

  private registerHandlers(): void {
    if (!this.connection) return;

    this.connection.on('OnScheduleUpdated', (delta: ScheduleDelta) => {
      useScheduleStore.getState().mergeScheduleDelta(delta);
    });

    this.connection.on('OnResourceLocked', (lockInfo: LockInfo) => {
      useScheduleStore.getState().setResourceLock(lockInfo);
    });

    this.connection.on('OnResourceUnlocked', (resourceId: string) => {
      useScheduleStore.getState().releaseResourceLock(resourceId);
    });

    this.connection.on('OnUserPresence', (presence: UserPresence) => {
      useScheduleStore.getState().updateUserPresence(presence);
    });

    this.connection.on('OnKpiUpdated', (kpis: ScheduleKpis) => {
      useScheduleStore.getState().updateKpis(kpis);
    });

    this.connection.on('OnResourceUpdated', (resource: Resource) => {
      useScheduleStore.getState().setResourceUpdated(resource);
    });

    this.connection.on('OnResourceDeleted', (resourceId: string) => {
      useScheduleStore.getState().setResourceDeleted(resourceId);
    });

    this.connection.on('OnWorkOrderUpdated', (workOrder: WorkOrder) => {
      useScheduleStore.getState().setWorkOrderUpdated(workOrder);
    });

    this.connection.on('OnWorkOrderDeleted', (workOrderId: string) => {
      useScheduleStore.getState().setWorkOrderDeleted(workOrderId);
    });

    this.connection.on('OnOperationDeleted', (operationId: string) => {
      useScheduleStore.getState().deleteOperation(operationId);
    });

    this.connection.on('OnDowntimeUpdated', (downtime: ResourceDowntime) => {
      useScheduleStore.getState().setDowntimeUpdated(downtime);
    });

    this.connection.on('OnDowntimeDeleted', (downtimeId: string) => {
      useScheduleStore.getState().setDowntimeDeleted(downtimeId);
    });
  }

  public async broadcastPresence(
    cursorResourceId?: string | null,
    cursorTime?: string | null
  ): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      const user = useScheduleStore.getState().activeLockUser;
      try {
        await this.connection.invoke('BroadcastPresence', {
          userId: user.userId,
          userName: user.userName,
          userColor: user.userColor,
          cursorResourceId,
          cursorTime,
          lastActive: new Date().toISOString(),
        });
      } catch (err) {
        // Ignore presence broadcast errors
      }
    }
  }

  public async stop(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const signalRService = new SignalRService();
