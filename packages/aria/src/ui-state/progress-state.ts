import { Directive } from "@angular/core"

import {
    animationFrames,
    map,
    Observable,
    of,
    scan,
    shareReplay,
    startWith,
    Subject,
    switchMap,
    takeWhile,
    tap
} from "rxjs"

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
    laxPercent?: number
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
                delete current.laxPercent
            }

            return { ...state, [input.name]: { ...current, ...input } }
        }, {} as ProgressSegements),
        switchMap(state => {
            const laxCount = Object.values(state).filter(({ progress }) => progress.type === "lax").length

            if (laxCount > 0) {
                return animationFrames().pipe(
                    map(({ timestamp }) => {
                        for (const entry of Object.values(state)) {
                            if (entry.progress.type === "lax") {
                                if (entry.laxBegin == null) {
                                    entry.laxBegin = timestamp
                                }

                                let percent = (timestamp - entry.laxBegin) / entry.progress.predictedTime
                                if (percent >= 0.8) {
                                    const final = (timestamp - entry.laxBegin) / (entry.progress.predictedTime * 50)
                                    percent = 0.8 + Math.log1p(final)
                                }
                                entry.laxPercent = clamp(percent, 0, 0.99)
                            } else {
                                delete entry.laxPercent
                            }
                        }
                        return state
                    }),
                    takeWhile(() => {
                        const doneCount = Object.values(state).filter(
                            item => item.progress.type === "lax" && item.laxPercent! >= 1
                        ).length
                        return doneCount !== laxCount
                    }, true)
                )
            } else {
                return of(state)
            }
        }),
        tap(state => {
            const slist = Object.values(state) as Array<Mutable<ProgressSegement>>
            const min = slist.reduce((min, current) => Math.min(min, current.distribution || 0), Infinity) || 1
            const totalDistribution = slist.reduce((total, current) => total + (current.distribution || min), 0)

            for (const segment of slist) {
                if (segment.distribution == null) {
                    segment.distribution = min
                }

                segment.ratio = segment.distribution / totalDistribution + 0.0001

                if (segment.progress.type === "fix") {
                    const percent = clamp(segment.progress.percent, 0, 1)
                    segment.share = percent * segment.ratio
                    segment.done = percent >= 1
                } else if (segment.progress.type === "lax" && segment.laxPercent != null) {
                    const percent = segment.laxPercent
                    segment.share = percent * segment.ratio
                    segment.done = percent >= 1
                }
            }
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    readonly value$: Observable<DeepReadonly<ProgressSegements>> = this.#state

    readonly percent$: Observable<number> = this.value$.pipe(
        map(value =>
            clamp(
                Object.values(value).reduce((a, b) => a + b.share, 0),
                0,
                1
            )
        ),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    segment(name: string, distribution?: number): ProgressSegmentRef {
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
