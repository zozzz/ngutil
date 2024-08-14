import { ElementRef } from "@angular/core"

export type ElementInput<T extends Element = HTMLElement> = T | ElementRef<T>

export function coerceElement<T>(value: T | ElementRef<T>): T {
    if (value instanceof ElementRef) {
        return value.nativeElement
    }
    return value
}

export function isElementInput(value: any): value is ElementInput {
    return value instanceof Element || value instanceof ElementRef
}
