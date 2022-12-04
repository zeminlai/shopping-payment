require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const Court = require('./models/court-model.js');

let cors = require('cors');

const app = express();

const dbURI = process.env.MONGO_URL;

mongoose.connect(dbURI)
.then(console.log("connected to db"))
.then(result => app.listen(4000))
.catch(err => console.log(err));

app.use(cors());
app.use(express.json());
app.use(express.static("public"))
app.use(express.urlencoded({extended: true}));
app.use(morgan("dev"));

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)


// shoppping cart checkout 
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
            success_url:`${process.env.SERVER_URL}/success.html`,
            cancel_url:`${process.env.SERVER_URL}/cancel.html`,
        })
        console.log(session.url)
        res.json({url: session.url})
    }catch(e){
        res.status(500).json({error: e.message})
    }
})

app.post("/",(req,res) => {
    console.log(req.body)
    const searchCourt = req.body;
    Court.find(searchCourt,)
        .then(result => {
            res.json(result)
        })

})
