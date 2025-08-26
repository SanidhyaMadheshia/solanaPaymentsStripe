import type { Request, Response } from "express";
import { generateApiKey } from "../lib/userApiLib.js";
import { prisma } from "../db/src/prisma.js";
import crypto from "crypto"
import type { CustomRequest } from "../middlewares/auth.js";




export async  function createApiKey(req : CustomRequest , res : Response) {


    const id = req.token!._id;

    
    const user = await prisma.user.findFirst({
      where : {
        id  
      }
    });
    if(!user) {
      return res.status(401).json({
        message : "user not present  !!"
      })
    }

    const key : string = await generateApiKey(user.email);

    const keyHash = crypto.createHash("sha256").update(key.slice(3)).digest("hex");

    const newApiKey = await prisma.apiKey.create({
      data : {
        userId : user!.id,
        keyHash : keyHash,
        label : "for payment"

    }});

    res.status(200).json({
        message : `api key created for user email : ${user.email}`,
        key 

    });




    
}


export function createSessionUrl(req : Request , res : Response ) {

    // const { pa}

    res.status(200).json({
        message : "direct working correctly "
    });

    
}




// export function createPrice(req : Request , res : Response) {

//     const {unitAmount }= req.body;

// }


// export async  function  createProduct(req  : CustomRequest  , res : Response) {

//     const {prodName, price} = req.body;
//     if (!prodName || !price ) {
//       return res.status(400).json({ error: "prodName, price, and userId are required" });
//     }

//     // const 
//     try {
//         // const product =await  prisma.product.create({
//         //     data : {
//         //         name: prodName,
//         //         userId : 
//         //     }
//         // });

//     } catch (err) {
//         console.log(err);

//         return res.status(401).json({
//             message : "hello bhai "
//         })
//     }


    

    
// }

export async function createProduct(req: Request, res: Response) {
  try {
    const { prodName, price, userId } = req.body;

    if (!prodName || !price || !userId) {
      return res.status(400).json({ error: "prodName, price, and userId are required" });
    }

    // Create Product with Price in a nested transaction
    const product = await prisma.product.create({
      data: {
        name: prodName,
        userId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // example: 1 year expiry
        prices: {
          create: {
            label: "Base Price",
            // you’ll need to add currency + amount in schema (recommended)
          },
        },
      },
      include: { prices: true },
    });

    return res.status(201).json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("Error creating product:", err);
    return res.status(500).json({
      error: "Something went wrong while creating product",
    });
  }
}

