// main function for activity spam checker
//
// Copyright 2011, 2012 StatusNet Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var connect = require('connect'),
    auth = require('connect-auth'),
    databank = require('databank'),
    Databank = databank.Databank,
    DatabankObject = databank.DatabankObject,
    NoSuchThingError = databank.NoSuchThingError,
    config = require('./config'),
    Tokenizer = require('./lib/tokenizer').Tokenizer,
    SpamFilter = require('./lib/spamfilter').SpamFilter,
    Provider = require('./lib/provider').Provider,
    _ = require('underscore'),
    express = require('express'),
    web = require('./routes/web'),
    api = require('./routes/api'),
    User = require('./models/user').User,
    params, server, db;

params = config.params;

if (!_(params).has('schema')) {
    params.schema = {};
}

_.extend(params.schema, SpamFilter.schema);
_.extend(params.schema, Provider.schema);
_.extend(params.schema, User.schema);

db = Databank.get(config.driver, params);

var app = module.exports = express.createServer(
    auth([auth.Oauth({oauth_provider: new Provider(db),
                      authenticate_provider: null,
                      authorize_provider: null,
                      authorization_finished_provider: null
                     })])
);

// Configuration

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'utml');
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.session({ secret: (_(config).has('sessionSecret')) ? config.sessionSecret : "insecure" }));
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(function(req, res, next) { 
	res.local('site', (config.site) ? config.site : "ActivitySpam");
	next();
    });
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

// Routes

var sessionUser = function(req, res, next) {
    res.local('user', null);
    req.user = null;
    if (!_(req.session).has('email')) {
        next();
    } else {
        User.get(req.session.email, function(err, user) {
            if (!err) {
                res.local('user', user);
                req.user = user;
            }
            next();
        });
    }
};

var notLoggedIn = function(req, res, next) {
    if (req.user) {
        next(new Error("Must not be logged in."));
    } else {
        next();
    }
};

var loggedIn = function(req, res, next) {
    if (!req.user) {
        next(new Error("Must be logged in."));
    } else {
        next();
    }
};

var webSite = [
    express.cookieParser(),
    express.session({ secret: (_(config).has('sessionSecret')) ? config.sessionSecret : "insecure" }),
    express.methodOverride(),
    sessionUser
];

app.get('/', webSite, web.index);
app.get('/api', webSite, web.api);

app.get('/login', webSite, notLoggedIn, web.loginForm);
app.post('/login', webSite, notLoggedIn, web.login);

app.get('/register', webSite, notLoggedIn, web.registerForm);
app.post('/register', webSite, notLoggedIn, web.register);

app.get('/logout', webSite, loggedIn, web.logout);

app.get('/apps', webSite, loggedIn, web.apps);
app.post('/app/add', webSite, loggedIn, web.addApp);
app.post('/app/remove', webSite, loggedIn, web.removeApp);
app.post('/app/edit', webSite, loggedIn, web.editApp);

app.post('/is-this-spam', api.isThisSpam);
app.post('/this-is-spam', api.thisIsSpam);
app.post('/this-is-ham', api.thisIsHam);
app.post('/tokenize', api.testTokenize);

// Set the tokenizer options

var i, opt, opts = ["useDigrams", "usePrefixes", "useBare", "useArrayLength"];

for (i in opts) {
    opt = opts[i];
    if (config.hasOwnProperty(opt)) {
        Tokenizer[opt] = config[opt];
    }
}

db.connect({}, function(err) {
    if (err) {
        console.error(err);
    } else {

        SpamFilter.db = db;
        DatabankObject.bank = db;

        app.on('listening', function() {
            // Drop privs if needed
            process.setuid(config.serverUser);
        });

        app.listen(config.port || process.env.PORT || 8001);
    }
});
