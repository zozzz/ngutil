import { Directive, inject, TemplateRef } from "@angular/core"

// TODO: remove old variant: nuInfiniteSlidingItem
@Directive({
    selector: "ng-template[nuInfiniteSlide]",
    exportAs: "nuInfiniteSlide"
})
export class InfiniteSlideDirective {
    readonly tpl = inject(TemplateRef)
}
