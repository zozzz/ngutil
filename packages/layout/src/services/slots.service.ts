import {
    Directive,
    EmbeddedViewRef,
    inject,
    Injectable,
    Injector,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewContainerRef
} from "@angular/core"

import {
    BehaviorSubject,
    distinctUntilChanged,
    finalize,
    map,
    Observable,
    of,
    scan,
    shareReplay,
    Subject,
    switchMap,
    tap
} from "rxjs"

import { Destructible, IDisposable } from "@ngutil/common"

type SlotOrder = `:${number}`
type SlotId = ` as ${string}`
export type Slot<T extends string> = `${T}${SlotOrder | ""}${SlotId | ""}`
export type SlotTpl = TemplateRef<any>
export type SlotViewRef = EmbeddedViewRef<any>

const SLOT_REGEX = /^([^:\s]+)(?::(\d+))?(?:\s+as\s+(.*?))?$/i

export class SlotDef<T extends string> implements IDisposable {
    readonly slot!: T
    readonly order!: number
    readonly id?: string
    readonly viewRef?: SlotViewRef

    constructor(
        slot: Slot<T>,
        public readonly tpl: SlotTpl
    ) {
        const match = slot.match(SLOT_REGEX)
        if (!match) {
            console.warn(`Invalid slot definition: ${slot}`)
        } else {
            this.slot = match[1] as any
            this.order = match[2] != null ? Number(match[2]) : Infinity
            this.id = match[3] as string
        }
    }

    dispose(): void {
        this.viewRef?.destroy()
        ;(this as { viewRef?: SlotViewRef }).viewRef = undefined
    }
}

export interface SlotEvent<T extends string> {
    type: "add" | "del"
    def: SlotDef<T>
}

/**
 * @Directive({selector: "ng-template[xyzSlot]", inputs: [{name: "slot", alias: "xyzSlot"}]})
 * class XYZSlotDirective extends SlotDirective<XYZComponentSlots> { }
 *
 * @Directive({selector: "ng-template[xyzSlotOutlet]", inputs: [{name: "slot", alias: "xyzSlotOutlet"}]})
 * class XYZSlotOutletDirective extends SlotOutletDirective<XYZComponentSlots> { }
 *
 *
 * @Component({provides: [SlotsService]})
 * class XYZComponent {
 *      slots: inject(SlotsService<XYZComponentSlots>)
 * }
 *
 *
 */
@Injectable()
export class SlotsService<T extends string = any> extends Destructible {
    #events = new Subject<SlotEvent<T>>()

    #entries = this.#events.pipe(
        scan((entries, event) => {
            if (event.type === "add") {
                const index = entries.findIndex(value => value === event.def)
                if (index > -1) {
                    entries[index] = event.def
                } else {
                    entries.push(event.def)
                }
            } else if (event.type === "del") {
                const index = entries.findIndex(value => value === event.def)
                if (index > -1) {
                    entries.splice(index, 1)
                }
            }
            return entries
        }, [] as SlotDef<T>[]),
        tap(entries => {
            entries.sort((a, b) => {
                if (a.slot === b.slot) {
                    return a.order - b.order
                } else {
                    return a.slot.localeCompare(b.slot)
                }
            })
        }),
        shareReplay(1)
    )

    constructor() {
        super()
        // XXX: need to collect entries from the beginning
        this.d.sub(this.#entries).subscribe()
    }

    addTpl(def: SlotDef<T>) {
        this.#events.next({ type: "add", def })
    }

    delTpl(def: SlotDef<T>) {
        this.#events.next({ type: "del", def })
    }

    #watchers: { [key in T]: Observable<Array<SlotDef<T>>> } = {} as any

    watch(slot: T) {
        const existing = this.#watchers[slot]
        if (existing == null) {
            return (this.#watchers[slot] = this.#watch(slot))
        } else {
            return existing
        }
    }

    #watch(slot: T) {
        return this.#entries.pipe(
            map(entries => entries.filter(entry => entry.slot === slot)),
            distinctUntilChanged((prev, curr) => {
                if (prev.length === curr.length) {
                    for (let i = 0; i < prev.length; i++) {
                        if (prev[i] !== curr[i]) {
                            return false
                        }
                    }
                    return true
                } else {
                    return false
                }
            }),
            finalize(() => {
                delete this.#watchers[slot]
            }),
            shareReplay(1)
        )
    }
}

@Directive()
export abstract class SlotDirective<T extends string, C = any> implements OnDestroy {
    protected abstract readonly slotSvc: SlotsService<T>
    protected readonly tpl = inject(TemplateRef<C>)

    set slot(slot: Slot<T>) {
        if (this.#slot !== slot) {
            this.#slot = slot

            if (this.#slotDef) {
                this.slotSvc.delTpl(this.#slotDef)
            }

            this.#slotDef = new SlotDef<T>(slot, this.tpl)
            this.slotSvc.addTpl(this.#slotDef)
        }
    }
    get slot() {
        return this.#slot
    }
    #slot!: Slot<T>
    #slotDef?: SlotDef<T>

    ngOnDestroy(): void {
        if (this.#slotDef) {
            this.slotSvc.delTpl(this.#slotDef)
        }
    }
}

@Directive()
export abstract class SlotOutletDirective<T extends string> extends Destructible implements OnInit {
    protected abstract readonly slotSvc: SlotsService<T>
    protected readonly vcr: ViewContainerRef = inject(ViewContainerRef)
    protected readonly injector: Injector = inject(Injector)

    set slot(slot: T | null) {
        if (this.#slot.value !== slot) {
            this.#slot.next(slot)
        }
    }
    get slot() {
        return this.#slot.value
    }
    #slot = new BehaviorSubject<T | null>(null)

    #watch = this.#slot.pipe(
        switchMap(slot => {
            if (slot) {
                return this.slotSvc.watch(slot)
            } else {
                return of([])
            }
        })
    )

    #views: Array<SlotDef<any>> = []

    constructor() {
        super()
        this.d.any(this.#clearViews.bind(this))
    }

    ngOnInit(): void {
        this.d.sub(this.#watch).subscribe(this.#onEntriesChanged)
    }

    #onEntriesChanged = (entries: Array<SlotDef<T>>) => {
        const { remove, undecided } = this.#determineActions(entries)

        for (const r of remove) {
            r.dispose()
            const idx = this.#views.indexOf(r)
            if (idx >= 0) {
                this.#views.splice(idx, 1)
            }
        }

        this.#views.length = 0
        for (const [pos, entry] of undecided.entries()) {
            if (entry.viewRef && !entry.viewRef.destroyed) {
                const currentPos = this.vcr.indexOf(entry.viewRef)
                if (currentPos !== pos) {
                    this.vcr.insert(entry.viewRef, pos)
                }
            } else {
                ;(entry as { viewRef: SlotViewRef }).viewRef = this.vcr.createEmbeddedView(entry.tpl, null, {
                    index: pos,
                    injector: this.injector
                })
                entry.viewRef!.markForCheck()
            }
            this.#views.push(entry)
        }
    }

    #determineActions(entries: Array<SlotDef<T>>) {
        const byId: { [key: string]: Array<SlotDef<T>> } = {}
        let remove: Array<SlotDef<T>> = []
        const undecided: Array<SlotDef<T>> = []

        for (const entry of entries) {
            if (entry.id != null) {
                if (!byId[entry.id]) {
                    byId[entry.id] = [entry]
                } else {
                    byId[entry.id].push(entry)
                }
            } else {
                undecided.push(entry)
            }
        }

        for (const values of Object.values(byId)) {
            remove = remove.concat(values.slice(0, -1))
            undecided.push(values[values.length - 1])
        }

        for (const current of this.#views) {
            if (!undecided.includes(current)) {
                remove.push(current)
            }
        }

        return { remove, undecided }
    }

    #clearViews() {
        this.vcr.clear()
        this.#views = []
    }
}
