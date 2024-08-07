import { Alignment, Dimension, Position, Rect } from "@ngutil/style"

import type { FloatingPositionOptions } from "./position"

export interface ComputePositionInput {
    floating: Dimension
    anchor: Rect
    placement: Rect
    options: FloatingPositionOptions
}

export interface ComputedFloating {
    current: Rect
    min: Dimension
    max: Dimension
}

export interface ComputedAlignment {
    align: Alignment
    postion: Position
}

export interface ComputedAnchor {
    floating: ComputedAlignment
    anchor: ComputedAlignment
}

export interface ComputedPositon {
    floating: ComputedFloating
    anchor?: ComputedAnchor
}

export function computePosition({
    floating,
    anchor,
    placement,
    options
}: ComputePositionInput): ComputedPositon | undefined {
    // TODO: jelenleg csak center van

    const maxWidth = placement.width
    const maxHeight = placement.height
    const cf: ComputedFloating = {
        current: {
            x: (maxWidth - floating.width) / 2,
            y: (maxHeight - floating.height) / 2,
            width: Math.min(maxHeight, floating.width),
            height: Math.min(maxHeight, floating.height)
        },
        max: { width: maxWidth, height: maxHeight },
        min: { width: 0, height: 0 }
    }

    return { floating: cf }
}
