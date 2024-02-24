import { Injectable } from "@angular/core"

import { BehaviorSubject, combineLatest, Observable, shareReplay } from "rxjs"

// type Row = 1 | 2 | 3
// type Col = 1 | 2 | 3
// type Cell = `${Row}:${Col}`
// type EndCell = `/${Cell}`
export type DockingPanelSide = "left" | "right" | "top" | "bottom"
// export type PanelPositionInput = `${Cell}${EndCell | ""}` | PositonAlias
export type DockingPanelPositionInput = DockingPanelSide
export type DockingPanelState = "full" | "mini" | "invisible"
export type DockingPanelMode = "overlay" | "embedded"
export type DockingPanelOrient = "horizontal" | "vertical"

// const PANEL_POS_REGEX = /^(?:(\d+)\s*:\s*(\d+))(?:\s*\/\s*(\d+)\s*:\s*(\d+))?$/

export class DockingPanelPosition {
    // readonly startRow: number
    // readonly startCol: number
    // readonly endRow: number
    // readonly endCol: number
    readonly side: DockingPanelSide
    readonly orient: DockingPanelOrient

    constructor(public input: DockingPanelPositionInput | null) {
        this.side = input || "left"

        // let startRow = 0
        // let startCol = 0
        // let endRow = 0
        // let endCol = 0

        // if (input) {
        //     const match = input.match(PANEL_POS_REGEX)
        //     if (match) {
        //         startRow = Number(match[1])
        //         startCol = Number(match[2])
        //         if (match[3]) {
        //             endRow = Number(match[3])
        //             endCol = Number(match[4])
        //         } else {
        //             endRow = startRow
        //             endCol = startCol
        //         }
        //     } else {
        //         console.warn(`Invalid position: ${input}`)
        //     }
        // }

        // this.startRow = startRow
        // this.startCol = startCol
        // this.endRow = endRow
        // this.endCol = endCol
        this.orient = this.#determineOrient()
    }

    #determineOrient(): DockingPanelOrient {
        if (this.side === "left" || this.side === "right") {
            return "vertical"
        } else {
            return "horizontal"
        }
    }
}

const INITIAL_POSITION = new DockingPanelPosition(null)

@Injectable()
export class DockingPanelService {
    readonly position = new BehaviorSubject<DockingPanelPosition>(INITIAL_POSITION)
    readonly state = new BehaviorSubject<DockingPanelState>("full")
    readonly mode = new BehaviorSubject<DockingPanelMode>("embedded")
    readonly fullSize = new BehaviorSubject<number>(0)
    readonly miniSize = new BehaviorSubject<number>(0)

    readonly changes = combineLatest({
        position: this.position,
        state: this.state,
        mode: this.mode,
        fullSize: this.fullSize,
        miniSize: this.miniSize
    }).pipe(shareReplay(1))

    get canMini() {
        return this.miniSize.value > 0
    }

    open() {
        this.state.next("full")
    }

    close() {
        this.state.next("invisible")
    }

    minimize() {
        if (this.canMini) {
            this.state.next("mini")
        }
    }
}

type ChangesObservable = typeof DockingPanelService.prototype.changes
export type DockingPanelChanges = ChangesObservable extends Observable<infer T> ? T : never
