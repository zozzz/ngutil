import { Component } from "@angular/core"

@Component({
    selector: "nu-docking-content",
    exportAs: "nuDockingContent",
    styleUrl: "./docking-content.component.scss",
    template: `<ng-content></ng-content>`
})
export class DockingContentComponent { }
