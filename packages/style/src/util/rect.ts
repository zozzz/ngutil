import { AlignHorizontal, AlignmentInput, alignmentNormalize, AlignVertical } from "./alignment"
import { SidesInput, sidesNormalize } from "./sides"

export interface Dimension {
    width: number
    height: number
}

export interface Position {
    x: number
    y: number
}

export interface Rect extends Dimension, Position {}

export function rectOrigin(rect: Rect, origin: AlignmentInput): Position {
    const originNorm = alignmentNormalize(origin)
    return { x: rectHorizontalOrigin(rect, originNorm.horizontal), y: rectVerticalOrigin(rect, originNorm.vertical) }
}

function rectHorizontalOrigin(rect: Rect, horizontal: AlignHorizontal): number {
    switch (horizontal) {
        case "start":
        case "left":
            return rect.x

        case "center":
            return rect.x + rect.width / 2

        case "end":
        case "right":
            return rect.x + rect.width
    }
}

function rectVerticalOrigin(rect: Rect, vertical: AlignVertical): number {
    switch (vertical) {
        case "top":
            return rect.y

        case "middle":
            return rect.y + rect.height / 2

        case "bottom":
            return rect.y + rect.height
    }
}

export function rectMoveOrigin(rect: Rect | Dimension, origin: AlignmentInput, position: Position): Rect {
    const originNorm = alignmentNormalize(origin)
    return {
        ...rect,
        x: rectMoveHorizontal(rect, originNorm.horizontal, position),
        y: rectMoveVertical(rect, originNorm.vertical, position)
    }
}

function rectMoveHorizontal(rect: Dimension, horizontal: AlignHorizontal, position: Position): number {
    switch (horizontal) {
        case "start":
        case "left":
            return position.x

        case "center":
            return position.x - rect.width / 2

        case "end":
        case "right":
            return position.x - rect.width
    }
}

function rectMoveVertical(rect: Dimension, vertical: AlignVertical, position: Position): number {
    switch (vertical) {
        case "top":
            return position.y

        case "middle":
            return position.y - rect.height / 2

        case "bottom":
            return position.y - rect.height
    }
}

export function rectConstraint(rect: Rect, constraint: Rect): Rect {
    const x = Math.max(rect.x, constraint.x)
    const y = Math.max(rect.y, constraint.y)
    return {
        x: x,
        y: y,
        width: Math.min(x + rect.width, constraint.x + constraint.width) - x,
        height: Math.min(y + rect.height, constraint.y + constraint.height) - y
    }
}
export function rectExpand(rect: Rect, margin: SidesInput): Rect {
    const marginNorm = sidesNormalize(margin)
    return {
        x: rect.x - marginNorm.left.value,
        y: rect.y - marginNorm.top.value,
        width: rect.width + marginNorm.left.value + marginNorm.right.value,
        height: rect.height + marginNorm.top.value + marginNorm.bottom.value
    }
}

export function rectContract(rect: Rect, padding: SidesInput): Rect {
    const normMargin = sidesNormalize(padding)
    return {
        x: rect.x + normMargin.left.value,
        y: rect.y + normMargin.top.value,
        width: rect.width - normMargin.left.value - normMargin.right.value,
        height: rect.height - normMargin.top.value - normMargin.bottom.value
    }
}

export function rectContainsPoint(rect: Rect, point: Position): boolean {
    return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height
}

export function rectIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

