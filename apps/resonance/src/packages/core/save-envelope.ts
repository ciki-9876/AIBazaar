import { canonicalJson, checksum } from './serialization.ts';

export type Product = 'elevator' | 'cards';
export const ENVELOPE_SCHEMA = 1;
export function encodeSave(product: Product, rulesVersion: string, payload: unknown): string {
  const body = { product, schemaVersion: ENVELOPE_SCHEMA, rulesVersion, payload };
  return canonicalJson({ ...body, checksum: checksum(body) });
}
/** Old JSON remains readable; envelope-shaped input must pass every check. */
export function decodeSave(text: string, product: Product, rulesVersion: string): unknown {
  if (text.length > 8_000_000) throw Error('存档文件过大');
  const raw: unknown = JSON.parse(text);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('存档格式无效');
  const value = raw as Record<string, unknown>;
  if (!['product', 'schemaVersion', 'rulesVersion', 'checksum', 'payload'].some((key) => Object.hasOwn(value, key))) return value;
  if (value.product !== product) throw Error('存档属于其他产品，无法导入');
  if (value.schemaVersion !== ENVELOPE_SCHEMA) throw Error('存档信封版本不支持');
  if (value.rulesVersion !== rulesVersion) throw Error('存档规则版本不支持');
  const body = { product: value.product, schemaVersion: value.schemaVersion, rulesVersion: value.rulesVersion, payload: value.payload };
  if (!Object.hasOwn(value, 'payload') || value.checksum !== checksum(body)) throw Error('存档校验失败，文件可能已损坏');
  return value.payload;
}
