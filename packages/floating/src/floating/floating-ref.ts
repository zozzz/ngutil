import { Inject, Injectable, InjectionToken } from "@angular/core"

import {
    combineLatest,
    debounceTime,
    EMPTY,
    filter,
    map,
    Observable,
    ReplaySubject,
    shareReplay,
    startWith,
    take,
    takeUntil,
    takeWhile
} from "rxjs"

import { Lifecycle } from "@ngutil/common"

import { ContainerRef } from "../layer/container-ref"
import { LayerService } from "../layer/layer.service"
import { FloatingTrait } from "./traits/_base"

export type Traits = { [key: string]: FloatingTrait }

export const TRAITS = new InjectionToken<Traits>("TRAITS")

export interface FloatingChannel {
    floatingRef: FloatingRef
    type: string
    data?: any
}

export interface FloatingTraitEvent {
    name: string
    data: object
}

type TraitState = { [key: string]: FloatingTraitEvent | null }

let UID_COUNTER = 0

@Injectable()
export class FloatingRef<C extends FloatingChannel = FloatingChannel, T extends HTMLElement = HTMLElement> {
    readonly channel = new ReplaySubject<FloatingChannel>(1)

    readonly state = new Lifecycle({
        init: {},
        showing: {},
        shown: {},
        closing: { cancellable: false, order: "sequential" },
        disposing: { cancellable: false },
        disposed: { cancellable: false, order: "sequential" },
        cleanup: { cancellable: false, order: "sequential" }
    })

    readonly #traits: Traits = {}
    readonly traitState$: Observable<TraitState>

    readonly #untilCleanup = this.state.onExecute("cleanup")
    readonly #untilDisposed = this.state.onExecute("disposed")

    readonly uid = `${++UID_COUNTER}`

    constructor(
        readonly layerSvc: LayerService,
        readonly container: ContainerRef,
        @Inject(TRAITS) traits: Traits
    ) {
        Object.assign(container.nativeElement.style, {
            overflow: "hidden",
            visibility: "hidden",
            pointerEvents: "none"
        })
        container.nativeElement.setAttribute("data-floating", this.uid)

        this.#traits = traits
        this.traitState$ = this.#traitState().pipe(shareReplay(1))

        this.state.current$.pipe(takeWhile(state => state !== "cleanup", true)).subscribe(state => {
            this.emit({ type: state } as C)
        })
        this.state.on("init", () => this.traitState$.pipe(takeUntil(this.#untilCleanup), debounceTime(5), take(1)))
        this.state.on("showing", () => {
            container.nativeElement.style.visibility = "visible"
        })
        this.state.on("shown", () => {
            container.nativeElement.style.pointerEvents = null as any
        })
        this.state.on("disposing", () => {
            container.nativeElement.style.pointerEvents = "none"
        })

        this.state.control(container.state)
    }

    show() {
        return this.state.run("init", "showing", "shown")
    }

    /**
     * @deprecated
     */
    hide() {
        return this.close(true)
    }

    close(force = false) {
        if (force) {
            return this.state.run("disposing", "disposed", "cleanup")
        } else {
            return this.state.run("closing", "disposing", "disposed", "cleanup")
        }
    }

    emit(event: Omit<C, "floatingRef">) {
        this.channel.next({ ...event, floatingRef: this } as any)
    }

    setResult(data: any) {
        this.emit({ type: "result", data } as C)
        this.close(true).subscribe()
    }

    watchTrait<T>(name: string): Observable<T> {
        return this.traitState$.pipe(
            takeUntil(this.#untilDisposed),
            map(state => state[name]),
            filter(value => value != null)
        ) as Observable<T>
    }

    #traitState(): Observable<TraitState> {
        const src: { [key: string]: Observable<FloatingTraitEvent | null> } = {}

        for (const [k, v] of Object.entries(this.#traits)) {
            src[k] = v.connect(this).pipe(takeUntil(this.#untilDisposed), startWith(null))
        }

        if (Object.keys(src).length === 0) {
            return EMPTY
        } else {
            return combineLatest(src).pipe(shareReplay(1))
        }
    }
}
