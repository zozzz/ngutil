import { Injectable, signal } from "@angular/core"

@Injectable()
export class DockingLayoutService {
    readonly backdropVisible = signal(false)

    showBackdrop() {
        this.backdropVisible.set(true)
    }

    hideBackdrop() {
        this.backdropVisible.set(false)
    }
}
