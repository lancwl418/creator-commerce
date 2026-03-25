import 'fabric';

declare module 'fabric' {
  interface FabricObject {
    data?: Record<string, unknown>;
  }
}
