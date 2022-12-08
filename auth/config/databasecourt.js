const mongoose = require('mongoose');


require('dotenv').config();

const conn = process.env.MONGO_URL;

const connection = mongoose.createConnection(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const Schema = mongoose.Schema;

const CourtSchema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    court: {
        type: Number,
        required: true
    },
    sport: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    timestart: {
        type: String,
        required: true
    },
    share: {
        type: Boolean
    },
    shareGameId: {
        type: String
    }
}, {timestamps: true})

const Court = connection.model("Court", CourtSchema);
module.exports = Court;