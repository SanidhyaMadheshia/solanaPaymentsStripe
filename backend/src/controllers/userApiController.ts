// import type { Request, Response } from "express";

// import { prisma } from "../db/src/prisma.js";

// import type { CustomApiRequest } from "../middlewares/apiKeyAuth.js";



// export async  function createSessionUrl(req : CustomApiRequest , res : Response ) {

//     // const { pa}
//     const {product_id, price_id , customer_email, success_url , cancel_url , webhook_url}= req.body;


//     if(!price_id || ! product_id || !customer_email || ! success_url || ! cancel_url || ! webhook_url) {
//       return res.status(401).json({
//         message : "do not satisfy the required details ..."
//       });

//     }

//     const product =await  prisma.product.findFirst({
//       where : {
//         id : product_id,
//         prices : {
//           some : {
//             id : price_id
//           }
//         }
//       },
//       include : {
//         prices : true
//       }
      
//     });

    
    
//     if(!product ) {
//       return res.status(401).json({
//         messsage : "product or price do not exist"
//       });
      
//     }
//     const priceMap = product?.prices.filter((price : {
//       id :string
//     })=> 
//           price.id===price_id
//     );
//     if (
//       !req.apiKey?.userId ||
//       !product_id ||
//       !price_id ||
//       !priceMap[0]?.price ||
//       !req.apiKey?.user?.pubKey
//     ) {
//       console.log(req.apiKey?.userId , "gaand mara ",product_id, "gaand mara" , priceMap[0]?.price,"gaand mara", req.apiKey?.user?.pubKey);
      
//       return res.status(400).json({ message: "Missing required invoice fields" });
//     }

//     const invoice = await prisma.invoice.create({
//       data : {
//           userId : req.apiKey?.userId,
//           productId : product_id,
//           priceId : price_id,
//           amount : priceMap[0]?.price,
//           currency : "sBTC",
//           btcAddress : req.apiKey?.user.pubKey,
//           expiresAt: new Date(Date.now() + 15 * 60 * 1000),
//           // signature : ""
          


//       }
//     })
    

//     if(!invoice) {
//       return res.status(401).json({
//         message : "any fault in creating invoice "
//       });

//     }



//     return res.status(200).json({
//       "invoice_id": `${invoice.id}`,
//       "checkout_url": `https://yourgateway.com/checkout/${invoice.id}`,
//       "amount": `${priceMap[0].price}`,
//       "currency": "sBTC",
//       "expires_at": "2024-01-01T12:15:00Z"
//     })




    

    
// }






