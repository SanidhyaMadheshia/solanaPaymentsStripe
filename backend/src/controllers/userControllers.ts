import type { Request, Response } from "express";
import crypto, { Hash } from "crypto";
import { prisma } from "../db/src/prisma.js";
// import nodemailer from "nodemailer";
import { createJWTtoken, type CustomRequest } from "../middlewares/auth.js";
// import { register } from "module";
import bcrypt from 'bcrypt';
import { clerkClient } from "../lib/clerk.js";
import { generateApiKey, hashTheKey } from "../lib/userApiLib.js";
// import { PrismaClientExtends } from "@prisma/client/extension";
// import { generateApiKey } from "../lib/userApiLib.js";


// export async function otpGenerationandSendEmailUser(req: Request, res: Response) {

// }

// export async function verifyUser(req: Request, res: Response) {

// }


// export async function registerUser(req : Request , res : Response) {

// }

// export async function loginUser(req : Request  , res: Response) {

// }





export async  function createApiKey(req : CustomRequest , res : Response) {

    const userId = req.token!._id;

    try {
        const rawLabel = req.query.label;
        const label : string  = 
                                (typeof rawLabel === "string")
                                ? rawLabel
                                : "randomString";

        const newApiKey = await generateApiKey(userId);
        console.log("New API Key generated :", newApiKey);
        const keyHash = hashTheKey(newApiKey);
        


        const key = await prisma.apiKey.create({
            data : {
                userId ,
                label ,
                keyHash 


            }
        });


        res.status(200).json({
            ApiKey : newApiKey,
            key
        });


    } catch(error) {
        console.error("Error in createApiKey:", error);
        res.status(500).json({ message: "Internal server error" });
    }
    
}

// export async function createProduct(req: CustomRequest, res: Response) {
 
// }

export async function createPrice(req : CustomRequest , res : Response) {
 console.log(" POST /createPrice  called");
    const userId = req.token!._id
    try {
        // const requestData  = req.body;
        // productId : productId,
        //               priceLabel :  newPriceLabel.trim(),
        //               priceAmount : amount 
        let priceLabel : string  = req.body.priceLabel ;
        let productId : string  = req.body.productId;
        let priceAmount : string  = req.body.priceAmount;

        // const newProduct = await  prisma.product.create({
        //     data : {
        //         userId,
        //         name : productName,
        //         description 
        //     }
        // });
//         model Price {
//   id         String   @id @default(uuid())
//   productId  String
//   product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
//   label      String
//   amount     Decimal  @db.Decimal(20, 8)
//   currency   String   // "SOL" or "USDC"
//   createdAt  DateTime @default(now())
// }
        const newPrice = await prisma.price.create({
            data : {
                productId : productId,
                label : priceLabel,
                amount : priceAmount,
                currency : "SOL"

            }
        })
        
        

        res.status(200).json({
            newPrice
        });



        

    } catch (error) {
        console.error("Error in createProduct:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function createProduct(req : CustomRequest , res : Response) {
    console.log(" POST /createProduct called");

    const userId = req.token!._id
    try {
        // const requestData  = req.body;

        let productName = req.body.productName ;
        let description = req.body.productDescription;

        const newProduct = await  prisma.product.create({
            data : {
                userId,
                name : productName,
                description 
            }
        });
        
        

        res.status(200).json({
            newProduct
        });



        

    } catch (error) {
        console.error("Error in createProduct:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


export async function getDashboardData(req : CustomRequest , res : Response) {
    const userId = req.token!._id;

    try {
        const user = await prisma.user.findUnique({
            where : {
                id : userId
            },
            include : {
                apiKeys : true,
                products : {
                    include : {
                        prices : true
                    }
                },
                invoices : {
                    include : {
                        payments : true
                    }
                }
            }
        });
         
        if(!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        console.log(user);

        return res.json({
            user 
        });


    } catch (error) {
        console.error("Error in getDashboardData:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}



// export async  function getInvoice(req : Request , res : Response ) {

// }


export async function exchangeToken(req : Request , res : Response) {
    console.log("In exchangeToken controller hi hi");
    try {
        console.log("In exchangeToken controller");
        const authHeader= req.headers.authorization;
        if (!authHeader) {
            return  res.status(400).json({ message: "Clerk session token missing in Authorization header" });
        }
        console.log("Authorization Header : ", authHeader);
        const clerkSessionToken = authHeader.split(" ")[1];
        console.log("Clerk Session Token received : ", clerkSessionToken);
        const webRequest = new Request(`http://localhost:5173${req.url}`, {
            method: req.method,
            headers: {
                authorization: `Bearer ${clerkSessionToken}`
            }, 
            // body: JSON.stringify({clerkSessionToken}) as BodyInit,
        });
        console.log("clerk jwt key :", process.env.CLERK_JWT_KEY);
        const {isAuthenticated, toAuth} = await clerkClient.authenticateRequest(webRequest , {
            jwtKey : process.env.CLERK_JWT_KEY!,
            secretKey : process.env.CLERK_SECRET_KEY!,
            publishableKey : process.env.CLERK_PUBLISHABLE_KEY!,
            authorizedParties: ['http://localhost:5173'],
        });

        const clerkUserId = toAuth()?.userId;
        console.log("Clerk User ID : ", clerkUserId);
        if (!isAuthenticated || !clerkUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        let user = await prisma.user.findUnique({
            where : {
                clerkId : clerkUserId
            }
        });
        console.log("User fetched from DB : ", user);
        if(!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const jwtToken = createJWTtoken(
             user.id,
             user.name!
        );

        res.json({
            jwtToken
        });






    } catch (error) {
        console.error("Error in exchangeToken:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
