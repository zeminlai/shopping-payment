const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courtSchema = new Schema({
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
    }
}, {timestamps: true})

const Court = mongoose.model("court", courtSchema);
module.exports = Court;