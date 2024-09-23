import {
    Alignment,
    alignmentNormalize,
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

export interface ComputedRect extends Rect {
    top: number
    left: number
    right: number
    bottom: number
}

export interface ComputedAlignment extends ComputedRect {
    align: Alignment
    connect: Position
}

export interface ComputedContent extends ComputedAlignment {
    min: Dimension
    max: Dimension
}

// export interface ComputedAlignment {
//     align: Alignment
//     postion: Position
// }

// export interface ComputedOrigin {
//     content: ComputedAlignment
//     anchor: ComputedAlignment
// }

export interface ComputedPositon {
    content: ComputedContent
    anchor: ComputedAlignment
    placement: ComputedRect
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

    let contentRect = rectMoveOrigin(floating, options.content.align, anchorPoint)
    if (options.content.margin) {
        contentRect = rectContract(contentRect, options.content.margin)
    }

    if (options.placement.padding) {
        placement = rectContract(placement, options.placement.padding)
    }

    return {
        content: {
            ...addTLRB(contentRect, placement),
            align: alignmentNormalize(options.content.align),
            connect: anchorPoint,
            max: { width: placement.width - contentRect.x, height: placement.height - contentRect.y },
            min: { width: 0, height: 0 }
        },
        anchor: {
            ...addTLRB(anchor, placement),
            align: alignmentNormalize(options.anchor.align),
            connect: anchorPoint
        },
        placement: addTLRB(placement, placement)
    }
}

function addTLRB(rect: Rect, container: Rect): ComputedRect {
    return {
        ...rect,
        top: rect.y,
        left: rect.x,
        right: container.width - (rect.x + rect.width),
        bottom: container.height - (rect.y + rect.height)
    }
}
