import {
    Alignment,
    Dimension,
    Position,
    Rect,
    rectContract,
    rectExpand,
    rectMoveOrigin,
    rectOrigin
} from "@ngutil/style"

import type { FloatingPositionOptionsNormalized } from "./position"

export interface ComputePositionInput {
    floating: Dimension
    anchor: Rect
    placement: Rect
    options: FloatingPositionOptionsNormalized
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
    if (options.anchor.margin) {
        anchor = rectExpand(anchor, options.anchor.margin)
    }
    const anchorPoint = rectOrigin(anchor, options.anchor.align)

    let content = rectMoveOrigin(floating, options.content.align, anchorPoint)
    if (options.content.margin) {
        content = rectContract(content, options.content.margin)
    }

    if (options.placement.padding) {
        placement = rectContract(placement, options.placement.padding)
    }

    const cf: ComputedFloating = {
        current: content,
        max: { width: placement.width - content.x, height: placement.height - content.y },
        min: { width: 0, height: 0 }
    }

    return { floating: cf }
}
