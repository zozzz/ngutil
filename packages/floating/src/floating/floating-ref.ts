import { Inject, Injectable, InjectionToken } from "@angular/core"

import { EMPTY, filter, map, merge, Observable, ReplaySubject, shareReplay, takeUntil } from "rxjs"

import { StateChain } from "@ngutil/common"

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

@Injectable()
export class FloatingRef<C extends FloatingChannel = FloatingChannel, T extends HTMLElement = HTMLElement> {
    readonly channel = new ReplaySubject<FloatingChannel>(1)

    readonly state = new StateChain({
        init: {},
        showing: {},
        shown: {},
        closing: { cancellable: false, order: "sequential" },
        disposing: { cancellable: false },
        disposed: { cancellable: false, order: "sequential" },
        cleanup: { cancellable: false, order: "sequential" }
    })

    readonly #traits: Traits = {}
    readonly traitState$: Observable<FloatingTraitEvent>

    readonly #untilCleanup = this.state.current$.pipe(
        filter(state => state === "cleanup"),
        shareReplay(1)
    )

    readonly #untilDisposed = this.state.current$.pipe(
        filter(state => state === "cleanup"),
        shareReplay(1)
    )

    constructor(
        readonly layerSvc: LayerService,
        readonly container: ContainerRef,
        @Inject(TRAITS) traits: Traits
    ) {
        container.nativeElement.style.overflow = "hidden"

        this.#traits = traits
        this.traitState$ = this.#traitState().pipe(shareReplay(1))

        const sub = this.state.current$.subscribe(state => {
            this.emit({ type: state } as C)
        })
        this.state.on("init", () => {
            this.traitState$.pipe(takeUntil(this.#untilCleanup)).subscribe()
        })
        this.state.on("disposed", () => {
            sub.unsubscribe()
        })
        this.state.control(container.state)
    }

    show() {
        return this.state.run(["init", "showing", "shown"])
    }

    hide() {
        return this.state.run(["disposing", "disposed", "cleanup"])
    }

    close() {
        return this.state.run(["closing", "disposing", "disposed", "cleanup"])
    }

    emit(event: Omit<C, "floatingRef">) {
        this.channel.next({ ...event, floatingRef: this } as any)
    }

    setResult(data: any) {
        this.emit({ type: "result", data } as C)
        this.hide().subscribe()
    }

    watchTrait<T>(name: string): Observable<T> {
        return this.traitState$.pipe(
            takeUntil(this.#untilDisposed),
            filter(event => event.name === name),
            map(event => event.data as T),
            shareReplay(1)
        )
    }

    #traitState(): Observable<FloatingTraitEvent> {
        const src = []

        for (const [k, v] of Object.entries(this.#traits)) {
            src.push(
                v.connect(this).pipe(
                    takeUntil(this.#untilCleanup),
                    map(result => {
                        return { name: k, data: result }
                    })
                )
            )
        }

        if (src.length === 0) {
            return EMPTY
        } else if (src.length === 1) {
            return src[0]
        } else {
            return merge(...src)
        }
    }
}
