import type { Constructor } from '../route-registry'
import { setBasePath } from '../route-registry'

export function Controller(basePath: string = ''): ClassDecorator {
  return (target) => {
    setBasePath(target as unknown as Constructor, basePath)
  }
}
