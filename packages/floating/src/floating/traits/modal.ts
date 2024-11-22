import { fallAnimation } from "./animation"
import { backdrop } from "./backdrop"
import { closeTrigger } from "./close-trigger"
import { focus } from "./focus"
import { position } from "./position"

export function modal() {
    return [
        position({
            anchor: {
                ref: "viewport",
                link: "center middle"
            },
            placement: {
                ref: "viewport",
                padding: "16px"
            }
        }),
        backdrop({ type: "solid", color: "rgba(0, 0, 0, .3)" }),
        focus({ trap: true }),
        closeTrigger(),
        fallAnimation()
    ]
}
