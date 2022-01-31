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

//==============ENV======================//
require('dotenv').config()
//==============ENV======================//

//IMPORTS==================================//
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});
import express from 'express';
import cors = require('cors');
//IMPORTS==================================//


//APP BINDINGS==================================//
const app = express();
app.use(cors({ origin: true }));
//APP BINDINGS==================================//





app.post('/api/product1', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
  
  
    const endpointSecret = process.env.ENDPOINT_SECRET;
  
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(req.body.rawBody, sig, endpointSecret);
    } catch (err) {
        //could not verify that this was sent via stripe so we send a 404!
      res.status(400).end();
      return;
    }
    
//right now we know it came from stripe lets work out what they want us to do with a switch.  
    const intent = event.data.object;
  
    switch (event.type) {
      case 'payment_intent.succeeded':
        //OKAY SO THE PAYMENT IS DONE LETS SETUP THE CYBER PANEL
        
  
        console.log("Succeeded:", intent.id);
        break;
      case 'payment_intent.payment_failed':
        //oh the payment did not go to plan and failed :(
        const message = intent.last_payment_error && intent.last_payment_error.message;
        console.log('we have had a payment fail... :', intent.id, message);
        break;
    }
  
    res.sendStatus(200);
  });
  app.get('/', (req, res) => {
    //test page at root endpoint :)
    res.send('<html><body><center><H1> -CyberPanel-Stripe-Intergration by LainShot is online... :) </H1> </center> </body> </html>')
  })



  app.listen(80, () => {
    console.log(`-CyberPanel-Stripe-Intergration by LainShot is running... on port:${80}`)
  })