/** Built-in HyperClass demo / template course — never deletable from the library. */
export const DEMO_COURSE_ID = 'hyperclass_demo_v001';

export function isDemoCourseId(id: string | undefined | null): boolean {
  return Boolean(id && id === DEMO_COURSE_ID);
}
