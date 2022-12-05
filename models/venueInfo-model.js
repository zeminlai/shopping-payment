const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const venueSchema = new Schema({
    venue: {
        type: String,
        required: true
    },
    max_courts: {
        type: Number,
        required: true
    },
    sport: {
        type: String,
        required: true
    }
}, {timestamps: true})

const VenueInfo = mongoose.model("info", venueSchema);
module.exports = VenueInfo;