var express = require('express');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var fortune = require('./lib/fortune.js');

var app = express();

var credentials = require('./credentials.js');

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

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
}));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser());

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

function Product(){
}
Product.find = function(conditions, fields, options, cb){
  if(typeof conditions==='function') {
    cb = conditions;
    conditions = {};
    fields = null;
    options = {};
  } else if(typeof fields==='function') {
    cb = fields;
    fields = null;
    options = {};
  } else if(typeof options==='function') {
    cb = options;
    options = {};
  }
  var products = [
    {
      name: 'Hood River Tour',
      slug: 'hood-river',
      category: 'tour',
      maximumGuests: 15,
      sku: 723,
    },
    {
      name: 'Oregon Coast Tour',
      slug: 'oregon-coast',
      category: 'tour',
      maximumGuests: 10,
      sku: 446,
    },
    {
      name: 'Rock Climbing in Bend',
      slug: 'rock-climbing/bend',
      category: 'adventure',
      requiresWaiver: true,
      maximumGuests: 4,
      sku: 944,
    }
  ];
  cb(null, products.filter(function(p) {
    if(conditions.category && p.category!==conditions.category) return false;
    if(conditions.slug && p.slug!==conditions.slug) return false;
    if(isFinite(conditions.sku) && p.sku!==Number(conditions.sku)) return false;
    return true;
  }));
};
Product.findOne = function(conditions, fields, options, cb){
  if(typeof conditions==='function') {
    cb = conditions;
    conditions = {};
    fields = null;
    options = {};
  } else if(typeof fields==='function') {
    cb = fields;
    fields = null;
    options = {};
  } else if(typeof options==='function') {
    cb = options;
    options = {};
  }
  Product.find(conditions, fields, options, function(err, products){
    cb(err, products && products.length ? products[0] : null);
  });
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

app.get('/tours/:tour', function(req, res, next){
  Product.findOne({ category: 'tour', slug: req.params.tour }, function(err, tour){
    if(err) return next(err);
    if(!tour) return next();
    res.render('tour', { tour: tour });
  });
});

app.get('/adventures/:subcat/:name', function(req, res, next){
  Product.findOne({ category: 'adventure', slug: req.params.subcat + '/' + req.params.name  }, function(err, adventure){
    if(err) return next(err);
    if(!adventure) return next();
    res.render('adventure', { adventure: adventure });
  });
});

var cartValidation = require('./lib/cartValidation.js');

app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

app.post('/cart/add', function(req, res, next){
  var cart = req.session.cart || (req.session.cart = []);
  Product.findOne({ sku: req.body.sku }, function(err, product){
    if(err) return next(err);
    if(!product) return next(new Error('Unknown product SKU: ' + req.body.sku));
    cart.push({
      product: product,
      guests: req.body.guests || 0,
    });
    res.redirect(303, '/cart');
  });
});

app.get('/cart', function(req, res){
  var cart = req.session.cart || (req.session.cart = []);
  res.render('cart', { cart: cart });
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

app.listen(app.get('port'), function () {
  console.log('Exress started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});