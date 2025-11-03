import { verifyWebhook } from "@clerk/backend/webhooks";
import { type NextFunction,type Response as ExpressRespons,type Request as ExpressRequest } from "express";
import getRawBody from "raw-body";
import {prisma} from "../db/src/prisma.js"

export async function clerkUserCreated(req : ExpressRequest, res: ExpressRespons, next: NextFunction) {

     try {

        const raw = await getRawBody(req);
        const arrayBuffer = raw instanceof Buffer
            ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
            : new TextEncoder().encode(String(raw)).buffer;
        console.log(req.url);
        
        const webRequest = new Request(`http://localhost:3000${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: arrayBuffer as BodyInit,
        });


        const evt = await verifyWebhook(webRequest);


        const { id } = evt.data
        const eventType = evt.type
        console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
        console.log('Webhook payload:', evt.data)
        console.log('Full webhook event:', evt);
        if (evt.type === "user.created") {
            const data = evt.data as any; 
            const email =
                data.email_addresses?.[0]?.email_address || data.external_accounts?.[0]?.email_address;
            const name = data.first_name
                ? `${data.first_name} ${data.last_name || ""}`.trim()
                : data.external_accounts?.[0]?.given_name || null;

            const clerkId = data.id;
            const existing = await prisma.user.findUnique({ where: { clerkId } });
            if (!existing) {
                const newUser = await prisma.user.create({
                data: {
                    clerkId,
                    email,
                    name,
                    pubKey: [], 
                },
                });
                console.log("New user created:", newUser);
            } else {
                console.log("User alraedy exists with clerkId : ", clerkId);
            }
        } else if (evt.type === 'session.created') {
            
        }

        // res.send('Webhook received');
        res.json({
            message : "webhook received successfully"
        })
        
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return res.status(400).send('Error verifying webhook')
    }
    
}