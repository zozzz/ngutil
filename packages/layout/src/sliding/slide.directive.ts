import { Directive, effect, inject, output, signal, TemplateRef } from "@angular/core"

export const enum SlideAnimationState {
    LeftIn = "left-in",
    LeftOut = "left-out",
    RightIn = "right-in",
    RightOut = "right-out",
    FastOut = "fast-out",
    FastIn = "fast-in"
}

export const enum SlideState {
    Pending = 0,
    Showing = 1,
    Shown = 2,
    Hiding = 3,
    Hidden = 4
}

@Directive({
    selector: "ng-template[nuSlide]",
    exportAs: "nuSlide"
})
export class SlideDirective {
    readonly tpl = inject(TemplateRef)

    readonly rendered = signal(false)
    readonly active = signal(false)
    readonly animation = signal<SlideAnimationState | null>(null)
    readonly activated = output<boolean>()
    readonly state = output<SlideState>()

    constructor() {
        effect(() => {
            this.activated.emit(this.active())
        })
    }
}
