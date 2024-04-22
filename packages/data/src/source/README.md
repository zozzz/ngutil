# Data Source

## Remote Data Provider

```ts
interface User {
    id: number
    name: string
    email: string
}

@Injectable()
class UserApi {
    readonly http = inject(HttpClient)
    get(id): Observable<User>
    search(filter: object, start: number, end: number): Observable<User>
}

@Injectable()
class UserProvider {
    readonly isAsync = true
    readonly meta = new ModelMeta({keys: ["id"]})

    #api = inject(UserApi)

    queryList(request: DataSourceRequest<T>): Observable<readonly T[]> {
        return this.#api.search(request.filter, request.slice.start, request.slice.end)
    }

    queryItem(ref: ModelRefNorm, request: DataSourceRequest<T>): Observable<T | undefined> {
        return this.#api.get(ref.pk[0])
    }

    queryPosition(ref: ModelRefNorm, request: DataSourceRequest<T> ): Observable<number | undefined> {
        throw new Error("Unsupported")
    }
}
```

## Array Data Provider

```ts

interface EnumValue {
    value: number
    label: string
}

const ENUM_VALUES = new ArrayProvider<EnumValue>({keys: ["value"]}, [
    {value: 1, label: "First item"},
    {value: 2, label: "First item"},
])
```

## Data Source usage

### Predefined remote source

```ts
@Component({
    selector: "user-list",
    providers: [UserProvider],
    template: `
        <!-- Normal usage -->
        @for (let item of source.items$ | async; track source.trackBy($index, item)) {

        }

        <!-- cdkVirtualFor -->
        <cdk-virtual-scroll-viewport itemSize="50" style="height: 1000px">
            <div *cdkVirtualFor="let item of source">{{ item.name }}</div>
        </cdk-virtual-scroll-viewport>
    `
})
class UserList {
    source = inject(UserProvider)
        .toDataSource(new MemoryStorage())
        // not required for cdkVirtualFor, but in simple 'for' is MANDATORY
        .setSlice({start: 0, end: 200})

    source = new DataSource(inject(UserProvider))
        .setSlice({start: 0, end: 200})

    constructor() {
        this.source.filter.forced.set({is_active: true})
    }

    filterByName(name: string | undefined) {
        this.source.filter.normal.update({name})
    }
}
```

### Ad-Hoc array

```ts
@Component({
    selector: "anything",
    template: `...`
})
class AnyComponent {
    // can use plain array, but highly not recommended
    sourceBad = []

    sourceGood = new ArrayProvider({keys: ["value"]}, [])
}
```

## Simple List

```ts
class MyDataSource extends DataSource {
    ...
}

@Component({
    template: `
        <nu-list [nuDataSource]="source" [filter]="{active:true}"></nu-list>
    `
})
class SomeList {
    readonly source = new MyDataSource()

    reload() {
        this.source.reload()
    }

    filterByTitle() {
        this.source.filter.normal.set({name: "Something"})
    }
}
```


## Variable datasource

```ts

@Component({
    template: `
        @if (source.itemsView$ | async; itemsView) {
            @for (item of itemsView | async; track source.trackBy(itemsView.sliceBegin + $index, item)) {

            }
        }
    `
})
class NuListComponent {
    readonly source = inject(DataSource)
}
```
