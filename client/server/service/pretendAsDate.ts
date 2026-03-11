// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export const pretendAsDate = (unixtime: number): Date => Math.floor(unixtime / 1000) as any;
