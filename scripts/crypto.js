import { crypto } from 'lts-server'

const { generateRandom, generateSalt, generateHash, encrypt, decrypt } = crypto

const prefix = generateRandom(4)
const phrase = generateRandom(16)
const salt = generateSalt()

console.log('apiKey.prefix', prefix)
console.log('apiKey.phrase', phrase)
console.log('apiKey.salt', salt)
console.log('apiKey.hash', generateHash(phrase, salt))

const key = generateRandom(32)
const config = {/** ADD YOUR OBJECT CONFIG HERE **/}

const encrypted = encrypt(key, JSON.stringify(config))
console.log('Encrypt', key, encrypted)
const decrypted = decrypt(key, encrypted)
console.log('Decrypt', key, JSON.parse(decrypted))
