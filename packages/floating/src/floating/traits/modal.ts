import { position } from "./position"

export function modal() {
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
        })
    ]
}
