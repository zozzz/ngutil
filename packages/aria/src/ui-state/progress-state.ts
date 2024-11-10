import { Directive } from "@angular/core"
import { toSignal } from "@angular/core/rxjs-interop"

import { animationFrames, map, Observable, of, scan, shareReplay, startWith, Subject, switchMap, takeWhile } from "rxjs"

import { clamp } from "lodash"
import { Mutable } from "utility-types"

import { DeepReadonly } from "@ngutil/common"

export interface ProgressCommon {
    readonly message?: string
    readonly [other: string]: unknown
}

export interface ProgressLax {
    readonly type: "lax"
    readonly predictedTime: number
    // readonly updateInterval: number
}

export interface ProgressFix {
    readonly type: "fix"
    readonly percent: number
}

export type Progress = (ProgressLax | ProgressFix) & ProgressCommon

export interface ProgressSegmentInput {
    readonly name: string
    readonly distribution?: number
    readonly progress: DeepReadonly<Progress>
}

export interface ProgressSegement extends ProgressSegmentInput {
    ratio: number
    share: number
    done: boolean
    laxBegin?: number
}

export type ProgressSegements = { [key: string]: ProgressSegement }

const SEGMENT_REGISTER: Progress = { type: "fix", percent: 0 }
const SEGMENT_COMPLETE: Progress = { type: "fix", percent: 1 }

@Directive()
export class ProgressState {
    readonly #segments: { [key: string]: ProgressSegmentRef } = {}

    readonly #input = new Subject<ProgressSegmentInput>()

    readonly #state: Observable<ProgressSegements> = this.#input.pipe(
        startWith(null),
        scan((state, input) => {
            if (Object.keys(state).length === 0) {
                state = this.#initialState()
            }

            if (input == null) {
                return state
            }

            let current = state[input.name] ?? { ratio: 0, share: 0, done: false }
            current = { ...current, ...input }

            if (input.progress.type === "lax") {
                delete current.laxBegin
                current.done = false
            }

            if (input.progress.type === "fix" && input.progress.percent < 1) {
                current.done = false
            }

            return { ...state, [input.name]: { ...current, ...input } }
        }, {} as ProgressSegements),
        switchMap(state => {
            const slist = Object.values(state) as Array<Mutable<ProgressSegement>>
            const min = slist.reduce((min, current) => Math.min(min, current.distribution || 0), Infinity) || 1
            const totalDistribution = slist.reduce((total, current) => total + (current.distribution || min), 0)
            const hasLax = slist.some(segment => segment.progress.type === "lax")
            const trigger = hasLax ? animationFrames() : of({ timestamp: performance.now() })

            return trigger.pipe(
                map(({ timestamp }) => {
                    for (const segment of slist) {
                        if (segment.distribution == null) {
                            segment.distribution = min
                        }
                        segment.ratio = segment.distribution / totalDistribution + 0.0001

                        let percent: number

                        if (segment.progress.type === "lax") {
                            if (segment.laxBegin == null) {
                                segment.laxBegin = timestamp
                            }

                            percent = (timestamp - segment.laxBegin) / segment.progress.predictedTime
                            if (percent >= 0.8) {
                                const final = (timestamp - segment.laxBegin) / (segment.progress.predictedTime * 50)
                                percent = 0.8 + Math.log1p(final)
                            }
                        } else {
                            delete segment.laxBegin
                            percent = clamp(segment.progress.percent, 0, 1)
                        }

                        segment.share = percent * segment.ratio
                        segment.done = percent >= 1
                    }

                    return state
                }),
                takeWhile(state => Object.values(state).some(segment => !segment.done), true)
            )
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    readonly value$: Observable<DeepReadonly<ProgressSegements>> = this.#state
    readonly value = toSignal(this.value$)

    readonly percent$: Observable<number> = this.value$.pipe(
        map(value =>
            value != null
                ? clamp(
                      Object.values(value).reduce((a, b) => a + b.share, 0),
                      0,
                      1
                  )
                : 0
        ),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    readonly percent = toSignal(this.percent$)

    segment(name: string, distribution: number = 1): ProgressSegmentRef {
        const segment =
            this.#segments[name] ?? (this.#segments[name] = new ProgressSegmentRef(this.#input, name, distribution))
        segment.next(SEGMENT_REGISTER)
        return segment
    }

    connect(state: ProgressState, name: string, distribution?: number): Observable<void> {
        return new Observable(() => {
            const segment = this.segment(name, distribution)
            return state.percent$.subscribe(percent => {
                segment.next({ type: "fix", percent })
            })
        })
    }

    #initialState() {
        return Object.values(this.#segments).reduce((res, segment) => {
            if (segment.value) {
                res[segment.name] = {
                    name: segment.name,
                    distribution: segment.distribution,
                    progress: segment.value,
                    ratio: 0,
                    share: 0,
                    done: false
                }
            }
            return res
        }, {} as ProgressSegements)
    }
}

export class ProgressSegmentRef {
    readonly #subject: Subject<ProgressSegmentInput>

    set distribution(value: number | undefined) {
        if (this.#distribution !== value) {
            this.#distribution = value
            if (this.#value != null) {
                this.#next(this.#value)
            }
        }
    }

    get distribution() {
        return this.#distribution
    }
    #distribution?: number

    get value() {
        return this.#value
    }
    #value?: Progress

    constructor(
        subject: Subject<ProgressSegmentInput>,
        public readonly name: string,
        distribution?: number
    ) {
        this.#subject = subject
        this.#distribution = distribution
    }

    next(progress: Progress) {
        return this.#next(progress)
    }

    complete() {
        return this.#next(SEGMENT_COMPLETE)
    }

    #next(progress: Progress) {
        this.#value = progress
        this.#subject.next({ name: this.name, distribution: this.distribution, progress })
        return this
    }
}
