import { ElementRef } from "@angular/core"

import { filter, Observable, of, share, take } from "rxjs"

import { Lifecycle } from "@ngutil/common"

export type DisposeHandler<T> = (ref: T) => Observable<void>

export enum AlwaysOnTop {
    /**
     * Display as open order
     */
    None = 0,

    /**
     * Modals
     */
    Modal = 2,

    /**
     * User access control
     */
    UAC = 3,

    /**
     * Toast...
     */
    Toast = 4,

    /**
     * Like select drop down, tooltip, stb...
     */
    Control = 5
}

// TODO: disposing, disposed

export abstract class ChildRef<T extends HTMLElement = HTMLElement> extends ElementRef<T> {
    readonly state = new Lifecycle({
        showing: {},
        shown: {},
        disposing: { cancellable: false },
        disposed: { cancellable: false, order: "sequential" }
    })

    /**
     * @internal
     */
    set zIndex(val: number) {
        if (this._zIndex !== val) {
            this._zIndex = val
            this.nativeElement.style.zIndex = String(val)
        }
    }
    get zIndex(): number {
        return this._zIndex
    }
    private _zIndex: number = -1

    protected readonly disposed$ = this.state.current$.pipe(
        filter(state => state === "disposed"),
        take(1),
        share()
    )

    constructor(
        nativeElement: T,
        public readonly alwaysOnTop: AlwaysOnTop = AlwaysOnTop.None
    ) {
        super(nativeElement)
        this.state.on("disposed", () => {
            this.nativeElement.parentElement?.removeChild(this.nativeElement)
            this.state.destroy()
            delete (this as any).state
        })
    }

    dispose() {
        if (this.state == null) {
            return of()
        }
        return this.state.run(["disposing", "disposed"])
    }
}
