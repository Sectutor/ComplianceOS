import { encrypt, decrypt } from '../packages/core/src/lib/crypto';
import dotenv from 'dotenv';
dotenv.config();

const testKey = "sk-test-key-12345";
console.log("Original:", testKey);

try {
    const encrypted = encrypt(testKey);
    console.log("Encrypted:", encrypted);

    const decrypted = decrypt(encrypted);
    console.log("Decrypted:", decrypted);

    if (testKey === decrypted) {
        console.log("SUCCESS: Encryption/Decryption is consistent.");
    } else {
        console.log("FAILURE: Decrypted value doesn't match original.");
    }
} catch (error) {
    console.error("Encryption/Decryption Error:", error);
}
