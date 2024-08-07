const HORIZONTAL = ["start", "center", "end", "max-width"] as const
export type AlignHorizontal = (typeof HORIZONTAL)[number]

const VERTICAL = ["top", "middle", "bottom", "max-height"] as const
export type AlignVertical = (typeof VERTICAL)[number]

export type AlignmentInput =
    | `${AlignHorizontal} ${AlignVertical}`
    | `${AlignVertical} ${AlignHorizontal}`
    | AlignVertical
    | AlignHorizontal

export interface Alignment {
    horizontal: AlignHorizontal
    vertical: AlignVertical
}

const DEFAULT: Alignment = { horizontal: "center", vertical: "middle" }

export function alignmentNormalize(value?: AlignmentInput): Alignment {
    if (value == null) {
        return DEFAULT
    }

    if (typeof value !== "string") {
        throw new Error(`Invalid alignment: ${value}`)
    }

    const entries = Array.from(new Set(value.split(/\s+/g))) as [string, string]
    if (entries.length > 2) {
        throw new Error(`Cannot parse: ${value}`)
    }

    const horizontal = HORIZONTAL.find(v => entries[0] === v || entries[1] === v) || "center"
    const vertical = VERTICAL.find(v => entries[0] === v || entries[1] === v) || "middle"

    return { horizontal, vertical }
}
