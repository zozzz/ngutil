import { Component, computed, contentChildren } from "@angular/core"

import { DockingBackdropComponent } from "./docking-backdrop.component"
import { DockingLayoutService } from "./docking-layout.service"
import { DockingPanelComponent } from "./docking-panel.component"

type DockingVerticalPosition = "top" | "middle" | "bottom"
type DockingHorizontalPositon = "left" | "center" | "right"
type DockingPosition = `${DockingVerticalPosition}:${DockingHorizontalPositon}`
export type DockingRange =
    | DockingVerticalPosition
    | DockingHorizontalPositon
    | DockingPosition
    | `${DockingPosition}-${DockingPosition}`

@Component({
    selector: "nu-docking",
    exportAs: "nuDocking",
    standalone: true,
    imports: [DockingBackdropComponent],
    providers: [DockingLayoutService],
    styleUrl: "./docking-layout.component.scss",
    template: `
        <ng-content />
        <nu-docking-backdrop [visible]="backdropVisible()" (click)="doCloseActiveOverPanel()"></nu-docking-backdrop>
    `
})
export class DockingLayoutComponent {
    /**
     * True if u want to animate panel open/close with `mode="side"`
     */
    // readonly animateSide = input(false)

    readonly panels = contentChildren(DockingPanelComponent)

    readonly activeOverPanel = computed(() => {
        const panels = this.panels()
        return panels.find(panel => panel.mode() === "over" && panel.opened())
    })

    readonly backdropVisible = computed(() => {
        const active = this.activeOverPanel()
        return active != null ? active.backdrop() !== false : false
    })

    doCloseActiveOverPanel() {
        const activePanel = this.activeOverPanel()
        if (activePanel) {
            activePanel.close()
        }
    }
}
