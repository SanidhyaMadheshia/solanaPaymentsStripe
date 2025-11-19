

import crypto from "crypto"

export async function generateApiKey(userId: string) : Promise<string> {
  // 1. Generate a random raw key (32 bytes = 64 hex chars)
  const rawKey = crypto.randomBytes(32).toString("hex");

  // 2. Hash the key before storing
//   const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  // 3. Store in DB
 

  const apiKey = `sk_${rawKey}`;
  return apiKey;

}

export function hashTheKey(apiKey : string){

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  return keyHash;
  
}
  







