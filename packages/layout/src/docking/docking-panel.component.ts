import { AfterViewInit, Component, ElementRef, inject, Input, Output, ViewChild } from "@angular/core"

import { BehaviorSubject, combineLatest, map, Observable, of, ReplaySubject, shareReplay, switchMap } from "rxjs"

import {
    BooleanInput,
    coerceBoolAttr,
    Destructible,
    FastDOM,
    NumberWithUnit,
    NumberWithUnitInput
} from "@ngutil/common"
import { DimensionWatcher } from "@ngutil/style"

import { L9Range, L9RangeName } from "../l9/range"

export type DockingPanelState = "full" | "mini" | "hidden"
export type DockingPanelMode = "over" | "push" | "rigid"

const DEFAULT_POSITION = L9Range.coerce("left")
const HIDDEN_SIZE = new NumberWithUnit(0, "px")
const AUTO_SIZE = NumberWithUnit.coerce("auto")

@Component({
    standalone: true,
    selector: "nu-docking-panel",
    exportAs: "nuDockingPanel",
    styleUrl: "./docking-panel.component.scss",
    template: `
        <div class="nu-docking-wrapper" #content>
            <ng-content></ng-content>
        </div>
    `
})
export class DockingPanelComponent extends Destructible implements AfterViewInit {
    readonly el = inject(ElementRef<HTMLElement>)
    readonly #dimWatcher = inject(DimensionWatcher)
    @ViewChild("content", { read: ElementRef, static: true })
    readonly content!: ElementRef<HTMLElement>

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
    readonly state = new BehaviorSubject<DockingPanelState>("full")

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
    readonly #fullSize = new BehaviorSubject<NumberWithUnit>(AUTO_SIZE)

    @Input("miniSize")
    set miniSizeInput(val: NumberWithUnitInput) {
        const coerced = NumberWithUnit.coerce(val, "px")
        if (this.#miniSize.value !== coerced) {
            this.#miniSize.next(coerced)
        }
    }
    readonly #miniSize = new BehaviorSubject<NumberWithUnit>(HIDDEN_SIZE)

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

    @Input("backdrop")
    set backdrop(val: BooleanInput) {
        this.#backdrop = coerceBoolAttr(val)
    }
    get backdrop(): boolean {
        return this.#backdrop
    }
    #backdrop: boolean = false

    readonly #contentSize = new ReplaySubject<{ width: NumberWithUnit; height: NumberWithUnit }>(1)

    readonly #autoSize = combineLatest({
        dim: this.#contentSize,
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
        miniSize: this.miniSize,
        contentSize: this.#contentSize
    })

    // TODO: better animation handling in min -> hidden -> min -> full
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

            const isHorizontal = changes.position.orient === "horizontal"
            let w = null
            let h = null

            // TODO: when change state from mini -> hidden, currently wrong behavior
            // the good behavior is to not gain fullSize ang go to hidden
            if (changes.state === "mini") {
                if (isHorizontal) {
                    h = changes.miniSize.unit === "auto" ? changes.contentSize.height : changes.miniSize
                } else {
                    w = changes.miniSize.unit === "auto" ? changes.contentSize.width : changes.miniSize
                }
            } else {
                if (isHorizontal) {
                    h = changes.fullSize.unit === "auto" ? changes.contentSize.height : changes.fullSize
                } else {
                    w = changes.fullSize.unit === "auto" ? changes.contentSize.width : changes.fullSize
                }
            }

            FastDOM.setStyle(
                this.el.nativeElement,
                {
                    "--docking-panel-w": w != null ? `${w}` : null,
                    "--docking-panel-h": h != null ? `${h}` : null,
                    "--docking-panel-content-w": changes.contentSize.width,
                    "--docking-panel-content-h": changes.contentSize.height
                },
                () => FastDOM.setAttributes(this.el.nativeElement, { animate: "" })
            )
        })
    }

    ngAfterViewInit(): void {
        this.d
            .sub(this.#dimWatcher.watch(this.content, "scroll-box"))
            .pipe(
                map(dim => {
                    return {
                        width: new NumberWithUnit(dim.width, "px"),
                        height: new NumberWithUnit(dim.height, "px")
                    }
                })
            )
            .subscribe(this.#contentSize)
    }

    open() {
        this.state.next("full")
    }

    close() {
        this.state.next("hidden")
    }

    minimize() {
        if (this.minimizable) {
            this.state.next("mini")
        }
    }
}

type ChangesObservable = typeof DockingPanelComponent.prototype.changes
export type DockingPanelChanges = ChangesObservable extends Observable<infer T> ? T : never
