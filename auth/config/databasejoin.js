const mongoose = require('mongoose');
const moongoose = require('moongoose');

require('dotenv').config();

const conn = process.env.MONGO_URL;

const connection = mongoose.createConnection(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const JoinSchema = new mongoose.Schema({
    joinName: String,
    joinContact: String, 
    joinId: String,
    oriId: String
})
const Join = connection.model('Join', JoinSchema);

module.exports = Join;