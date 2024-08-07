# floating

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test floating` to execute the unit tests.


## Plan

```typescript
floating.showComponent(Component, new Modal({
    backdrop: {click: "close | hide", cut: element},
    escape: "close | hide",
}));
floating.showComponent(Component, new Toast({}));
floating.showComponent(Component, new Tip({anchor: {ref: element}})).subscribe(event => {
    if (event === "done") {
        // ...
    }
})
```
