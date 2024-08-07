import { ElementRef } from "@angular/core"

export type ElementInput<T extends Element = HTMLElement> = T | ElementRef<T>

export function coerceElement<T>(value: T | ElementRef<T>): T {
    if (value instanceof ElementRef) {
        return value.nativeElement
    }
    return value
}
