import type { Constructor } from '../route-registry'
import { setControllerAuth, markRouteAuth } from '../route-registry'

export function AuthAccess(): ClassDecorator & MethodDecorator {
  return ((target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      markRouteAuth(descriptor.value)
    } else {
      setControllerAuth(target as Constructor)
    }
  }) as ClassDecorator & MethodDecorator
}
