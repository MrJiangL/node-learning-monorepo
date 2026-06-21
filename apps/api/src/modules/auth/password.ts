import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  // salt 是每个密码单独生成的随机值。
  //
  // 有了 salt，即使两个用户用了同一个密码，数据库里保存的 hash 也不一样。
  // 这能降低“相同密码被一眼看出来”的风险。
  const salt = randomBytes(16).toString("hex");

  // scrypt 是 Node 内置的密码哈希算法，适合用来处理用户密码。
  // 它会故意消耗一定计算成本，让暴力猜密码变得更难。
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  // 保存为 salt:hash。
  // 后面做登录验证时，会取出 salt，用用户输入的密码重新算 hash，再比较结果。
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  // 数据库里保存的是 "salt:hash"。
  // 登录时先拆出 salt，再用用户输入的 password 重新计算一次 hash。
  const [salt, storedHash] = passwordHash.split(":");

  // 如果数据库里的 hash 格式不对，直接认为验证失败。
  // 这里不要抛内部错误给用户，否则会泄露系统细节。
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(storedHash, "hex");

  // timingSafeEqual 要求两个 Buffer 长度一致。
  // 长度不一致时，说明肯定不是同一个 hash。
  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
}
