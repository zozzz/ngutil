import { Component, computed, ElementRef, inject, input, model, viewChild } from "@angular/core"
import { takeUntilDestroyed, toObservable, toSignal } from "@angular/core/rxjs-interop"

import { switchMap } from "rxjs"

import { coerceBoolAttr, NumberWithUnit } from "@ngutil/common"
import { DimensionWatcher } from "@ngutil/style"

import { L9Range } from "../l9/range"

export type DockingPanelState = "full" | "mini" | "hidden"
export type DockingPanelMode = "over" | "push" | "rigid"

const DEFAULT_POSITION = L9Range.coerce("left")
const HIDDEN_SIZE = new NumberWithUnit(0, "px")
const AUTO_SIZE = NumberWithUnit.coerce("auto")

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
    readonly opened = model<boolean>(false)
    readonly _opened = computed(() => coerceBoolAttr(this.opened()))
    readonly mode = input<DockingPanelMode>("rigid")
    readonly maxSize = input<number | undefined | null>(undefined)

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

    open() {
        this.opened.set(true)
    }

    close() {
        this.opened.set(false)
    }
}
