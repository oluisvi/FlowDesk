import { Injectable } from "@nestjs/common"; import { argon2id,hash,verify } from "argon2";
@Injectable() export class PasswordService{hash(value:string):Promise<string>{return hash(value,{type:argon2id,memoryCost:19456,timeCost:2,parallelism:1});} verify(encoded:string,value:string):Promise<boolean>{return verify(encoded,value);}}
