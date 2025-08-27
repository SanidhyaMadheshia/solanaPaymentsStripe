import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../db/src/prisma.js";
import nodemailer from "nodemailer";
import { createJWTtoken } from "../middlewares/auth.js";
// import { register } from "module";
import bcrypt from 'bcrypt';


export async function otpGenerationandSendEmailUser(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          pubKey: "", // can set later,
          password : "",

          isVerified: false,
        },
      });
    }

    await prisma.otp.create({
      data: {
        code: otpCode,
        userId: user.id,
        expiresAt,
      },
    });


    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,      // your Gmail
        pass: process.env.GMAIL_PASS,      // your App Password (not regular Gmail password)
      },
    });

    // send email
    await transporter.sendMail({
      from: `"Auth Service" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otpCode}. It will expire in 5 minutes.`,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}



export async function verifyUser(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });
    const otpRecord = await prisma.otp.findFirst({
      where: {
        user: { email },
        code: otp,
        expiresAt: { gt: new Date() },
        used: false,
      },
    });

    if (!otpRecord) return res.status(400).json({ error: "Invalid or expired OTP" });

    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    await prisma.user.update({
      where: { id: otpRecord.userId },
      data: { isVerified: true },
    });

    res.json({ message: "User verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}


export async function registerUser(req : Request , res : Response) {

    try {

        const {email , pubKey , name, password } = req.body;
    
    
        const user = await prisma.user.findFirst({
            where : {
                email : email,
                isVerified : true
            },
            
        });
    
    
        if(!user) {
            return res.status(401).json({
                messge : "problem while registering "
            }); 
    
    
        }
        if(user.password) {
            return res.status(401).json({
                message : "already registered"
            });

        } 
    
        const savedPassword : string = await bcrypt.hash(password, 10);

    
    
        const updatedUser = await prisma.user.update({
            where : {
                email : email
            },
            data : {
                pubKey,
                name ,
                password : savedPassword
                
            }
        });


        const token : string = createJWTtoken(user.id, user.name! );

        res.status(200).json({
            message : "user created successfully",
            token ,
            user : updatedUser
        });
        
        
    }catch(err) {
        console.log("error : ", err);

        return res.status(401).json({
            message : "error in userControllerts"
        });



    }






    


    
}



export async function loginUser(req : Request  , res: Response) {

    const {email , password}= req.body;
    try {
        
        const user = await prisma.user.findFirst({
            where : {
                email 
            }
        });
        if(!user) {
            return res.status(401).json({
                message : "user doesnt exits"
            });
        }
    
        const verify =  await bcrypt.compare(password, user.password);
    
        if(!verify) {
            return res.status(401).json({
                message : "incorrect password"
            });
        }
    
        const token : string = createJWTtoken(user.id, user.name! );
    
    
    
        res.status(200).json({
            message : "user login succsessful",
            token,
            user 
    
        });
    }catch(err) {
        console.log("error :", err);

        return res.json({
            message : "failed to login "
        });

    }


    // const hasPassword = crypto.


}








