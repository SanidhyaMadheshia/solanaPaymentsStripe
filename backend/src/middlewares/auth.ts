import type { NextFunction, Request, Response } from "express";

import jwt, { type JwtPayload } from "jsonwebtoken"


export interface CustomRequest extends Request {
    token : string | JwtPayload
}


export function authJwtMiddleware(req : Request , res: Response , next : NextFunction) {
    const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET : "secret";
    try {
        
        const authorizationToken = req.headers['authorization'];
    
        if(!authorizationToken) {
            return res.status(401).json({
                message : "no auth token "
            });
    
    
        }
    
    
        const token : string  = authorizationToken.split(" ")[0] !;
    
    
    
        const payload  = jwt.verify(token , secret!);
    
        if(!payload) {
            return res.status(401).json({
                message : "authentication failed"
            });
        }
    
    
    
        (req as CustomRequest).token = payload
    
        
        
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


export interface PayloadJWT {
    _id : string;
    name : string;
}