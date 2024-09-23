import { Position } from "@ngutil/style"

export type Polygon = Position[]

export function polygonRect(topLeft: Position, bottomRight: Position): Polygon {
    const result: Polygon = []

    result.push(topLeft)
    result.push({ x: bottomRight.x, y: topLeft.y })
    result.push(bottomRight)
    result.push({ x: topLeft.x, y: bottomRight.y })
    result.push(topLeft)

    return result
}

const OctoAngle = (Math.PI * 2) / 8

export function polygonRoundedRect(topLeft: Position, bottomRight: Position, radius: number): Polygon {
    if (radius <= 0) {
        return polygonRect(topLeft, bottomRight)
    }

    const result: Polygon = []
    const maxR = Math.min(bottomRight.x - topLeft.x, bottomRight.y - topLeft.y) / 2
    const r = Math.min(radius, maxR)

    // top left half
    result.push(...polygonArc({ x: topLeft.x + r, y: topLeft.y + r }, r, OctoAngle * 3, OctoAngle * 2))
    result.push({ x: topLeft.x + r, y: topLeft.y })
    result.push({ x: bottomRight.x - r, y: topLeft.y })

    // top right
    result.push(...polygonArc({ x: bottomRight.x - r, y: topLeft.y + r }, r, OctoAngle * 2, OctoAngle * 0))
    result.push({ x: bottomRight.x, y: topLeft.y + r })

    // bottom right
    result.push(...polygonArc({ x: bottomRight.x - r, y: bottomRight.y - r }, r, OctoAngle * 0, -OctoAngle * 2))
    result.push({ x: bottomRight.x - r, y: bottomRight.y })

    // bottom left
    result.push(...polygonArc({ x: topLeft.x + r, y: bottomRight.y - r }, r, OctoAngle * 6, OctoAngle * 4))
    result.push({ x: topLeft.x, y: bottomRight.y - r })

    // top left half
    result.push({ x: topLeft.x, y: topLeft.y + r })
    result.push(...polygonArc({ x: topLeft.x + r, y: topLeft.y + r }, r, OctoAngle * 4, OctoAngle * 3))

    result.push(result[0])

    return result
}

export function polygonArc(center: Position, radius: number, startAngle: number, endAngle: number): Polygon {
    const result: Polygon = []

    if (radius === 0) {
        return result
    }

    const reversed = startAngle > endAngle
    let angle = Math.min(startAngle, endAngle)
    const end = Math.max(startAngle, endAngle)

    for (; angle < end; angle += 0.1) {
        const x = center.x + radius * Math.cos(angle)
        const y = center.y - radius * Math.sin(angle)
        result.push({ x, y })
    }

    return reversed ? result.reverse() : result
}

export function polygonToCss(polygon: Polygon): string {
    return `polygon(${polygon.map(p => `${p.x}px ${p.y}px`).join(",")})`
}

export function maxPossibleRadius(x: number, y: number, w: number, h: number) {
    const distX = Math.max(x, Math.abs(w - x))
    const distY = Math.max(y, Math.abs(h - y))
    return Math.sqrt(distX * distX + distY * distY)
}
