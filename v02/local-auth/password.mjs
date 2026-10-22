import{randomBytes,scrypt as derive,timingSafeEqual}from'node:crypto';import{promisify}from'node:util';
const scrypt=promisify(derive),options={N:131072,r:8,p:1,maxmem:256*1024*1024};
// Node's OpenSSL scrypt, OWASP N=2^17/r=8/p=1. Encoded version fixes parameter bounds.
export async function hashPassword(password){const salt=randomBytes(16),key=await scrypt(password,salt,32,options);return['scrypt-v1',salt.toString('hex'),key.toString('hex')].join(':');}
const dummy='scrypt-v1:'+('00'.repeat(16))+':'+('00'.repeat(32));
export async function verifyPassword(password,encoded=dummy){const m=/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(encoded);const entry=m||/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(dummy);const key=await scrypt(password,Buffer.from(entry[1],'hex'),32,options);return timingSafeEqual(key,Buffer.from(entry[2],'hex'))&&!!m;}
