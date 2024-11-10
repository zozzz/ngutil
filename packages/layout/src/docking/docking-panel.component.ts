import { Component, computed, ElementRef, inject, input, model, viewChild } from "@angular/core"
import { takeUntilDestroyed, toObservable, toSignal } from "@angular/core/rxjs-interop"

import { switchMap } from "rxjs"

import { coerceBoolAttr } from "@ngutil/common"
import { DimensionWatcher } from "@ngutil/style"

import { L9Range } from "../l9/range"

export type DockingPanelState = "full" | "mini" | "hidden"
export type DockingPanelMode = "over" | "push" | "rigid"
export type BackdropMode = boolean | "full" | "panel-size"

const DEFAULT_POSITION = L9Range.coerce("left")

@Component({
    selector: "nu-docking-panel",
    exportAs: "nuDockingPanel",
    standalone: true,
    host: {
        "[style.grid-area]": "gridArea()",
        "[style.--nudp-content-size.px]": "contentSize()",
        "[attr.state]": "_opened() ? 'opened' : 'closed'",
        "[attr.orient]": "orient()",
        "[attr.side]": "side()",
        "[attr.mode]": "mode()"
    },
    styleUrl: "./docking-panel.component.scss",
    template: `<div class="wrapper" #content><ng-content /></div>`
})
export class DockingPanelComponent {
    readonly #dimWatcher = inject(DimensionWatcher)
    readonly el = inject(ElementRef)

    readonly position = input(DEFAULT_POSITION, { transform: L9Range.coerce })
    // TODO: linkedSignal
    readonly opened = model<boolean>(false)
    readonly _opened = computed(() => coerceBoolAttr(this.opened()))
    readonly mode = input<DockingPanelMode>("rigid")
    readonly maxSize = input<number | undefined | null>(undefined)
    readonly backdrop = input<BackdropMode>(false)

    readonly gridArea = computed(() => this.position().intoGridArea())
    readonly orient = computed(() => this.position().orient)
    readonly side = computed(() => {
        const pos = this.position()
        return pos.orient === "horizontal" ? pos.cells[0].v : pos.cells[0].h
    })

    readonly content = viewChild.required("content", { read: ElementRef })

    readonly dimension$ = toObservable(this.content).pipe(
        switchMap(content => this.#dimWatcher.watch(content, "border-box")),
        takeUntilDestroyed()
    )
    readonly dimension = toSignal(this.dimension$)

    readonly contentSize = computed(() => {
        const dim = this.dimension()
        if (!dim) {
            return 0
        }
        return this.orient() === "horizontal" ? dim.height : dim.width
    })

    // readonly backdropSize = computed(() => {
    //     const mode = this.backdrop()
    //     if (mode === true || mode === "full") {
    //         return L9Range.coerce("top:left-bottom:right").intoGridArea()
    //     } else if (mode === "panel-size") {
    //         const pos = this.position()
    //         if (pos.orient === "horizontal") {

    //         }

    //         return ""
    //     }
    //     return null
    // })

    open() {
        this.opened.set(true)
    }

    close() {
        this.opened.set(false)
    }
}
