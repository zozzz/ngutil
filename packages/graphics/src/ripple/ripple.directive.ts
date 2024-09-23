import { Directive, ElementRef, NgZone, TemplateRef } from "@angular/core"

import { Destructible, IDisposable } from "@ngutil/common"

import { maxPossibleRadius } from "../util"

@Directive({
    standalone: true,
    selector: "ng-template[nuRipple]",
    exportAs: "nuRipple"
})
export class RippleDirective extends Destructible {
    #current?: Ripple

    constructor(
        private readonly tplRef: TemplateRef<any>,
        private readonly zone: NgZone,
        private readonly el: ElementRef<Node>
    ) {
        super()
        zone.runOutsideAngular(() => {
            const target = el.nativeElement.parentElement
            if (target) {
                target.addEventListener("mousedown", this.#onMouseDown)
                this.d.any(() => target.removeEventListener("mousedown", this.#onMouseDown))
            }
        })
    }

    begin(event: MouseEvent) {
        this.#current?.autoDestroy()
        const cfg = this.#createRippleConfig(event)
        const ripple = this.#createRipple(cfg)
        this.#current = ripple

        const refEl = this.tplRef.elementRef.nativeElement as HTMLElement
        refEl.parentNode?.insertBefore(ripple.el, refEl)
        ripple.start()
    }

    end() {
        this.#current?.autoDestroy()
    }

    #createRipple(config: RippleConfig) {
        const ripple = new Ripple(config, this.zone, () => {
            if (this.#current === ripple) {
                this.#current = undefined
            }
        })
        this.d.disposable(ripple)
        return ripple
    }

    #createRippleConfig(event: MouseEvent): RippleConfig {
        const container = event.currentTarget as HTMLElement
        const bounds = container.getBoundingClientRect()
        const w = bounds.width
        const h = bounds.height
        const x = event.clientX - bounds.left
        const y = event.clientY - bounds.top
        const r = maxPossibleRadius(x, y, w, h) + Math.min(w, h)
        return { x, y, w, h, r, d: 600 }
    }

    #onMouseDown = (event: MouseEvent) => {
        this.begin(event)
    }
}

type RippleConfig = { x: number; y: number; w: number; h: number; r: number; d: number }

export class Ripple implements IDisposable {
    public readonly el: HTMLDivElement
    public readonly isRunning: boolean = false

    #autoDestroy = false
    #hiding = false

    constructor(
        config: RippleConfig,
        zone: NgZone,
        public readonly onDestroy: () => void
    ) {
        const el = document.createElement("div")
        el.style.position = "absolute"
        el.style.top = `${config.y - config.r}px`
        el.style.left = `${config.x - config.r}px`
        el.style.width = `${config.r * 2}px`
        el.style.height = `${config.r * 2}px`
        el.style.pointerEvents = "none"
        el.style.backgroundColor = "var(--ripple-color)"
        el.style.borderRadius = "50%"
        el.style.transition = `opacity ${config.d / 2}ms ease-out, transform ${config.d}ms ease-out`
        el.style.opacity = "0"
        el.style.transformOrigin = "center"
        el.style.transform = "scale(0)"
        this.el = el

        zone.runOutsideAngular(() => {
            el.addEventListener("transitionstart", this.#transBegin)
            el.addEventListener("transitionend", this.#transEnd)
            el.addEventListener("transitioncancel", this.#transEnd)
            document.addEventListener("mouseup", this.autoDestroy, { capture: true, passive: true })
            document.addEventListener("dragend", this.autoDestroy, { capture: true, passive: true })
        })
    }

    start() {
        // eslint-disable-next-line no-extra-semi
        ;(this as { isRunning: boolean }).isRunning = true
        // XXX: force style apply
        const opacity = typeof window !== "undefined" ? Number(window.getComputedStyle(this.el).opacity) : 1
        this.el.style.opacity = opacity ? "0.3" : "0.3"
        this.el.style.transform = "scale(1)"
    }

    autoDestroy = () => {
        if (this.isRunning) {
            this.#autoDestroy = true
        } else {
            this.#fadeOut()
        }
    }

    dispose(): void {
        this.el.removeEventListener("transitionstart", this.#transBegin)
        this.el.removeEventListener("transitionend", this.#transEnd)
        this.el.removeEventListener("transitioncancel", this.#transEnd)
        document.removeEventListener("mouseup", this.autoDestroy, { capture: true })
        this.el.parentNode?.removeChild(this.el)
        this.onDestroy()
    }

    #transBegin = () => {
        // eslint-disable-next-line no-extra-semi
        ;(this as { isRunning: boolean }).isRunning = true
    }

    #transEnd = (event: TransitionEvent) => {
        if (event.propertyName === "opacity") {
            if (this.#hiding) {
                this.dispose()
            } else {
                if (this.#autoDestroy) {
                    this.#fadeOut()
                }
            }
        } else if (event.propertyName === "transform") {
            // eslint-disable-next-line no-extra-semi
            ;(this as { isRunning: boolean }).isRunning = false
            if (this.#autoDestroy) {
                this.dispose()
            }
        }
    }

    #fadeOut() {
        if (this.#hiding) {
            return
        }
        this.#hiding = true
        this.el.style.opacity = "0"
    }
}
