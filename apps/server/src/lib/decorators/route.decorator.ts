import type { Constructor } from '../route-registry'
import { registerRoute } from '../route-registry'

type LegacyMethodDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => void

function createRouteDecorator(method: string) {
  return (path: string): LegacyMethodDecorator => {
    return (target, _propertyKey, descriptor) => {
      const ctor = (typeof target === 'function' ? target : target.constructor) as Constructor
      registerRoute(ctor, method, path, descriptor.value)
    }
  }
}

export const Get = createRouteDecorator('GET')
export const Post = createRouteDecorator('POST')
export const Put = createRouteDecorator('PUT')
export const Patch = createRouteDecorator('PATCH')
export const Delete = createRouteDecorator('DELETE')
