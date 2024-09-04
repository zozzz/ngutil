import { Directive, effect, inject, output, signal, TemplateRef } from "@angular/core"

export const enum ItemAnimationState {
    LeftIn = "left-in",
    LeftOut = "left-out",
    RightIn = "right-in",
    RightOut = "right-out",
    FastOut = "fast-out",
    FastIn = "fast-in"
}

@Directive({
    selector: "ng-template[nuSlidingItem]",
    standalone: true
})
export class SlidingItemDirective {
    readonly tpl = inject(TemplateRef)

    readonly rendered = signal(false)
    readonly active = signal(false)
    readonly animation = signal<{ value: ItemAnimationState } | null>(null)
    readonly activated = output<boolean>()

    constructor() {
        effect(
            () => {
                this.activated.emit(this.active())
            },
            { allowSignalWrites: true }
        )
    }
}
