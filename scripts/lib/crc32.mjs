/**
 * 叁岛世界 构建脚本 — CRC32 校验（ZIP / PNG 通用）
 * 纯 Node.js 内置模块，零外部依赖
 *
 * ZIP 条目校验与 PNG 块校验使用同一个标准 CRC-32：
 * 反射多项式 0xEDB88320，初值 0xFFFFFFFF，结果异或 0xFFFFFFFF。
 */

// 模块级查表（只构建一次）
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * 计算 Buffer 的 CRC32 校验值
 * @param {Buffer} buf
 * @returns {number} 无符号 32 位整数
 */
export function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
