import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-layout.component.html',
  styleUrl: './portal-layout.component.scss',
})
export class PortalLayoutComponent {
  readonly authService = inject(AuthService);
  readonly offlineSync = inject(OfflineSyncService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
  }

  triggerManualSync(): void {
    this.offlineSync.syncQueue();
  }
}
