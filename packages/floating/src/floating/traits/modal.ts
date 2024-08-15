import { fallAnimation } from "./animation"
import { backdrop } from "./backdrop"
import { focus } from "./focus"
import { keystroke } from "./keystroke"
import { position } from "./position"

export interface ModalOptions {
    closeOnBackdropClick?: boolean
}

export function modal(options: ModalOptions = {}) {
    return [
        position({
            anchor: {
                ref: "viewport",
                align: "center middle"
            },
            placement: {
                ref: "viewport",
                padding: "16px"
            }
        }),
        backdrop({ type: "solid", color: "rgba(0, 0, 0, .3)", closeOnClick: options.closeOnBackdropClick }),
        focus({ trap: true }),
        keystroke(),
        fallAnimation()
    ]
}
