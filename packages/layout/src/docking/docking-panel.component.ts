import { Component, ElementRef, inject, Input, Output } from "@angular/core"

import { BehaviorSubject, combineLatest, map, Observable, of, shareReplay, switchMap } from "rxjs"

import {
    BooleanInput,
    coerceBoolAttr,
    Destructible,
    FastDOM,
    NumberWithUnit,
    NumberWithUnitInput
} from "@ngutil/common"

import { L9Range, L9RangeName } from "../l9/range"
import { watchDimension } from "../util"

export type DockingPanelState = "full" | "mini" | "invisible"
export type DockingPanelMode = "over" | "push" | "rigid"

const DEFAULT_POSITION = L9Range.coerce("left")

@Component({
    standalone: true,
    selector: "nu-docking-panel",
    exportAs: "nuDockingPanel",
    styleUrl: "./docking-panel.component.scss",
    template: `<ng-content></ng-content>`
})
export class DockingPanelComponent extends Destructible {
    readonly el = inject(ElementRef<HTMLElement>)

    @Input("position")
    set positionInput(val: L9Range | L9RangeName) {
        const coerced = L9Range.coerce(val)
        if (coerced.orient === "rect") {
            throw new Error(`Invalid position value: ${val}`)
        }

        if (!this.position.value.isEq(coerced)) {
            this.position.next(coerced)
        }
    }
    readonly position = new BehaviorSubject<L9Range>(DEFAULT_POSITION)

    @Input("state")
    set stateInput(val: DockingPanelState) {
        if (this.state.value !== val) {
            this.state.next(val)
        }
    }
    @Output("stateChanges")
    readonly state = new BehaviorSubject<DockingPanelState>("invisible")

    @Input("mode")
    set modeInput(val: DockingPanelMode) {
        if (this.mode.value !== val) {
            this.mode.next(val)
        }
    }
    readonly mode = new BehaviorSubject<DockingPanelMode>("rigid")

    @Input("fullSize")
    set fullSizeInput(val: NumberWithUnitInput) {
        const coerced = NumberWithUnit.coerce(val, "px")
        if (this.#fullSize.value !== coerced) {
            this.#fullSize.next(coerced)
        }
    }
    readonly #fullSize = new BehaviorSubject<NumberWithUnit>(NumberWithUnit.coerce(0))

    @Input("miniSize")
    set miniSizeInput(val: NumberWithUnitInput) {
        const coerced = NumberWithUnit.coerce(val, "px")
        if (this.#miniSize.value !== coerced) {
            this.#miniSize.next(coerced)
        }
    }
    readonly #miniSize = new BehaviorSubject<NumberWithUnit>(NumberWithUnit.coerce(0))

    @Input("minimizable")
    set minimizable(val: BooleanInput) {
        this.#minimizable = coerceBoolAttr(val)
        this.#minimizableAuto = false
    }
    get minimizable(): boolean {
        return this.#minimizable
    }
    #minimizable: boolean = false
    #minimizableAuto: boolean = true

    readonly #autoSize = combineLatest({
        dim: watchDimension(this.el.nativeElement, "scroll-box"),
        pos: this.position
    }).pipe(
        map(({ dim, pos }) => {
            if (pos.orient === "horizontal") {
                return dim.height
            } else {
                return dim.width
            }
        }),
        shareReplay(1)
    )

    readonly fullSize = this.#fullSize.pipe(
        switchMap(size => {
            if (size.unit === "auto") {
                return this.#autoSize
            } else {
                return of(size)
            }
        }),
        shareReplay(1)
    )

    readonly miniSize = this.#miniSize.pipe(
        switchMap(size => {
            if (size.unit === "auto") {
                return this.#autoSize
            } else {
                return of(size)
            }
        }),
        shareReplay(1)
    )

    readonly changes = combineLatest({
        position: this.position,
        state: this.state,
        mode: this.mode,
        fullSize: this.fullSize,
        miniSize: this.miniSize
    })

    constructor() {
        super()

        this.d.sub(this.changes).subscribe(changes => {
            if (this.#minimizableAuto) {
                this.#minimizable = this.#miniSize.value.value !== 0
            }

            FastDOM.setAttributes(this.el.nativeElement, {
                state: changes.state,
                orient: changes.position.orient,
                mode: changes.mode,
                side:
                    changes.position.orient === "horizontal" ? changes.position.cells[0].v : changes.position.cells[0].h
            })
        })
    }

    open() {
        this.state.next("full")
    }

    close() {
        this.state.next("invisible")
    }

    minimize() {
        if (this.minimizable) {
            this.state.next("mini")
        }
    }
}

type ChangesObservable = typeof DockingPanelComponent.prototype.changes
export type DockingPanelChanges = ChangesObservable extends Observable<infer T> ? T : never
