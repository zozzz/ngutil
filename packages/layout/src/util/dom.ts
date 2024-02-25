import { rawRequestAnimationFrame } from "@ngutil/common"

type FastDomHandler = () => void

class _FastDOM {
    #rafId: any
    #mutate: Array<FastDomHandler> = []
    #measure: Array<FastDomHandler> = []

    public mutate(handler: FastDomHandler) {
        this.#mutate.push(handler)
        this._schedule()
    }

    public mutateNext(handler: FastDomHandler) {
        this.#mutate.push(() => {
            this.#mutate.push(handler)
        })
        this._schedule()
    }

    public measure(handler: FastDomHandler) {
        this.#measure.push(handler)
        this._schedule()
    }

    public setStyle(el: HTMLElement, style: { [key: string]: any }, chain?: FastDomHandler) {
        this.mutate(() => {
            for (const [k, v] of Object.entries(style)) {
                if (v == null) {
                    el.style.removeProperty(k)
                } else {
                    el.style.setProperty(k, v)
                }
            }

            chain && chain()
        })
    }

    public setAttributes(el: HTMLElement, attrs: { [key: string]: any }, chain?: FastDomHandler) {
        this.mutate(() => {
            for (const [k, v] of Object.entries(attrs)) {
                if (v == null) {
                    el.removeAttribute(k)
                } else {
                    el.setAttribute(k, v)
                }
            }

            chain && chain()
        })
    }

    private _schedule() {
        if (!this.#rafId) {
            this.#rafId = rawRequestAnimationFrame(this._apply.bind(this))
        }
    }

    private _apply() {
        this.#rafId = null

        const measure = this.#measure.slice()
        const mutate = this.#mutate.slice()
        this.#measure.length = 0
        this.#mutate.length = 0

        runQ(measure)
        runQ(mutate)

        if (this.#measure.length || this.#mutate.length) {
            this._schedule()
        }
    }
}

function runQ(items: FastDomHandler[]) {
    let item: FastDomHandler
    while ((item = items.shift()!)) {
        item()
    }
}

export const FastDOM = new _FastDOM()
