require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const Court = require('./models/court-model.js');
const VenueInfo = require('./models/venueInfo-model.js')

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
const bodyParser = require('body-parser');

let items = [];

// shoppping cart checkout 
app.post("/create-checkout-session", async (req,res) => {
    console.log("fetch successful")
    console.log(req.body.items)
    items = req.body.items;
   
    const lineItems = items.map(item => {
        return{
            price_data: {
                currency: 'myr',
                product_data: {
                    name: `${item.court.venue} Court ${item.court.court} ${item.court.date} ${item.court.timestart}pm`
                },
                unit_amount: (item.court.price * 100)
            },
            quantity: 1
        }
    })

    try{
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'fpx'],
            mode: 'payment',
            line_items: lineItems,
            success_url:`${process.env.SERVER_URL}/success`,
            cancel_url:`${process.env.SERVER_URL}/cancel`,
        })
        // console.log(session.url)
        res.json({url: session.url})
    }catch(e){
        res.status(500).json({error: e.message})
    }
})

app.post("/",(req,res) => {
    // console.log(req.body)
    const searchCourt = req.body;
    Court.find(searchCourt)
        .then(result => {
            const bookedCourt = result
            // res.json(result)

            VenueInfo.find({venue: searchCourt.venue})
            .then(result => {
                const venueInfo = result
                console.log(venueInfo)
                // format response to return both venueInfo and bookedCOurt
                const response = {
                    venueInfo: {venueInfo},
                    bookedCourt: {bookedCourt}
                    }
                res.json(response)
            }
            )
        })

})

const endpointSecret = "whsec_13efb915ca779f6015b5fb143fe8c58ff4d5272b1b3ec5545f036de6e3e623b6"

const fulfillOrder = (lineItems) => {
    // TODO: fill me in
    console.log("Fulfilling order", lineItems);
  }
  
app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (request, response) => {
    const payload = request.body;

    // console.log(payload)
    if (payload.type === 'checkout.session.completed'){
        console.log(items)
        items.forEach(item =>{
            let court = new Court(item.court)
            court.save()
                .catch(err => console.log(err))
        })
    }
    response.status(200);
  });
