import { Component } from "@angular/core"

import { DockingBackdropComponent } from "./docking-backdrop.component"
import { DockingContentComponent } from "./docking-content.component"
import { DockingLayoutService } from "./docking-layout.service"

type DockingVerticalPosition = "top" | "middle" | "bottom"
type DockingHorizontalPositon = "left" | "center" | "right"
type DockingPosition = `${DockingVerticalPosition}:${DockingHorizontalPositon}`
export type DockingRange =
    | DockingVerticalPosition
    | DockingHorizontalPositon
    | DockingPosition
    | `${DockingPosition}-${DockingPosition}`

const RIGID_ZINDEX = 100
const OVER_ZINDEX = RIGID_ZINDEX * 2
const BACKDROP_ZINDEX = 10000

@Component({
    selector: "nu-docking",
    exportAs: "nuDocking",
    standalone: true,
    imports: [DockingContentComponent, DockingBackdropComponent],
    providers: [DockingLayoutService],
    styleUrl: "./docking-layout.component.scss",
    template: `
        <ng-content />
        <nu-docking-backdrop [visible]="backdropVisible"></nu-docking-backdrop>
    `
})
export class DockingLayoutComponent {
    /**
     * True if u want to animate panel open/close with `mode="side"`
     */
    // readonly animateSide = input(false)
    backdropVisible = true
}
