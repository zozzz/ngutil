import { clamp } from "es-toolkit"

import {
    AlignHorizontalOpposite,
    Alignment,
    AlignmentInput,
    alignmentNormalize,
    AlignVerticalOpposite
} from "./alignment"
// import type { FloatingPositionOptionsNormalized } from "./position"
import { Dimension, Position, Rect, rectConstraint, rectContract, rectExpand, rectIntersect, rectMoveOrigin, rectOrigin } from "./rect"
import { Sides, SidesInput, sidesNormalize } from "./sides"

export interface FloatingPositionInput {
    dims: FloatingPositionDims
    options: FloatingPositionOptions
}

export interface FloatingPositionDims {
    content: Dimension
    anchor: Rect
    placement: Rect
    sizeConstraints?: FloatingSizeConstraintsInput
}

export interface FloatingPositionOptions {
    content: FloatingPositionContentOptions
    anchor: FloatingPositionAnchorOptions
    placement: FloatingPositionPlacementOptions
    horizontalAlt?: FloatingPositionAltInput
    verticalAlt?: FloatingPositionAltInput
}

export interface FloatingPositionContentOptions {
    link: AlignmentInput
}

export interface FloatingSizeConstraintsInput {
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
}

export interface FloatingPositionAnchorOptions {
    link: AlignmentInput
    margin?: SidesInput
}

export interface FloatingPositionPlacementOptions {
    padding?: SidesInput
}

export interface FloatingPosition {
    content: {
        rect: Position & Readonly<Dimension>
        link: Alignment
        readonly constrained: Readonly<Dimension>
    }
    anchor: {
        readonly rect: Readonly<Rect>
        link: Alignment
        visible: boolean
    }
    placement: {
        readonly rect: Readonly<Rect>
        readonly padding: Readonly<Sides>
        readonly rectWithPadding: Readonly<Rect>
        area: Readonly<Rect>
    }
    connection: Position
    direction: FloatingPositionDirection
    sizeConstraints?: FloatingSizeConstraintsInput
}

interface PlacementArea {
    anchorLink: Alignment
    contentLink: Alignment
    area: FloatingPosition["placement"]["area"]
    connection: Position
}

type FloatingPositionAltConst =
    | "none"
    | "flip"
    | "shift"
    | "flip-shift"
    | "greatest"
    | "greatest-shift"
    | "smallest"
    | "smallest-shift"
export type FloatingPositionAltInput = FloatingPositionAltConst | FloatingPositionAltFunc
export type FloatingPositionAltFunc = (pos: FloatingPosition, axis: FloatingPositionAltAxis) => void
export type FloatingPositionAltNorm = Array<FloatingPositionAltFunc>

export const enum FloatingPositionAltAxis {
    Horizontal = "H",
    Vertical = "V"
}

const ZERO_PADDING = sidesNormalize(0)
const ZERO_CONNECTION = { x: 0, y: 0 }

export function floatingPosition({ dims, options }: FloatingPositionInput): FloatingPosition {
    const padding = options.placement.padding ? sidesNormalize(options.placement.padding) : ZERO_PADDING
    const placement: FloatingPosition["placement"] = {
        rect: dims.placement,
        padding: padding,
        rectWithPadding: rectContract(dims.placement, padding),
        area: { ...dims.placement }
    }

    const anchor: FloatingPosition["anchor"] = {
        rect: options.anchor.margin ? rectExpand(dims.anchor, options.anchor.margin) : dims.anchor,
        link: alignmentNormalize(options.anchor.link),
        visible: false
    }

    const minWidth = dims.sizeConstraints?.minWidth || 0
    const minHeight = dims.sizeConstraints?.minHeight || 0
    const maxWidth = dims.sizeConstraints?.maxWidth || Infinity
    const maxHeight = dims.sizeConstraints?.maxHeight || Infinity
    const content: FloatingPosition["content"] = {
        rect: { ...dims.content, x: 0, y: 0 },
        link: alignmentNormalize(options.content.link),
        constrained: {
            width: clamp(dims.content.width, minWidth, maxWidth),
            height: clamp(dims.content.height, minHeight, maxHeight)
        }
    }

    const position = {
        placement,
        anchor,
        content,
        connection: ZERO_CONNECTION,
        sizeConstraints: dims.sizeConstraints,
        direction: FloatingPositionDirection.Down
    }
    const area = placementArea(position, anchor.link, content.link)
    setPlacement(position, area)

    if (options.horizontalAlt) {
        applyAlts(position, FloatingPositionAltAxis.Horizontal, options.horizontalAlt)
    }

    if (options.verticalAlt) {
        applyAlts(position, FloatingPositionAltAxis.Vertical, options.verticalAlt)
    }

    position.direction = floatingPositionDirection(position)
    position.anchor.visible = rectIntersect(position.placement.rectWithPadding, position.anchor.rect)
    return position
}

function placementArea(pos: FloatingPosition, anchorLink: Alignment, contentLink: Alignment): PlacementArea {
    const connection = rectOrigin(pos.anchor.rect, anchorLink)
    let { x, y } = connection
    const placement = pos.placement.rect
    const constraint = pos.placement.rectWithPadding
    const placementPad = pos.placement.padding
    let { width, height } = placement

    switch (contentLink.horizontal) {
        case "left":
        case "start":
            break
        case "center":
            if (anchorLink.horizontal === "center") {
                x = placement.x
            } else {
                x -= pos.content.constrained.width / 2
            }
            break
        case "end":
        case "right":
            width = x - placementPad.left.value
            if (anchorLink.horizontal === "center") {
                x = placement.x
            } else {
                x -= pos.content.constrained.width
            }
            break
    }

    switch (contentLink.vertical) {
        case "top":
            break
        case "middle":
            if (anchorLink.vertical === "middle") {
                y = placement.y
            } else {
                y -= pos.content.constrained.height / 2
            }
            break
        case "bottom":
            height = y - placementPad.top.value
            y = placement.y
            break
    }

    const area = rectConstraint({ x, y, width, height }, constraint)
    return { area, contentLink, anchorLink, connection }
}

function setPlacement(position: FloatingPosition, { area, anchorLink, contentLink, connection }: PlacementArea): void {
    position.placement.area = area
    position.anchor.link = anchorLink
    position.content.link = contentLink

    const plannedContentRect = rectMoveOrigin(position.content.rect, contentLink, connection)
    position.connection = adjustConnection(area, plannedContentRect, connection)
    position.content.rect = rectMoveOrigin(position.content.rect, contentLink, connection)
}

function adjustConnection(
    placement: FloatingPosition["placement"]["area"],
    content: FloatingPosition["content"]["rect"],
    connection: FloatingPosition["connection"]
) {
    const x = Math.max(placement.x, content.x)
    const y = Math.max(placement.y, content.y)
    const leftDiff = x - content.x
    const topDiff = y - content.y
    const widthDiff = placement.x + placement.width - (x + content.width)
    const heightDiff = placement.y + placement.height - (y + content.height)

    const result = { ...connection }
    connection.x += leftDiff
    connection.y += topDiff

    if (widthDiff < 0) {
        connection.x += widthDiff
    }

    if (heightDiff < 0) {
        connection.y += heightDiff
    }
    return result
}

function applyAlts(pos: FloatingPosition, axis: FloatingPositionAltAxis, alts: FloatingPositionAltInput) {
    const norm = positionAltNormalize(alts)
    for (const alt of norm) {
        alt(pos, axis)
    }
}

export function positionAltNormalize(
    input: FloatingPositionAltInput | FloatingPositionAltNorm
): FloatingPositionAltNorm {
    if (Array.isArray(input)) {
        return input
    } else if (typeof input === "function") {
        return [input]
    } else if (typeof input === "string") {
        return altStringToFns(input)
    } else {
        throw new Error(`Invalid alt position: ${input}`)
    }
}

function altStringToFns(input: FloatingPositionAltConst): FloatingPositionAltNorm {
    switch (input) {
        case "none":
            return [none]
        case "flip":
            return [flip]
        case "shift":
            return [shift]
        case "flip-shift":
            return [flip, shift]
        case "greatest":
            return [greatest]
        case "greatest-shift":
            return [greatest, shift]
        case "smallest":
            return [smallest]
        case "smallest-shift":
            return [smallest, shift]
    }
}

function none(pos: FloatingPosition, axis: FloatingPositionAltAxis): void { }

function flip(pos: FloatingPosition, axis: FloatingPositionAltAxis): void {
    const wh: "width" | "height" = axis === FloatingPositionAltAxis.Horizontal ? "width" : "height"
    if (pos.placement.area[wh] >= pos.content.constrained[wh]) {
        return
    }
    return greatest(pos, axis)
}

function shift(pos: FloatingPosition, axis: FloatingPositionAltAxis): void { }

function greatest(pos: FloatingPosition, axis: FloatingPositionAltAxis): void {
    _bySize(pos, axis, (a, b) => a >= b)
}

function smallest(pos: FloatingPosition, axis: FloatingPositionAltAxis): void {
    _bySize(pos, axis, (a, b) => a <= b)
}

function _bySize(pos: FloatingPosition, axis: FloatingPositionAltAxis, cmp: (a: number, b: number) => boolean): void {
    const wh: "width" | "height" = axis === FloatingPositionAltAxis.Horizontal ? "width" : "height"

    const current = pos.placement.area[wh]
    const anchorLink = oppositeLink(axis, pos.anchor.link)
    const contentLink = oppositeLink(axis, pos.content.link)
    const oppositePlacement = placementArea(pos, anchorLink, contentLink)

    if (cmp(current, oppositePlacement.area[wh])) {
        return
    }

    setPlacement(pos, oppositePlacement)
}

function oppositeLink(axis: FloatingPositionAltAxis, link: Alignment): Alignment {
    if (axis === FloatingPositionAltAxis.Horizontal) {
        return { horizontal: AlignHorizontalOpposite[link.horizontal], vertical: link.vertical }
    } else {
        return { horizontal: link.horizontal, vertical: AlignVerticalOpposite[link.vertical] }
    }
}

export function floatingPositionToStyle(pos: Readonly<FloatingPosition>, display: CSSStyleDeclaration["display"] = "inline-flex"): Partial<CSSStyleDeclaration> {
    if (pos.anchor.visible === false) {
        return {"display": "none", "pointerEvents": "none"}
    }

    const contentRect = pos.content.rect
    const placementRect = pos.placement.rect
    // const { width: maxWidth, height: maxHeight } = pos.placement.area
    const style: Partial<CSSStyleDeclaration> = { display: display, pointerEvents: "" }

    // TODO: translate3d
    if (pos.content.link.horizontal === "right") {
        style["right"] = `${placementRect.width - (contentRect.x + contentRect.width)}px`
        style["left"] = "auto"
    } else {
        style["left"] = `${contentRect.x}px`
        style["right"] = "auto"
    }

    if (pos.content.link.vertical === "bottom") {
        style["bottom"] = `${placementRect.height - (contentRect.y + contentRect.height)}px`
        style["top"] = "auto"
    } else {
        style["top"] = `${contentRect.y}px`
        style["bottom"] = "auto"
    }

    // style["maxWidth"] = `${maxWidth}px`
    // style["maxHeight"] = `${maxHeight}px`

    return style
}

export const enum FloatingPositionDirection {
    Up = "up",
    Down = "down",
    Left = "left",
    Right = "right",
    Center = "center"
}

export function floatingPositionDirection(pos: Readonly<FloatingPosition>): FloatingPositionDirection {
    const { x: ax, y: ay, width: aw, height: ah } = pos.anchor.rect
    const { x: bx, y: by, width: bw, height: bh } = pos.content.rect
    const contentLink = pos.content.link
    const anchorLink = pos.anchor.link

    if (anchorLink.horizontal === "center" && anchorLink.vertical === "middle") {
        if (contentLink.horizontal === "center" && contentLink.vertical === "middle") {
            return FloatingPositionDirection.Center
        }

        const cx = pos.connection.x
        if (cx <= bx) {
            return FloatingPositionDirection.Right
        } else if (cx >= bx + bw) {
            return FloatingPositionDirection.Left
        }
    }

    const widthOverlapPx = Math.min(ax + aw, bx + bw) - Math.max(ax, bx)
    const widthOverlapPercent = widthOverlapPx / Math.max(aw, bw)
    const heightOverlapPx = Math.min(ay + ah, by + bh) - Math.max(ay, by)
    const heightOverlapPercent = heightOverlapPx / Math.max(ah, bh)

    if (widthOverlapPercent >= heightOverlapPercent) {
        if (contentLink.vertical === "bottom") {
            return FloatingPositionDirection.Up
        }

        return FloatingPositionDirection.Down
    } else {
        if (contentLink.horizontal === "right") {
            return FloatingPositionDirection.Left
        }

        return FloatingPositionDirection.Right
    }
}
