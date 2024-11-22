import {
    AlignHorizontalOpposite,
    Alignment,
    AlignmentInput,
    alignmentNormalize,
    AlignVerticalOpposite
} from "./alignment"
// import type { FloatingPositionOptionsNormalized } from "./position"
import { Dimension, Position, Rect, rectContract, rectExpand, rectMoveOrigin, rectOrigin } from "./rect"
import { Sides, SidesInput, sidesNormalize } from "./sides"

export interface FloatingPositionInput {
    dims: FloatingPositionDims
    options: FloatingPositionOptions
}

export interface FloatingPositionDims {
    content: Dimension
    anchor: Rect
    placement: Rect
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
    }
    anchor: {
        readonly rect: Readonly<Rect>
        link: Alignment
    }
    placement: {
        readonly rect: Readonly<Rect>
        readonly padding: Readonly<Sides>
        readonly rectWithPadding: Readonly<Rect>
        area: Readonly<Rect>
    }
    connection: Position
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
        link: alignmentNormalize(options.anchor.link)
    }

    const content: FloatingPosition["content"] = {
        rect: { x: 0, y: 0, ...dims.content },
        link: alignmentNormalize(options.content.link)
    }

    const position = { placement, anchor, content, connection: ZERO_CONNECTION }
    const area = placementArea(position, anchor.link, content.link)
    setPlacement(position, area)

    if (options.horizontalAlt) {
        applyAlts(position, FloatingPositionAltAxis.Horizontal, options.horizontalAlt)
    }

    if (options.verticalAlt) {
        applyAlts(position, FloatingPositionAltAxis.Vertical, options.verticalAlt)
    }

    return position
}

function placementArea(pos: FloatingPosition, anchorLink: Alignment, contentLink: Alignment): PlacementArea {
    const connection = rectOrigin(pos.anchor.rect, anchorLink)
    let { x, y } = connection
    const placement = pos.placement.rect
    const placementPad = pos.placement.padding
    let width = 0
    let height = 0

    switch (contentLink.horizontal) {
        case "left":
        case "start":
            width = placement.width - x
            break
        case "center":
            if (anchorLink.horizontal === "center") {
                width = placement.width
                x = placement.x
            } else {
                const leftSize = x - placementPad.left.value
                const rightSize = placement.width - x - placementPad.right.value
                const mw = Math.max(0, Math.min(leftSize, rightSize))
                width = mw * 2
                x -= mw
            }
            break
        case "end":
        case "right":
            width = x - placement.x
            x = placement.x
            break
    }

    switch (contentLink.vertical) {
        case "top":
            height = placement.height - y
            break
        case "middle":
            if (anchorLink.vertical === "middle") {
                height = placement.height
                y = placement.y
            } else {
                const topSize = y - placementPad.top.value
                const bottomSize = placement.height - y - placementPad.bottom.value
                const mh = Math.max(0, Math.min(topSize, bottomSize))
                height = mh * 2
                y -= mh
            }

            break
        case "bottom":
            height = y - placement.y
            y = placement.y
            break
    }

    const constraint = pos.placement.rectWithPadding
    const newX = Math.max(x, constraint.x)
    const newY = Math.max(y, constraint.y)
    const diffX = newX - x
    const diffY = newY - y

    const area = {
        x: newX,
        y: newY,
        width: Math.min(newX + width - diffX, constraint.x + constraint.width) - newX,
        height: Math.min(newY + height - diffY, constraint.y + constraint.height) - newY
    }

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

function none(pos: FloatingPosition, axis: FloatingPositionAltAxis): void {}

function flip(pos: FloatingPosition, axis: FloatingPositionAltAxis): void {
    const wh: "width" | "height" = axis === FloatingPositionAltAxis.Horizontal ? "width" : "height"
    if (pos.placement.area[wh] >= pos.content.rect[wh]) {
        return
    }
    return greatest(pos, axis)
}

function shift(pos: FloatingPosition, axis: FloatingPositionAltAxis): void {}

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

export function floatingPositionToStyle(pos: Readonly<FloatingPosition>): Partial<CSSStyleDeclaration> {
    const contentRect = pos.content.rect
    const placementRect = pos.placement.rect
    const style: Partial<CSSStyleDeclaration> = {}

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

    return style
}
