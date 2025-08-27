import type { Request, Response } from "express";
import { generateApiKey } from "../lib/userApiLib.js";
import { prisma } from "../db/src/prisma.js";
import crypto from "crypto"
import type { CustomRequest } from "../middlewares/auth.js";
import type { CustomApiRequest } from "../middlewares/apiKeyAuth.js";




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


export async  function createSessionUrl(req : CustomApiRequest , res : Response ) {

    // const { pa}
    const {product_id, price_id , customer_email, success_url , cancel_url , webhook_url}= req.body;


    if(!price_id || ! product_id || !customer_email || ! success_url || ! cancel_url || ! webhook_url) {
      return res.status(401).json({
        message : "do not satisfy the required details ..."
      });

    }

    const product =await  prisma.product.findFirst({
      where : {
        id : product_id,
        prices : {
          some : {
            id : price_id
          }
        }
      },
      include : {
        prices : true
      }
      
    });

    
    
    if(!product ) {
      return res.status(401).json({
        messsage : "product or price do not exist"
      });
      
    }
    const priceMap = product?.prices.filter((price )=> {
          price.id===price_id
    });
    if (
      !req.apiKey?.userId ||
      !product_id ||
      !price_id ||
      !priceMap[0]?.price ||
      !req.apiKey?.user?.pubKey
    ) {
      return res.status(400).json({ message: "Missing required invoice fields" });
    }

    const invoice = await prisma.invoice.create({
      data : {
          userId : req.apiKey?.userId,
          productId : product_id,
          priceId : price_id,
          amount : priceMap[0]?.price,
          currency : "sBTC",
          btcAddress : req.apiKey?.user.pubKey,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          // signature : ""
          


      }
    })
    

    if(!invoice) {
      return res.status(401).json({
        message : "any fault in creating invoice "
      });

    }



    return res.status(200).json({
      "invoice_id": `${invoice.id}`,
      "checkout_url": `https://yourgateway.com/checkout/${invoice.id}`,
      "amount": `${priceMap[0].price}`,
      "currency": "sBTC",
      "expires_at": "2024-01-01T12:15:00Z"
    })




    

    
}


export async function createProduct(req: CustomApiRequest, res: Response) {
  try {
    const userId = req.apiKey?.userId;

    const { prodName, price, label} = req.body;

    if (!prodName || !price || !userId) {
      return res.status(400).json({ error: "prodName, price, and userId are required" });
    }


    const product = await prisma.product.create({
      data: {
        name: prodName,
        userId,
        prices: {
          create: {
            label,
            price,
            currency : 'btc'

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


