const jwt = require('jsonwebtoken');
const User = require("../config/database");

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  // check json web token exists & is verified
  if (token) {
    jwt.verify(token, 'secret', (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect('/login');
      } else {
        req.decodedToken = decodedToken
        next();
      }
    });
  } else {
    console.log("not yet login")
    next()
  }
};

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, 'secret', async (err, decodedToken) => {
      if (err) {
        req.user = null;
        req.decodedToken = null
        console.log(err.message);
        next()
      } else {
        let user = await User.findById(decodedToken.id);
        req.user = user;
        req.decodedToken = decodedToken
        next();
      }
    });
  } else {
    req.user = null;
    req.decodedToken = null;
    console.log("not yet login")
    next()
  }
}

module.exports = { requireAuth, checkUser };