export interface Dimension {
    width: number
    height: number
}

export interface Position {
    x: number
    y: number
}

export interface Rect extends Dimension, Position {}
