//================================================================================>
//  _           _        _____ _           _   
 //| |         (_)      / ____| |         | |  
 //| |     __ _ _ _ __ | (___ | |__   ___ | |_ 
 //| |    / _` | | '_ \ \___ \| '_ \ / _ \| __|
 //| |___| (_| | | | | |____) | | | | (_) | |_ 
 //|______\__,_|_|_| |_|_____/|_| |_|\___/ \__|
//
 //       -CyberPanel-Stripe-Intergration-
//
// MIT License
//
// Copyright (c) 2022 LainShot
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
 //of this software and associated documentation files (the "Software"), to deal
 //in the Software without restriction, including without limitation the rights
 //to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 //copies of the Software, and to permit persons to whom the Software is
 //furnished to do so, subject to the following conditions:
 
 //The above copyright notice and this permission notice shall be included in all
 //copies or substantial portions of the Software.
 
 //THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 //IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 //FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 //AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 //LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 //OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 //SOFTWARE.
 
//================================================================================>

import Stripe from 'stripe';
import express from 'express';
import env from 'dotenv';

env.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

const webhookSecret: string = process.env.ENDPOINT_SECRET;

const app = express();

// Use JSON parser for all non-webhook routes
app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === '/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  }
);

app.post(
  '/webhook',
  // Stripe requires the raw body to construct the event
  express.raw({type: 'application/json'}),
  async (req: express.Request, res: express.Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Successfully constructed event
    console.log('✅ Success:', event.id);

    // Cast event data to Stripe object
    if (event.type === 'payment_intent.succeeded') {
      const stripeObject: Stripe.PaymentIntent = event.data
        .object as Stripe.PaymentIntent;
      console.log(`💰 PaymentIntent status: ${stripeObject.status}`);
      console.log("=======================================================================================")
      console.log("LOOKING UP INFO FOR THE FOLLOWING CUSTOMER ID, PLEASE WAIT..",stripeObject.customer)
      //we set this as any as it does not know what is going to be populated. ie the email. 
      const customer: any  = await stripe.customers.retrieve(stripeObject.customer.toString());
      console.log("I FOUND THE FOLLOWING USER INFO FOR SETUP....")
      console.log("=======================================================================================")
      console.log ("********************************")
      console.log(customer)
      console.log ("********************************")
      console.log("EMAIL: ",customer.email)
    } else if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💵 Charge id: ${charge.id}`);
    } else {
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({received: true});
  }
);

app.listen(80, (): void => {
  console.log('ONLINE ON PORT 80');
});