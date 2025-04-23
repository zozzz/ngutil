import { Directive, effect, inject, output, signal, TemplateRef } from "@angular/core"

import type { ItemAnimationState } from "./sliding-item.component"

@Directive({
    selector: "ng-template[nuSlidingItem]",
    exportAs: "nuSlidingItem",
    standalone: true
})
export class SlidingItemDirective {
    readonly tpl = inject(TemplateRef)

    readonly rendered = signal(false)
    readonly active = signal(false)
    readonly animation = signal<ItemAnimationState | null>(null)
    readonly activated = output<boolean>()

    constructor() {
        effect(() => {
            this.activated.emit(this.active())
        })
    }
}
