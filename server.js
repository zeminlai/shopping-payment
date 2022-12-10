require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const Court = require('./models/court-model.js');
const VenueInfo = require('./models/venueInfo-model.js')

const authRoutes = require('./auth/routes/authRoutes');
const connection = require('./auth/config/database');
const cookieParser = require('cookie-parser');
const {requireAuth, checkUser} = require('./auth/middleware/authMiddleware');
const { removeListener } = require('./auth/config/database');


const Game = require('./auth/config/databaseGame');
const { render } = require('ejs');
const Join = require('./auth/config/databasejoin');
const ObjectId = require('mongodb').ObjectID;
const User = require("./auth/config/database");

const path = __dirname + '/views/build/';

let cors = require('cors');

const app = express();

const dbURI = process.env.MONGO_URL;

mongoose.connect(dbURI)
.then(console.log("connected to db"))
.then(result => app.listen(process.env.PORT))
.catch(err => console.log(err));

app.use(cors());
app.use(express.json());
app.use(express.static(path))
app.use(express.urlencoded({extended: true}));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.static('public'));
app.use("/video", express.static(__dirname + "/video"))

app.set('view engine', 'ejs');

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)
const bodyParser = require('body-parser');

let items = [];
let decodedToken = {};

app.get('*', checkUser)

// app.get("/home", (req, res) => {
//     res.sendFile(__dirname + "/views/index2.html");

// })

app.get("/home",(req, res) => {
    console.log(req.decodedToken)
    res.render("home", {decodedToken: req.decodedToken})
})

app.get("/user/:id", (req, res) => {
    const id = req.params.id;
    console.log(id)
    Court.find({user_id: id})
        .then(result => 
            res.json(result))
})

// serve React when "/"
app.get('/booking', function (req,res) {
    res.sendFile(path + "index.html");
  });


// shoppping cart checkout 
app.post("/create-checkout-session", requireAuth, async (req,res) => {

    console.log("fetch successful")
    // console.log(req.body.items)
    items = req.body.items;
    console.log(req.decodedToken)
    decodedToken = req.decodedToken

    if (decodedToken === null){
         res.json({url:"http://localhost:8080/login"})
    } else {
        // if user is logged in
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
                payment_method_types: ['card','grabpay'],
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


app.post("/booking", checkUser, (req,res) => {
    console.log(req.decodedToken)
    // console.log(req.body)
    const searchCourt = req.body;
    Court.find(searchCourt)
        .then(result => {
            const bookedCourt = result
            // res.json(result)

            VenueInfo.find({venue: searchCourt.venue, sport: searchCourt.sport})
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
        items.forEach(item =>{
            item.court.user_id = decodedToken.id
            let court = new Court(item.court)
            court.save()
                .then(result => {
                    console.log(result)
                })
                .catch(err => console.log(err))
        })
    }

    response.status(200);
  });



// to check for user token
app.get('/check', checkUser,(req,res) => {
    // console.log(req.decodedToken)
    res.json(req.decodedToken)
})

// DISCOVER FEATUREe

app.get('/dashboard', requireAuth, (req, res, next) => {
    if (req.decodedToken == null){
        res.redirect("/login")
    }
    const id = req.decodedToken.id;
    let userEmail = '';
    User.findOne({_id: id})
        .then(user => {
            userEmail = user.email;
        })
    Court.find({user_id: id}, (err, docs) => {
        if(err){
            console.log(err);
        } else {

            VenueInfo.find()
                .then(result => {
                    const allVenue = result;
                    res.render('dashboard', {courts: docs, allVenue: allVenue, decodedToken: req.decodedToken, userEmail: userEmail})
                })
        }
    })
    
})



app.get('/createGame/:id', (req, res, next) => {
    const courtId= req.params.id;
    Court.findOne({_id: ObjectId(courtId)}, (err, data) => {
        if(err){
            console.log(err);
        } else {
            console.log(data);
            res.render('createGames', {courtId: req.params.id, data: data});
        }
    })
})

app.post('/createGame/:id', requireAuth, (req, res, next) => {
    //user id
    const id = req.decodedToken.id;
    //courts id
    const courtId = req.body.id;
    let result = courtId.trim();
    
    Court.findOne({_id: ObjectId(result)}, (err,docs) => {
        if(err){
            console.log(err);
        } else {
            User.findOne({_id: ObjectId(id)}, (err, data) => {
                if(err){
                    console.log(err);
                } else {
                    const newGame = new Game({
                        ownerId: data._id,
                        username: data.email,
                        eventName: req.body.eventName,
                        description: req.body.description,
                        sport: docs.sport,
                        date: docs.date,
                        timeStart: docs.timestart,
                        timeEnd: req.body.timeEnd,
                        venue: docs.venue,
                        court: docs.court,
                        currentPlayer: req.body.currentPlayer,
                        playerMax: req.body.playerMax,
                        courtId: result,
                        price: req.body.price,
                        paymentMethod: req.body.paymentMethod,
                        playerIdJoin: []
                    })
                    newGame.save();
                    res.redirect('/home');
                }
            })
            
        }
    })
       //to update the court so that we know is shared
       Court.findOneAndUpdate(
        {_id: ObjectId(result)},
        {share: true},
        (err, docs) => {
            if(err){
                console.log(err);
            } else {
                console.log(docs);
            }

    })
})

app.get('/discover', checkUser, (req, res, next) => {
    if (req.user == null){
        var user = '';
    } else {
        var user = req.user._id;
    }
    Game.find()
        .then((result) => {
            res.render('discover', {games: result, userId: user,decodedToken: req.decodedToken});
        })
        .catch((err) => {
            console.log(err);
        })
 })


//the id is Game objectId
app.get('/join/:id', requireAuth, (req, res, next) => {
    if (req.decodedToken == null){
        res.redirect("/login")
    }
    res.render('join', {courtId: req.params.id, });
    
})

app.post('/join/:id', requireAuth, (req, res, next) => {
    const userId = req.decodedToken.id;
    const courtId= req.body.id;
    let result = courtId.trim();
    
    const newJoin = new Join({
        joinName: req.body.name,
        joinContact: req.body.contact, 
        joinId: userId,
        oriId: result,
    })

    newJoin.save()
    Game.findOneAndUpdate(
        {_id: ObjectId(result)} ,
        { $push: { playerIdJoin: userId} },
        {useFindAndModify: false},
        function (error, success) {
            if (error) {
                console.log(error);
                console.log(courtId);
            } else {
                console.log(success);
            }
        
        })
    
        Game.findOneAndUpdate(
            {_id: ObjectId(result)} ,
            { $inc: { currentPlayer: 1 }},
            {useFindAndModify: false},
            function (error, success) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(success);
                }
            
            })

    res.redirect('/');
})

app.get('/game', requireAuth,(req, res) => {
    if (req.decodedToken == null){
        res.redirect("/login")
    }
    const id = req.decodedToken.id;
    Game.find({playerIdJoin: id}, (err, docs) => {
        if(err){
            console.log(err);
        } else {
            res.render('game', {courts: docs,decodedToken: req.decodedToken})
        }
    })
})

app.get('/court', (req, res, next) => {
    if (req.decodedToken == null){
        res.redirect("/login")
    }
    res.render('court',{decodedToken: req.decodedToken});
})

app.post('/court', requireAuth, (req, res, next) => {

    const id = req.decodedToken.id;
    const newCourt = new Court({
        user_id: id,
        court: req.body.court,
        sport: req.body.sport,
        venue: req.body.venue,
        date: req.body.date,
        timestart: req.body.timeStart
    })
    newCourt.save();
    res.redirect('/');
})

app.get('/detail/:id', (req, res, next) => {
    if (req.decodedToken == null){
        res.redirect("/login")
    }
    const courtId= req.params.id;
    Game.findOne({courtId: courtId}, (err, data) => {
        if(err) {
            console.log(err);
        } else {
            console.log(req.params.id + 'hi');
            Join.find({oriId: data._id}, (err, user) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(data);
                    res.render('detail', {data: data, users: user,decodedToken: req.decodedToken});
                }
            }
        )}
    })

})

app.get('/info/:id', (req, res, next) => {
    const courtId= req.params.id;
    const result = courtId.trim();
    Game.findOne({_id: ObjectId(result)}, (err,docs) => {
        if(err){
            console.log(err);
        } else {
            res.render('info', {data: docs, id: result, decodedToken: req.decodedToken})
        }
    })

})
  app.use(authRoutes);
