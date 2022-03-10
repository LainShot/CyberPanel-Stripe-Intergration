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

import Stripe from "stripe"; //If you dont know what this is we have a problem.
import express from "express"; //Hosts the endpoint for webhook.
import env from "dotenv"; //Loads in our env file :
const axios = require("axios"); //Used in order to send request to CyberPanel
const nodemailer = require("nodemailer"); //This is used to send emails to the user.

env.config(); //Start env

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2020-08-27",
});

const webhookSecret: string = process.env.ENDPOINT_SECRET; //lets get this from the env.

const app = express();

// Use JSON parser for all non-webhook routes
app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === "/webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  }
);

app.post(
  "/webhook",
  // Stripe requires the raw body to construct the event
  express.raw({ type: "application/json" }),
  async (req: express.Request, res: express.Response): Promise<void> => {
    const sig = req.headers["stripe-signature"];

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
    console.log("✅ Success:", event.id);

    // Cast event data to Stripe object
    if (event.type === "payment_intent.succeeded") {
      const stripeObject: Stripe.PaymentIntent = event.data
        .object as Stripe.PaymentIntent;
      console.log(`💰 PaymentIntent status: ${stripeObject.status}`);
      console.log(
        "======================================================================================="
      );
      console.log(
        "LOOKING UP INFO FOR THE FOLLOWING CUSTOMER ID, PLEASE WAIT..",
        stripeObject.customer
      );
      //we set this as any as it does not know what is going to be populated. ie the email.
      const customer: any = await stripe.customers.retrieve(
        stripeObject.customer.toString()
      );
      console.log("I FOUND THE FOLLOWING USER INFO FOR SETUP....");
      console.log(
        "======================================================================================="
      );
      console.log("********************************");
      console.log(customer);
      console.log("********************************");
      console.log("EMAIL: ", customer.email);
      var firstName = customer.name.split(" ").slice(0, -1).join(" "); //This is 🤮
      var lastName = customer.name.split(" ").slice(-1).join(" "); //This is 🤮
      console.log("FIRST NAME: ", firstName);
      console.log("LAST NAME: ", lastName);
      console.log(
        "======================================================================"
      );
      //Everything has worked and go well lets create the account.
      gen_user_acc(customer.email, firstName, lastName); //pass everything we need to make the acc.
    } else if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💵 Charge id: ${charge.id}`);
    } else {
      //we dont know this event so lets deal with it and let the user know.
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }
);

function gen_user_acc(email: string, firstname: string, lastname: string) {
  console.log("Stating account creation for: " + email);
  var username = email.split("@")[0].toString(); //splits into array grab the bit we want and string it.
  var p1 =
    Math.random().toString(36).slice(-24) + //lets build a random password I am sure some guy on stack overflow will love this...
    Math.random().toString(12).slice(-32); //now add another random start point to cut 8 chars out of that, and its good enough for me.
  var password = p1.substring(0, Math.random() * (12 - 8) + 8);
  console.log("Password Genrated....");
  console.log("Starting Web Request...");

  axios //lets setup everythibg we want to send over to cyber panel.
    .post(process.env.PANEL_URL + "/api/submitUserCreation", {
      adminUser: process.env.PANEL_ADMIN,
      adminPass: process.env.PANEL_PASSWORD,
      firstName: firstname,
      lastName: lastname,
      email: email,
      userName: username,
      password: password,
      websitesLimit: 1,
      selectedACL: "user",
      securityLevel: "HIGH",
    })
    .then((res) => {
      console.log(`statusCode: ${res.status}`);
      console.log("USER HAS BEEN CREATED IN THE PANEL");
      send_email(email, username, password); //now lets go send a user the email with there login.
    })
    .catch((error) => {
      console.error(error);
      console.log("WE COULD NOT CREATE THE USER SEE THE ERROR ABOVE ^^");
    });
}

async function send_email(email: string, username: string, password: string) {
  console.log("email service starting.....");
  console.log("SENDING EMAIL TO: " + email);

  //now we start using node mailer.
  let transporter = nodemailer.createTransport({
    //we will load a lot of this from env for sec reasons ofc :)
    host: process.env.SMTP_HOST,
    port: 25,
    secure: false, // true for 465, false for other ports
    tls: { rejectUnauthorized: false },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  var username = email.split("@")[0].toString(); //splits into array grab the bit we want and string it.

  let user_mail = await transporter.sendMail({
    from: `"PANEL LOGIN" <${process.env.SMTP_USER}>`, // sender address
    to: email, // list of receivers
    subject: "Welcome user!", // Subject line
    text: `"WELCOME YOUR WEBHOSTING PANEL LOGIN HAS BEEN SETUP USER: ${username}  PASSWORD: ${password} FOLLOW THE LINK ON OUR HOMEPAGE IN ORDER TO LOGIN. THANKS`, // plain text body
    html: `<center>Welcome <br> Your login for webhosting has been created! <br> In order to login go to our home page and follow the link to the panel and login with the following. <br> USER: ${username} <br> PASSWORD: ${password} <br> Thanks <br> The Systems Team</b></center>`, // html body
  });
  //now lets just log out that the mail has been send :).
  console.log("Message sent: %s", user_mail.messageId);
}

app.listen(80, (): void => {
  console.log("ONLINE ON PORT 80");
});
