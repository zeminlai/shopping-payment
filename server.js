require('dotenv').config()

const express = require('express');
let cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"))

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)

const storeItems = new Map([
    [1, {priceInCents: 1000, name: "Court 3"}],
    [2, {priceInCents: 1300, name: "Court 5"}]
])

app.post("/create-checkout-session", async (req,res) => {
    console.log("fetch successful")
    console.log(req.body.items)
    const items = req.body.items;
   
    const lineItems = items.map(item => {
        return{
            price_data: {
                currency: 'myr',
                product_data: {
                    name: item.title
                },
                unit_amount: (item.price * 100)
            },
            quantity: 1
        }
    })

    try{
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'fpx'],
            mode: 'payment',
            line_items: lineItems,
            // req.body.items.map(item => {
            //     return{
            //         price_data: {
            //             currency: 'myr',
            //             product_data: {
            //                 name: item.title
            //             },
            //             unit_amount: (item.price * 100)
            //         },
            //         quantity: 1
            //     }
            // }),
            success_url:`${process.env.SERVER_URL}/success.html`,
            cancel_url:`${process.env.SERVER_URL}/cancel.html`,
        })
        console.log(session.url)
        res.json({url: session.url})
    }catch(e){
        res.status(500).json({error: e.message})
    }
})
app.listen(4000)