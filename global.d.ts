declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// jest-mock-extended v4 ships without .d.ts files
declare module "jest-mock-extended" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DeepMockProxy<T> = T & {
    [K in keyof T]: T[K] extends (...args: any[]) => any
      ? T[K] & jest.Mock
      : DeepMockProxy<T[K]>;
  };

  export type { DeepMockProxy };
  export function mockDeep<T>(): DeepMockProxy<T>;
  export function mockReset(mock: unknown): void;
}
