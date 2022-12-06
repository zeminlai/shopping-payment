require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const Court = require('./models/court-model.js');
const VenueInfo = require('./models/venueInfo-model.js')

const authRoutes = require('./auth/routes/authRoutes');
const connection = require('./auth/config/database');
const cookieParser = require('cookie-parser');
const {requireAuth} = require('./auth/middleware/authMiddleware');
const { removeListener } = require('./auth/config/database');

const path = __dirname + '/views/build';

let cors = require('cors');

const app = express();

const dbURI = process.env.MONGO_URL;

mongoose.connect(dbURI)
.then(console.log("connected to db"))
.then(result => app.listen(8080))
.catch(err => console.log(err));

app.use(cors());
app.use(express.json());
app.use(express.static(path))
app.use(express.urlencoded({extended: true}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.static('public'));

app.set('view engine', 'ejs');

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)
const bodyParser = require('body-parser');

let items = [];
let decodedToken = {};

app.get('/', function (req,res) {
    res.sendFile(path + "index.html");
  });

// shoppping cart checkout 
app.post("/create-checkout-session", requireAuth, async (req,res) => {
    console.log("fetch successful")
    // console.log(req.body.items)
    items = req.body.items;
    console.log(req.decodedToken)
    decodedToken = req.decodedToken

    if (decodedToken === undefined){
         res.json({url:"http://localhost:8080/login"})
    } else {
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
                success_url:`${process.env.SERVER_URL}/#/success`,
                cancel_url:`${process.env.SERVER_URL}/#/cancel`,
            })
            // console.log(session.url)
            res.json({url: session.url})
        }catch(e){
            res.status(500).json({error: e.message})
        }

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

const endpointSecret = process.env.ENDPOINT_SECRET_STRIPE 

app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (request, response) => {
    const payload = request.body;
    // console.log(payload)
    if (payload.type === 'checkout.session.completed'){
        console.log('checkout complete')
        console.log(items)
        items.forEach(item =>{
            item.court.user_id = decodedToken.id
            console.log(item)
            let court = new Court(item.court)
            court.save()
                .catch(err => console.log(err))
        })
    }
    response.status(200);
  });

  app.use(authRoutes);
