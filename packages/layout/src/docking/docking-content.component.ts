import { Component } from "@angular/core"

@Component({
    standalone: true,
    selector: "nu-docking-content",
    exportAs: "nuDockingContent",
    styleUrl: "./docking-content.component.scss",
    template: `<ng-content></ng-content>`
})
export class DockingContentComponent {}
