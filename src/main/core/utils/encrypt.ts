import crypto from 'crypto'

const SECRET_KEY = process.env.MINUS_ENCRYPTION_KEY || 'SAMPLE'
const key = crypto.createHash('sha256').update(SECRET_KEY).digest()

function encrypt(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + encrypted
}

function decrypt(encryptedData: string) {
  const inputIV = Buffer.from(encryptedData.slice(0, 32), 'hex')
  const encryptedText = encryptedData.slice(32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, inputIV)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export { encrypt, decrypt }
