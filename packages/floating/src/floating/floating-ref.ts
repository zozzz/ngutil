import { concat, EMPTY, filter, map, Observable, ReplaySubject, shareReplay, Subscription } from "rxjs"

import { StateChain } from "@ngutil/common"

import { type ContainerRef } from "../layer/container-ref"
import { type LayerService } from "../layer/layer.service"
import { FloatingTrait } from "./traits/_base"

export interface FloatingChannel {
    type: string
    data?: any
}

export interface FloatingTraitEvent {
    name: string
    data: object
}

export class FloatingRef<C extends FloatingChannel = FloatingChannel, T extends HTMLElement = HTMLElement> {
    readonly channel = new ReplaySubject<C>(1)

    readonly state = new StateChain({
        init: {},
        showing: {},
        shown: {},
        closing: { cancellable: false, order: "sequential" },
        disposing: { cancellable: false },
        disposed: { cancellable: false, order: "sequential" }
    })

    readonly #traits: { [key: string]: FloatingTrait } = {}
    readonly traitState$: Observable<FloatingTraitEvent>
    #traitStateSub?: Subscription

    constructor(
        readonly layerSvc: LayerService,
        readonly container: ContainerRef,
        traits: { [key: string]: FloatingTrait }
    ) {
        this.#traits = traits
        this.traitState$ = this.#traitState().pipe(shareReplay(1))

        const sub = this.state.current$.subscribe(state => {
            this.channel.next({ type: state } as any)
        })
        this.state.on("init", () => {
            this.#traitStateSub = this.traitState$.subscribe()
        })
        this.state.on("disposed", () => {
            this.#traitStateSub?.unsubscribe()
            sub.unsubscribe()
        })
        this.state.control(container.state)
    }

    show() {
        return this.state.run(["init", "showing", "shown"])
    }

    hide() {
        return this.state.run(["disposing", "disposed"])
    }

    close() {
        return this.state.run(["closing", "disposing", "disposed"])
    }

    watchTrait<T>(name: string): Observable<T> {
        return this.traitState$.pipe(
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
            return concat(...src)
        }
    }
}
