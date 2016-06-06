var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var fortune = require('./lib/fortune.js');

var app = express();

var config = require('./config.js');

var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: {
    section: function (name, options) {
      if (!this._sections) {
        this._sections = {};
      }
      this._sections[name] = options.fn(this);
      return null;
    }
  }
});

app.engine('handlebars', handlebars.engine);

app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

switch(app.get('env')){
  case 'development':
    app.use(require('morgan')('dev'));
    break;
  case 'production':
    app.use(require('express-logger')({ path: __dirname + '/log/requests.log'}));
    break;
}

app.use(require('cookie-parser')(config.cookieSecret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: config.cookieSecret,
}));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser());

var mongoose = require('mongoose');

switch(app.get('env')) {
  case 'development':
    mongoose.connect(config.mongo.development.connectionString);
    break;
  case 'production':
    mongoose.connect(config.mongo.production.connectionString);
    break;
  default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
}

Vacation = require('./models/vacation.js');

app.use(function (req, res, next) {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use(function (req, res, next) {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
});

function getWeatherData(){
  return {
    locations: [
      {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)',
      },
      {
        name: 'Bend',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)',
      },
      {
        name: 'Manzanita',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Light Rain',
        temp: '55.0 F (12.8 C)',
      },
    ],
  };
};

app.use(function (req, res, next) {
  if (!res.locals.partials) {
    res.locals.partials = {};
  }
  res.locals.partials.weathers = getWeatherData();
  next();
});

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/about', function (req, res) {
  res.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js'
  });
});

app.get('/tours/request-group-rate', function (req, res) {
  res.render('tours/request-group-rate');
});

app.get('/jquery-test', function(req, res){
  res.render('jquery-test');
});

app.get('/nursery-rhyme', function (req, res) {
  res.render('nursery-rhyme');
});

app.get('/data/nursery-rhyme', function (req, res) {
  res.json({
    animal: 'squirrel',
    bodyPart: 'tail',
    adjective: 'bushy',
    noun: 'heck'
  });
});

app.get('/newsletter', function (req, res) {
  res.render('newsletter', {csrf: 'CSRF token goes here'});
});

function NewsletterSignup () {

};

NewsletterSignup.prototype.save = function (callback) {
  callback();
};


var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', function(req, res){
  var name = req.body.name || '', email = req.body.email || '';

  if(!email.match(VALID_EMAIL_REGEX)) {
    if(req.xhr) return res.json({ error: 'Invalid name email address.' });
    req.session.flash = {
      type: 'danger',
      intro: 'Validation error!',
      message: 'The email address you entered was  not valid.',
    };
    return res.redirect(303, '/newsletter/archive');
  }
  new NewsletterSignup({ name: name, email: email }).save(function(err){
    if(err) {
      if(req.xhr) return res.json({ error: 'Database error.' });
      req.session.flash = {
        type: 'danger',
        intro: 'Database error!',
        message: 'There was a database error; please try again later.',
      };
      return res.redirect(303, '/newsletter/archive');
    }
    if(req.xhr) return res.json({ success: true });
    req.session.flash = {
      type: 'success',
      intro: 'Thank you!',
      message: 'You have now been signed up for the newsletter.',
    };
    return res.redirect(303, '/newsletter/archive');
  });
});

app.get('/newsletter/archive', function(req, res){
  res.render('newsletter/archive');
});

app.post('/process', function (req, res) {
  if (req.xhr || req.accepts('json, html') === 'json') {
    res.send({success: true});
  }
  else {
    res.redirect(303, '/thank-you');
  }
});

app.get('/thank-you', function (req, res) {
  res.render('thank-you');
});

app.get('/contest/vacation-photo', function (req, res) {
  var now = new Date();
  res.render('contest/vacation-photo', {year: now.getFullYear(), month: now.getMonth()});
});

app.post('/contest/vacation-photo/:year/:month', function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if (err) {
      return res.redirect(303, '/error');
    }
    console.log('received fields:');
    console.log(fields);
    console.log('received files:');
    console.log(files);
    res.redirect(303, '/thank-you');
  })
});

app.get('/vacation/:vacation', function(req, res, next){
  Vacation.findOne({ slug: req.params.vacation }, function(err, vacation){
    if(err) return next(err);
    if(!vacation) return next();
    res.render('vacation', { vacation: vacation });
  });
});

function convertFromUSD(value, currency){
  switch(currency){
    case 'USD': return value * 1;
    case 'GBP': return value * 0.6;
    default: return NaN;
  }
}

app.get('/vacations', function(req, res){
  Vacation.find({ available: true }, function(err, vacations){
    var currency = req.session.currency || 'USD';
    var context = {
      currency: currency,
      vacations: vacations.map(function(vacation){
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          inSeason: vacation.inSeason,
          price: convertFromUSD(vacation.priceInCents / 100, currency),
          qty: vacation.qty,
        };
      })
    };
    switch(currency){
      case 'USD': context.currencyUSD = 'selected'; break;
      case 'GBP': context.currencyGBP = 'selected'; break;
    }
    res.render('vacations', context);
  });
});

var cartValidation = require('./lib/cartValidation.js');

app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

app.get('/cart/add', function(req, res, next){
  var cart = req.session.cart || (req.session.cart = { items: [] });
  Vacation.findOne({ sku: req.query.sku }, function(err, vacation){
    if(err) return next(err);
    if(!vacation) return next(new Error('Unknown vacation SKU: ' + req.query.sku));
    cart.items.push({
      vacation: vacation,
      guests: req.body.guests || 1,
    });
    res.redirect(303, '/cart');
  });
});

app.post('/cart/add', function(req, res, next){
  var cart = req.session.cart || (req.session.cart = { items: [] });
  Vacation.findOne({ sku: req.body.sku }, function(err, vacation){
    if(err) return next(err);
    if(!vacation) return next(new Error('Unknown vacation SKU: ' + req.body.sku));
    cart.items.push({
      vacation: vacation,
      guests: req.body.guests || 1,
    });
    res.redirect(303, '/cart');
  });
});

app.get('/cart', function(req, res){
  var cart = req.session.cart || (req.session.cart = []);
  res.render('cart', { cart: cart });
});

app.get('/notify-me-when-in-season', function(req, res){
  res.render('notify-me-when-in-season', { sku: req.query.sku });
});

app.post('/notify-me-when-in-season', function(req, res){
  VacationInSeasonListener.update(
    { email: req.body.email },
    { $push: { skus: req.body.sku } },
    { upsert: true },
    function(err){
      if(err) {
        console.error(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Ooops!',
          message: 'There was an error processing your request.',
        };
        return res.redirect(303, '/vacations');
      }
      req.session.flash = {
        type: 'success',
        intro: 'Thank you!',
        message: 'You will be notified when this vacation is in season.',
      };
      return res.redirect(303, '/vacations');
    }
  );
});

app.get('/set-currency/:currency', function(req,res){
  req.session.currency = req.params.currency;
  return res.redirect(303, '/vacations');
});

app.use(function (req, res) {
  res.status(404);
  res.render('404');
});

app.use(function (err, req, res, next) {
  console.log(err.stack);
  res.status(500);
  res.render('500');
});

function startServer() {
  http.createServer(app).listen(app.get('port'), function () {
    console.log('Express started in ' + app.get('env') +
      ' mode on http://localhost:' + app.get('port') +
      '; press Ctrl-C to terminate.')
  });
}

if (require.main == module) {
  startServer();
} else {
  module.exports = startServer;
}