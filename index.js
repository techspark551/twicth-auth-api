// Define our dependencies
require('dotenv').config();
var express        = require('express');
var session        = require('express-session');
var passport       = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request        = require('request');
var handlebars     = require('handlebars');
const cron = require('node-cron');
const cors = require('cors')
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

// Define our constants, you will change these with your own

// access token : phogw28vccisnjhyq1w46od8ppz527
// Refresh Token : 	2qrkgj0l81j1a26fqytoateut4qiigfy9g5axfwdyq2mpaob2g
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_SECRET    = process.env.TWITCH_SECRET;
const SESSION_SECRET   = process.env.SESSION_SECRET;
const CALLBACK_URL     = process.env.CALLBACK_URL;  // You can run locally with - http://localhost:3000/auth/twitch/callback

// Initialize Express and middlewares
app.use(cors())
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});

    done(null, profile);
  }
));

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

// Define a simple template to safely generate HTML with values from user's profile

// var template = handlebars.compile(`
// <html><head><title>Twitch Auth Sample</title></head>
// <table>
//     <tr><th>Access Token</th><td>{{accessToken}}</td></tr>
//     <tr><th>Refresh Token</th><td>{{refreshToken}}</td></tr>
//     <tr><th>Display Name</th><td>{{display_name}}</td></tr>
//     <tr><th>Bio</th><td>{{bio}}</td></tr>
//     <tr><th>Image</th><td>{{logo}}</td></tr>
// </table></html>`);

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    const authData = req.session.passport.user;
    fs.writeFile('authToken.txt', JSON.stringify(authData), (err) => {
      if (err) return console.log(err);      
    });
    res.redirect('https://shopifyrebellion.gg/?_ab=0&_fd=0&_sc=1');
    // res.send({ message : 'success',data : req.session.passport.user})
    // res.send(template(req.session.passport.user));
  } else {
    res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
  }
});

app.get('/getAuth', (req,res) => {
  try {
    fs.readFile('authToken.txt', 'utf8', (err,data) => {
      res.status(200).json({message : 'success',clientID : TWITCH_CLIENT_ID, SecretKey : TWITCH_SECRET ,data : data})
    })
  } catch (err) {
    res.status(401).json({message : 'error', data : err })
  }
});

app.listen(port, function () {
  console.log(`Twitch auth sample listening on port ${port} !`)
});




