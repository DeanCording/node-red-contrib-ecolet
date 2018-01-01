/*****

node-red-contrib-ecolect - A Node Red node to process natural language using Ecolect

(https://www.npmjs.com/package/ecolect)

MIT License

Copyright (c) 2018 Dean Cording

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Core dependency
const ecolect = require('ecolect');

const en = require('ecolect/language/en');
const any = require('ecolect/values/any');
const boolean = require('ecolect/values/boolean');
const integer = require('ecolect/values/integer');
const number = require('ecolect/values/number');
//const ordinal = require('ecolect/values/ordinal');
const enumeration = require('ecolect/values/enumeration');
const date = require('ecolect/values/date');
//const time = require('ecolect/values/time');
const datetime = require('ecolect/values/datetime');
const temperature = require('ecolect/values/temperature');


const util = require('util');



module.exports = function(RED) {
    function EcolectNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        node.topics = config.topics || [];
        node.outputs = [];

        var builder = ecolect.intents(en);

        var trainingDocuments = [];

        node.topics.forEach(function(topic) {
            var intent = builder.intent(topic.name);

            // Add values to extract
            // builder.value(id, type);


            topic.values.forEach(function(value) {

                switch (value.type) {
                    case "text":
                        intent.value(value.name, any());
                        break;
                    case "boolean":
                        intent.value(value.name, boolean());
                        break;
                    case "integer":
                        intent.value(value.name, integer());
                        break;
                    case "number":
                        intent.value(value.name, number());
                        break;
//                    case "ordinal":
//                        intent.value(value.name, ordinal());
//                        break;
//                    case "enumeration":
//                        intent.value(value.name, enumeration());
//                        break;
                    case "date":
                        intent.value(value.name, date());
                        break;
//                    case "time":
//                        intent.value(value.name, time());
//                        break;
                    case "datetime":
                        intent.value(value.name, datetime());
                        break;
                    case "temperature":
                        intent.value(value.name, temperature());
                        break;
                }
            });


            topic.phrases.split("\n").forEach(function (phrase) {
                if (phrase.trim().length > 1)
                    intent.add(phrase.trim());
                });
            intent.done();
            node.outputs.push(topic.name);
        });

        node.intents = builder.build();

        var action = function(context, request, response, next) {

            var msg = request.id;
            var msgs = new Array(node.outputs.length);

            if (request.skill.current.name == 'recognised') {
                msg.topic = request.skill.current.topic.name;
                msg.confidence = request.skill.current.topic.confidence;
            } else {
                msg.topic = 'unknown';
            }

            msgs[node.outputs.findIndex(function (output) { return output == msg.topic})] = msg;
            node.send(msgs);
            next();
        };


        node.on('input', function(msg) {

            node.intents.match(msg.payload).then(results => {

node.log(util.inspect(results, {colors: true, depth: null}));

                if (results.best) {
                    msg.topic = results.best.intent;
                    msg.values = results.best.values;
		    msg.score = results.best.score;
                } else {
                    msg.topic = "unrecognised";
                }

                node.send(msg);
            });

        });
    }
    RED.nodes.registerType("ecolect",EcolectNode);
}

