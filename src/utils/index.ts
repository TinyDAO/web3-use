export const toHex = (num: number | string) => {
  const val = Number(num);
  return "0x" + val.toString(16);
}
