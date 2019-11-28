// https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder#Polyfill
/**
 * @internal
 */
export function _encodeUTF8(input: string): number[] {
  const resArr: number[] = new Array(input.length * 2);
  let resPos = -1;
  for (let i = 0; i !== input.length; i++) {
    let point = input.charCodeAt(i);
    if (point >= 0xd800 && point <= 0xdbff) {
      if (i === input.length - 1) {
        resArr[(resPos += 1)] = 0xef /*0b11101111*/;
        resArr[(resPos += 1)] = 0xbf /*0b10111111*/;
        resArr[(resPos += 1)] = 0xbd /*0b10111101*/;
        break;
      }
      const nextcode = input.charCodeAt(i + 1);
      if (nextcode >= 0xdc00 && nextcode <= 0xdfff) {
        point = (point - 0xd800) * 0x400 + nextcode - 0xdc00 + 0x10000;
        i += 1;
        if (point > 0xffff) {
          resArr[(resPos += 1)] = (0x1e /*0b11110*/ << 3) | (point >>> 18);
          resArr[(resPos += 1)] =
            (0x2 /*0b10*/ << 6) | ((point >>> 12) & 0x3f) /*0b00111111*/;
          resArr[(resPos += 1)] =
            (0x2 /*0b10*/ << 6) | ((point >>> 6) & 0x3f) /*0b00111111*/;
          resArr[(resPos += 1)] =
            (0x2 /*0b10*/ << 6) | (point & 0x3f) /*0b00111111*/;
          continue;
        }
      } else {
        resArr[(resPos += 1)] = 0xef /*0b11101111*/;
        resArr[(resPos += 1)] = 0xbf /*0b10111111*/;
        resArr[(resPos += 1)] = 0xbd /*0b10111101*/;
        continue;
      }
    }
    if (point <= 0x007f) {
      resArr[(resPos += 1)] = (0x0 /*0b0*/ << 7) | point;
    } else if (point <= 0x07ff) {
      resArr[(resPos += 1)] = (0x6 /*0b110*/ << 5) | (point >>> 6);
      resArr[(resPos += 1)] =
        (0x2 /*0b10*/ << 6) | (point & 0x3f) /*0b00111111*/;
    } else {
      resArr[(resPos += 1)] = (0xe /*0b1110*/ << 4) | (point >>> 12);
      resArr[(resPos += 1)] =
        (0x2 /*0b10*/ << 6) | ((point >>> 6) & 0x3f) /*0b00111111*/;
      resArr[(resPos += 1)] =
        (0x2 /*0b10*/ << 6) | (point & 0x3f) /*0b00111111*/;
    }
  }
  resArr.length = resPos + 1;
  return resArr;
}
