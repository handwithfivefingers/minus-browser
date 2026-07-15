import crypto from "crypto";

const secretKey = "SAMPLE";
const iv = crypto.randomBytes(16);

function encrypt(text: string) {
  const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + encrypted;
}

function decrypt(encryptedData: string) {
  const inputIV = Buffer.from(encryptedData.slice(0, 32), "hex");
  const encryptedText = encryptedData.slice(32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, inputIV);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export { encrypt, decrypt };
