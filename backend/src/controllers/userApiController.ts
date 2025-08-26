import type { Request, Response } from "express";
import { generateApiKey } from "../lib/userApiLib.js";




export async  function createApiKey(req : Request , res : Response) {


    const {email } = req.body;

    const key : string = await generateApiKey(email);


    res.status(200).json({
        message : `api key created for user email : ${email}`,
        key : key

    });




    
}


export function createSessionUrl(req : Request , res : Response ) {
    res.status(200).json({
        message : "direct working correctly "
    })
}