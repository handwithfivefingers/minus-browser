// const encryptedData = CryptoJS.AES.encrypt(objectString, secretKey).toString();
import crypto from "crypto";

// Generate a secret key and initialization vector (IV)
const secretKey = "SAMPLE"; // 32 bytes for AES-256
const iv = crypto.randomBytes(16); // 16 bytes for AES-CBC

function encrypt(text: string) {
  const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + encrypted; // Prepend IV for decryption
}

function decrypt(encryptedData: string) {
  const inputIV = Buffer.from(encryptedData.slice(0, 32), "hex"); // Extract IV
  const encryptedText = encryptedData.slice(32); // Extract encrypted text
  const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, inputIV);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const originalText = "This is a secret message.";
const encryptedText = encrypt(originalText);
const decryptedText = decrypt(encryptedText);

console.log("Original Text:", originalText);
console.log("Encrypted Text:", encryptedText);
console.log("Decrypted Text:", decryptedText);

export { encrypt, decrypt };