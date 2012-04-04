// postactivity.js
//
// Post an activity streams activity somewhere
//
// Copyright 2012, StatusNet Inc.
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

var fs = require('fs'),
    common = require('./common'),
    postActivity = common.postActivity,
    postReport = common.postReport;

if (process.argv.length != 4) {
    process.stderr.write("USAGE: node postactivity.js filename.json URL\n");
    process.exit(1);
}

var fileName = process.argv[2];
var serverUrl = process.argv[3];

fs.readFile(fileName, function (err, data) {
    var i, activity;

    if (err) {
	console.log("Error reading file: " + err);
	process.exit(1);
    }

    activity = JSON.parse(data);

    postActivity(serverUrl, activity, postReport(activity));
});

