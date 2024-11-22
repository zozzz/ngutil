import { isPlainObject } from "@ngutil/common"

const HORIZONTAL = ["start", "left", "center", "end", "right"] as const
export type AlignHorizontal = (typeof HORIZONTAL)[number]

export const AlignHorizontalOpposite: Record<AlignHorizontal, AlignHorizontal> = {
    start: "end",
    left: "right",
    center: "center",
    end: "start",
    right: "left"
}

const VERTICAL = ["top", "middle", "bottom"] as const
export type AlignVertical = (typeof VERTICAL)[number]

export const AlignVerticalOpposite: Record<AlignVertical, AlignVertical> = {
    top: "bottom",
    middle: "middle",
    bottom: "top"
}

export type AlignmentInput =
    | `${AlignHorizontal} ${AlignVertical}`
    | `${AlignVertical} ${AlignHorizontal}`
    | AlignVertical
    | AlignHorizontal
    | Alignment

export interface Alignment {
    horizontal: AlignHorizontal
    vertical: AlignVertical
}

const DEFAULT: Alignment = { horizontal: "center", vertical: "middle" }

export function alignmentNormalize(value?: AlignmentInput): Alignment {
    if (value == null) {
        return DEFAULT
    }

    if (isPlainObject(value)) {
        if ("horizontal" in value && "vertical" in value) {
            return value
        } else {
            throw new Error(`Invalid alignment: ${value}`)
        }
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

const HorizontalOrigin: Record<AlignHorizontal, "left" | "center" | "right"> = {
    start: "left",
    left: "left",
    center: "center",
    right: "right",
    end: "right"
}

const VerticalOrigin: Record<AlignVertical, "top" | "center" | "bottom"> = {
    top: "top",
    middle: "center",
    bottom: "bottom"
}

export function alignmentToTransformOrigin(alignment: Alignment): string {
    return `${HorizontalOrigin[alignment.horizontal] || "center"} ${VerticalOrigin[alignment.vertical] || "center"}`
}
