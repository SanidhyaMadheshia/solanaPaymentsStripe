import type { NextFunction, Request, Response } from "express";

import jwt, { type JwtPayload } from "jsonwebtoken"


export interface PayloadJWT {
  _id: string;
  name: string;
  iat?: number;
  exp?: number;
}
export interface CustomRequest extends Request {
    token? :  PayloadJWT
}


export function authJwtMiddleware(req : Request , res: Response , next : NextFunction) {
    console.log("auth jwtmiddleware called ");
    
    const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET : "secret";
    try {
        
        const authorizationToken = req.headers.authorization;
    
        if(!authorizationToken) {
            return res.status(401).json({
                message : "no auth token "
            });
    
    
        }
    
          const token : string  = authorizationToken.split(" ")[1]!;
    
    
    
        const payload  = jwt.verify(token , secret!) as PayloadJWT;
    
        if(!payload) {
            return res.status(401).json({
                message : "authentication failed"
            });
        }
    
    
        console.log("payLoad :" , payload);


        (req as CustomRequest).token = payload
    
        console.log("auth user : ", payload);

        
        next();
    }catch (err) {
        res.status(401).json({
            message : "please authenticate"
        });
    }







}





export function createJWTtoken(userId : string , username : string): string {
    const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET : "secret";
    const token = jwt.sign({ _id: userId, name: username}, secret!, {
       expiresIn: '2 days',
     });

    return token;
}

