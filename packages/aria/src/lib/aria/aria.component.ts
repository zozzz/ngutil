import { CommonModule } from "@angular/common"
import { Component } from "@angular/core"

@Component({
    selector: "nu-aria",
    standalone: true,
    imports: [CommonModule],
    template: `<p>aria works!</p>`,
    styleUrl: "./aria.component.scss"
})
export class AriaComponent {}
