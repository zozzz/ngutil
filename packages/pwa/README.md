# PWA

This codebase includes utilities and tools specifically designed to assist in the development of Progressive Web Applications (PWAs).

## Installer prompt

```typescript
// config.ts

import { provideInstallerPrompt } from "@ngutil/pwa"

export const appConfig: ApplicationConfig = {
    providers: [
        // ...
        provideInstallerPrompt()
    ]
}
```
