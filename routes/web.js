// Web UI for activity spam checker
//
// Copyright 2012 StatusNet Inc.
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

var config = require('../config'),
    _ = require('underscore'),
    User = require('../models/user').User,
    NoSuchThingError = require('databank').NoSuchThingError,
    Tokenizer = require('../lib/tokenizer').Tokenizer,
    SpamFilter = require('../lib/spamfilter').SpamFilter;

exports.index = function(req, res, next) {
    res.render('index', { title: 'Home' });
};

exports.api = function(req, res, next) {
    res.render('api', { title: 'API' });
};

exports.loginForm = function(req, res, next) {
    res.render('login', { title: 'Login', 
                          error: null });
};

exports.registerForm = function(req, res, next) {
    res.render('register', { title: 'Register', 
                             error: null });
};

exports.login = function(req, res, next) {

    var user, email, password,
        showError = function(message) {
            res.render('login', { title: 'Login',
                                  error: message });
        };

    if (!_(req.body).has('email')) {
        showError("No email.");
        return;
    }

    email = req.body.email;

    if (!_(req.body).has('password')) {
        showError("No password.");
        return;
    }

    password = req.body.password;

    User.get(email, function(err, user) {
        if (err) {
            showError("Incorrect email or password.");
            return;
        }

        user.checkPassword(password, function(err, match) {
            if (!match) {
                showError("Incorrect email or password.");
                return;
            }
            req.session.email = email;
            res.redirect('/apps', 303);
        });
    });
};

exports.register = function(req, res, next) {
    var user, email, password,
        showError = function(message) {
            res.render('register', { title: 'Register',
                                     error: message });
        };

    if (!_(req.body).has('email')) {
        showError("No email.");
        return;
    }

    email = req.body.email;

    if (!_(req.body).has('password')) {
        showError("No password.");
        return;
    }

    password = req.body.password;

    if (!_(req.body).has('confirm')) {
        showError("No password confirmation.");
        return;
    }

    confirm = req.body.confirm;

    if (confirm !== password) {
        showError("Passwords don't match.");
        return;
    }

    User.get(email, function(err, old) {
        var newUser;
        if (old) {
            showError("User already exists");
            return;
        }
        newUser = {email: email,
                   password: password};
        User.create(newUser, function(err, user) {
            req.session.email = email;
            res.redirect('/apps', 303);
        });
    });
};

exports.logout = function(req, res, next) {
    req.session.email = null;
    res.redirect('/', 302);
};

exports.apps = function(req, res, next) {
    req.user.getApps(function(err, apps) {
        if (err) {
            next(err);
            return;
        }
        res.render('apps', { title: 'Apps', 
                             apps: apps });
    });
};
