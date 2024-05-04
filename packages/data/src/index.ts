import { NgModule } from "@angular/core"

import {
    DataSourceProxy,
    DataSourceProxyBusy,
    DataSourceProxyFilter,
    DataSourceProxyGrouper,
    DataSourceProxySlimer,
    DataSourceProxySorter
} from "./source/proxy.directive"

export * from "./model"
export * from "./provider"
export * from "./query"
export * from "./source"
export * from "./store"

@NgModule({
    imports: [
        DataSourceProxy,
        DataSourceProxyBusy,
        DataSourceProxyFilter,
        DataSourceProxyGrouper,
        DataSourceProxySlimer,
        DataSourceProxySorter
    ],
    exports: [
        DataSourceProxy,
        DataSourceProxyBusy,
        DataSourceProxyFilter,
        DataSourceProxyGrouper,
        DataSourceProxySlimer,
        DataSourceProxySorter
    ]
})
export class DataSourceModule {}
