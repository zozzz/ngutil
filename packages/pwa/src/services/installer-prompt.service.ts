import { inject, Injectable, Provider } from "@angular/core"

import { BehaviorSubject, combineLatest, exhaustMap, from, map, Observable, of, shareReplay, take } from "rxjs"

import { MediaWatcher } from "@ngutil/style"

export type BeforeInstallPromptEvent_Experimental = Event & {
    prompt: () => void
    userChoice: Promise<BeforeInstallPromptEvent_UserChoice>
}

export interface BeforeInstallPromptEvent_UserChoice {
    outcome: "accepted" | "dismissed"
    platform: any
}

export class DeferredPromptRef extends BehaviorSubject<BeforeInstallPromptEvent_Experimental | null> {}

export type InstallerPromptUserChoice = BeforeInstallPromptEvent_UserChoice["outcome"] | "expired"

// "(display-mode: standalone), (display-mode: minimal-ui), (display-mode: window-controls-overlay)"
const IS_STANDALONE = "(display-mode: standalone)"

@Injectable({ providedIn: "root" })
export class InstallerPromptService {
    readonly #mw = inject(MediaWatcher)

    readonly #prompt = inject(DeferredPromptRef)
    readonly hasPrompt$ = this.#prompt.pipe(map(value => !!value))

    readonly #isStandalone = this.#mw.watch(IS_STANDALONE)
    readonly isStandalone$ = this.#isStandalone.pipe(
        map(isStandalone => isStandalone || ("standalone" in window.navigator && window.navigator["standalone"]))
    )

    // TODO: https://web.dev/articles/get-installed-related-apps#check-pwa-in-scope
    /**
     * @deprecated NOT IMPLEMENTED
     */
    readonly isInstalled$ = of(false)

    readonly isSupported$ = combineLatest({
        isStandalone: this.isStandalone$,
        hasPrompt: this.hasPrompt$
    }).pipe(
        map(({ isStandalone, hasPrompt }) => !isStandalone && hasPrompt),
        shareReplay(1)
    )

    install(): Observable<InstallerPromptUserChoice> {
        return this.#prompt.pipe(
            take(1),
            exhaustMap(prompt => {
                if (prompt == null) {
                    return of("expired" as InstallerPromptUserChoice)
                } else {
                    prompt.prompt()
                    // You can only call prompt() on the deferred event once.
                    this.#prompt.next(null)
                    return from(prompt.userChoice).pipe(map(v => v.outcome))
                }
            })
        )
    }
}

export function provideInstallerPrompt(): Provider[] {
    const deferredPromptRef = new DeferredPromptRef(null)
    window.addEventListener("beforeinstallprompt", event => {
        deferredPromptRef.next(event as any)
        event.preventDefault()
    })

    return [{ provide: DeferredPromptRef, useValue: deferredPromptRef }, InstallerPromptService]
}
