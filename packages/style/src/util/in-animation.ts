import { combineLatest, distinctUntilChanged, map, Observable, Subscriber } from "rxjs"

import { __zone_symbol__, rawCancelAnimationFrame, rawRequestAnimationFrame } from "@ngutil/common"

const addEventListener = __zone_symbol__("addEventListener")
const removeEventListener = __zone_symbol__("removeEventListener")

export function inAnimation<T extends HTMLElement>(el: T, animations?: string[]) {
    return _in(
        el,
        "animationName",
        "animationstart",
        "animationiteration",
        "animationend",
        "animationcancel",
        animations
    )
}

export function inTransition<T extends HTMLElement>(el: T, properties?: string[]) {
    return _in(el, "propertyName", "transitionstart", "transitionrun", "transitionend", "transitioncancel", properties)
}

export function isAnimating<T extends HTMLElement>(el: T) {
    return combineLatest([inAnimation(el), inTransition(el)]).pipe(
        map(values => !!(values[0] || values[1])),
        distinctUntilChanged()
    )
}

function _in<T extends HTMLElement>(
    el: T,
    keyName: string,
    beginName: string,
    doingName: string,
    endName: string,
    cancelName: string,
    keys?: string[]
) {
    return new Observable((dest: Subscriber<string[] | null>) => {
        const state: { [key: string]: number } = {}

        const start = (event: any) => {
            const key = event[keyName]
            if (keys && keys.length > 0 && !keys.includes(key)) {
                return
            }

            if (key in state) {
                state[key]++
            } else {
                state[key] = 1
            }
            dest.next(Object.keys(state))
        }

        const doing = (event: any) => {
            const key = event[keyName]
            if (keys && keys.length > 0 && !keys.includes(key)) {
                return
            }

            if (!(key in state)) {
                state[key] = 1
                dest.next(Object.keys(state))
            }
        }

        const end = (event: any) => {
            if (event[keyName] in state) {
                const key = event[keyName]
                state[key]--
                if (state[key] <= 0) {
                    delete state[key]
                }
            }

            if (Object.keys(state).length === 0) {
                dest.next(null)
            }
        }

        el[addEventListener](beginName, start)
        el[addEventListener](doingName, doing)
        el[addEventListener](endName, end)
        el[addEventListener](cancelName, end)

        const raf = rawRequestAnimationFrame(() => {
            if (Object.keys(state).length === 0) {
                dest.next(null)
            }
        })

        return () => {
            rawCancelAnimationFrame(raf)
            el[removeEventListener](beginName, start)
            el[removeEventListener](doingName, doing)
            el[removeEventListener](endName, end)
            el[removeEventListener](cancelName, end)
        }
    }).pipe(distinctUntilChanged())
}
