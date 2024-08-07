import { ElementRef } from "@angular/core"

import { Observable, of } from "rxjs"

import { StateChain } from "@ngutil/common"

export type DisposeHandler<T> = (ref: T) => Observable<void>

// TODO: disposing, disposed

export abstract class ChildRef<T extends HTMLElement = HTMLElement> extends ElementRef<T> {
    readonly state = new StateChain({
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

    constructor(nativeElement: T) {
        super(nativeElement)
        this.state.on("disposed", () => this.destroy())
    }

    dispose() {
        if (this.state == null) {
            return of(null)
        }
        return this.state.run(["disposing", "disposed"])
    }

    protected destroy() {
        this.nativeElement.parentElement?.removeChild(this.nativeElement)
        this.state.destroy()
        delete (this as any).state
    }
}
