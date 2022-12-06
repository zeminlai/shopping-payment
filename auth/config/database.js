const mongoose = require('mongoose');
const { isemail } = require('validator');
const { default: isEmail } = require('validator/lib/isEmail');
const bcrypt = require('bcrypt');

require('dotenv').config();

const conn = process.env.MONGO_URL;

const connection = mongoose.createConnection(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Creates simple schema for a User.  The hash and salt are derived from the user's given password when they register
const UserSchema = new mongoose.Schema({
    email: {
        type: String, 
        required: [true, 'Please enter a email'], 
        unique: true,
        lowercase: true,
        validate: [isEmail, 'Please enter a valid email']
    }, 
    password: {
        type: String,
        required: [true, 'Please enter a password'], 
        minlength: [6, 'Minimum password length is 6 characters']
    }
});

// hashed the password
UserSchema.pre('save', async function(next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

UserSchema.statics.login = async function(email, password) {

    const user = await this.findOne({ email: email });
    if (user) {
      const auth = await bcrypt.compare(password, user.password);
      if (auth) {
        return user;
      }
      throw Error('incorrect password');
    }
    throw Error('incorrect email');
};

const User = connection.model('User', UserSchema);



// Expose the connection
module.exports = User;
