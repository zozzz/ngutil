export type BooleanInput = string | boolean | null | undefined

export function coerceBoolAttr(value: BooleanInput): boolean {
    return value != null && `${value}` !== "false"
}
