import { CommonModule } from "@angular/common"
import { Component } from "@angular/core"

@Component({
    selector: "nu-common",
    standalone: true,
    imports: [CommonModule],
    template: `<p>common works!</p>`,
    styleUrl: "./common.component.scss"
})
export class CommonComponent {}
