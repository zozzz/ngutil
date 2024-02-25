import { ElementRef, inject } from "@angular/core"

import { BehaviorSubject } from "rxjs"

import { Destructible } from "@ngutil/common"

import { FocusService } from "./focus.service"

// TODO: implement
export class FocusTrap extends Destructible {
    #manager = inject(FocusService)
    #el = inject(ElementRef<HTMLElement>)

    get enabled() {
        return this.#enabled.value
    }
    set enabled(val: boolean) {
        if (this.#enabled.value !== val) {
            this.#enabled.next(val)
        }
    }
    #enabled = new BehaviorSubject<boolean>(true)

    enable() {
        this.enabled = true
    }

    disable() {
        this.enabled = false
    }
}
