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
  private isExplicitlyStopped = false;
  private retryTimeout: any = null;

  public async start(): Promise<void> {
    this.isExplicitlyStopped = false;
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      if (!this.connection) {
        this.connection = new signalR.HubConnectionBuilder()
          .withUrl('/hubs/scheduling', {
            skipNegotiation: false,
            transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging({
            log: (logLevel, message) => {
              if (
                message.includes('stopped during negotiation') ||
                message.includes('AbortError') ||
                message.includes('Canceled')
              ) {
                return;
              }
              if (logLevel >= signalR.LogLevel.Error) {
                console.error('[APS SignalR]', message);
              }
            },
          })
          .build();

        this.registerHandlers();
      }

      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        console.log('[APS SignalR] Connected successfully.');
      }
    } catch (err: any) {
      const isNegotiationAbort =
        err?.message?.includes('stopped during negotiation') ||
        err?.name === 'AbortError' ||
        this.isExplicitlyStopped;

      if (!isNegotiationAbort) {
        console.warn('[APS SignalR] Connection error, retrying in 5s...', err);
        if (!this.isExplicitlyStopped) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = setTimeout(() => this.start(), 5000);
        }
      }
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

    this.connection.on('OnShiftsUpdated', (shifts: any) => {
      useScheduleStore.setState({ shifts });
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
    this.isExplicitlyStopped = true;
    clearTimeout(this.retryTimeout);
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
        // Ignore stop abort errors
      }
      this.connection = null;
    }
  }
}

export const signalRService = new SignalRService();
