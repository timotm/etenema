var express = require('express')
var logger = require('morgan');
var bodyParser = require('body-parser')
var Promise = require('bluebird')
var request = Promise.promisifyAll(require('request'))
var util = require('util')
var passport = require('passport')
var StravaStrategy = require('passport-strava').Strategy
var pg = require('pg')
var session = require('express-session')
var pgSession = require('connect-pg-simple')(session)
var _ = require('lodash')

var dbString = process.env.DATABASE_URL || "postgres://localhost/etenema"

passport.use(new StravaStrategy(
  {
    clientID: '3004',
    clientSecret: process.env.KLIENT_SEKRET,
    callbackURL: 'http://etenema.herokuapp.com/auth/strava/callback', //callbackURL: 'http://localhost:8999/auth/strava/callback',
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    req.session.accessToken = accessToken
    util.log("accessToken " + util.inspect(accessToken))
    util.log("refreshToken " + util.inspect(refreshToken))
    util.log("profile " + util.inspect(profile))
    done(null, profile)
  }
))

passport.serializeUser(function(user, done) {
  util.log('serializeUser ' + util.inspect(user))
  done(null, user.id)
})

var app = express()
app.use(logger())
app.use(express.static(__dirname + '/www'))
app.use(bodyParser.json())
app.use(passport.initialize())
app.use(session({
    store: new pgSession({
	pg : pg,
	conString : dbString
    }),
    secret: process.env.SESSION_SEKRET,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}))

app.get('/auth/strava', passport.authenticate('strava'))
app.get('/auth/strava/callback',
	passport.authenticate('strava', { scope: 'view_private',
                                          successRedirect: '/',
                                          failureRedirect: '/login' }))

app.get('/rest/user', function(req, res) {
  res.status(req.session.accessToken ? 204 : 401).end()
})

app.get('/rest/runs/:page', function(req, res) {
  var page = parseInt(req.params.page || 1, 10)
  util.log('/rest/runs/' + page)
  request.getAsync("https://www.strava.com/api/v3/athlete/activities?per_page=100&page=" + page, {json: true, auth: { 'bearer': req.session.accessToken } })
    .get(1).then(function(body) {
      var resp = _.pluck(_.filter(body, {'type': 'Run'}), 'id')
      util.log('runs: ' + util.inspect(resp))
      res.status(200).send(resp)
    })
    .catch(function(e) { util.log('act.err: ' + e) })
})

app.get('/rest/laps/:lap_id', function(req, res) {
  var id = parseInt(req.params.lap_id, 10)
  util.log('id = ' + id + ' (' + req.params.lap_id + ')')
  request.getAsync("https://www.strava.com/api/v3/activities/" + id + "/laps", {json: true, auth: { 'bearer': req.session.accessToken } })
    .get(1).then(function(body) {
      var resp = _.map(body, function(lap) {
        return { start_time: Math.ceil((Date.parse(lap.start_date_local) - Date.now()) / (1000 * 60 * 60 * 24)) , elapsed_time: lap.elapsed_time / 60.0, distance: lap.distance, average_heartrate: lap.average_heartrate }
      })
      util.log('laps: ' + util.inspect(resp))
      res.status(200).send(resp)
    })
    .catch(function(e) { util.log('act.err: ' + e) })
})

var server = app.listen(process.env.PORT || 8999, function() {
    util.log('Listening on port ' + server.address().port)
})
