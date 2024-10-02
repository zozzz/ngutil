# floating

## Usage

### Configure

```typescript
import { provideAnimations } from "@angular/platform-browser/animations"
import { provideFloating } from "@ngutil/floating"

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideFloating()
    ]
}
```

### Create floating from component

```typescript
@Component({
    selector: 'app-modal',
    template: `...`
})
export class ModalComponent {}

@Component({
    selector: `app-user-list`,
})
export class UserListComponent {
    readonly #floating = inject(FloatingService)

    confirm() {
        this.#floating.from(ModalComponent).trait(modal()).subscribe()
    }
}
```
