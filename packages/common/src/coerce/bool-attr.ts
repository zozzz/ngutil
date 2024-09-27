import { isTruthy } from "../util"

export type BooleanInput = string | boolean | null | undefined

export function coerceBoolAttr(value: BooleanInput): boolean {
    return isTruthy(value) || (typeof value === "string" && value !== "false")
}
