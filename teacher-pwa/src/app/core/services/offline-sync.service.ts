import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, of } from 'rxjs';
import { concatMap, tap, catchError } from 'rxjs/operators';
import { OfflineQueueItem } from '../../models/attendance.model';
import { environment } from '../config/environment';

@Injectable({
  providedIn: 'root',
})
export class OfflineSyncService {
  private http = inject(HttpClient);
  private readonly STORAGE_KEY = 'offline_sync_queue';

  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly pendingQueue = signal<OfflineQueueItem[]>(this.loadQueueFromStorage());
  readonly pendingCount = computed(() => this.pendingQueue().length);
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncMessage = signal<string>('');

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.syncQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline.set(false);
      });
    }
  }

  private loadQueueFromStorage(): OfflineQueueItem[] {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as OfflineQueueItem[];
    } catch {
      return [];
    }
  }

  private saveQueueToStorage(queue: OfflineQueueItem[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    }
    this.pendingQueue.set(queue);
  }

  addToQueue<T>(endpoint: string, payload: T): void {
    const current = this.pendingQueue();
    const item: OfflineQueueItem<T> = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      endpoint,
      payload,
    };
    const updated = [...current, item as OfflineQueueItem];
    this.saveQueueToStorage(updated);
    this.lastSyncMessage.set(`Saved offline to device queue (${updated.length} pending items)`);
  }

  syncQueue(): void {
    const queue = this.pendingQueue();
    if (queue.length === 0 || !this.isOnline() || this.isSyncing()) {
      return;
    }

    this.isSyncing.set(true);
    this.lastSyncMessage.set('Syncing offline records with cloud server...');

    from(queue)
      .pipe(
        concatMap((item) =>
          this.http
            .post(
              `${environment.apiUrl}${item.endpoint.startsWith('/') ? item.endpoint : '/' + item.endpoint}`,
              item.payload,
            )
            .pipe(
              tap(() => {
                this.removeItemFromQueue(item.id);
              }),
              catchError((err) => {
                console.error(`Failed to sync queue item ${item.id}:`, err);
                return of(null);
              }),
            ),
        ),
      )
      .subscribe({
        complete: () => {
          this.isSyncing.set(false);
          const remaining = this.pendingQueue().length;
          if (remaining === 0) {
            this.lastSyncMessage.set('All offline records synced successfully to cloud!');
          } else {
            this.lastSyncMessage.set(`Sync completed with ${remaining} items remaining in queue.`);
          }
        },
      });
  }

  private removeItemFromQueue(itemId: string): void {
    const current = this.pendingQueue();
    const updated = current.filter((i) => i.id !== itemId);
    this.saveQueueToStorage(updated);
  }

  clearQueue(): void {
    this.saveQueueToStorage([]);
    this.lastSyncMessage.set('Offline sync queue cleared.');
  }
}
