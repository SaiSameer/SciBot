'use strict'

var { DatabaseManager } = require('./DatabaseManager');
var { OutputMessage } = require('./OutputMessage');
var { config } = require('./config');

/**
 * Parser Engine for the bot
 */
class ParserEngine {
    constructor() {
        this.setDefaultMessage();
    }

    // Method to set the default message
    setDefaultMessage() {
        if (this.output_message == null || this.output_message == undefined)
            this.output_message = {
                message: "Sorry! I didn't get that.",
                messageType: config.messageType.Reply,
                conversationCallback: undefined
            };
    }

    // Method to parse the incoming message
    parse(message, bot) {
        this.output_message = null;
        var resolved = false;

        //signoff - usecase1
        if (!resolved && this.messageForSignOff(message, bot))
            resolved = true;
        //daily status - usecase1
        //if (!resolved && this.checkDailyStatus(message))
        //resolved = true;
        //daily status - usecase1
        //if (!resolved && this.updateStatus(message))
        //resolved = true;
        //daily status reply - usecase1
        if (!resolved && this.addUpdateStatus(message))
            resolved = true;
        //generate reports - usecase2
        if (!resolved && this.checkIfReportToBeGenerated(message))
            resolved = true;

        // TODO: create other rules here

        this.setDefaultMessage();

        return this.output_message;
    }

    messageForSignOff(message, bot) {
        //  var obj = new RegExp('report', 'i');
        var action = new RegExp('sign in|signing in', 'i');

        if (action.test(message)) {
            // Question for status
            var callback = function (err, con) {
                con.addQuestion('Have you updated your daily status?', [
                    {
                        pattern: 'yes updated',
                        callback: function (response, convo) {
                            convo.say('Okay, thank you! You may sign off.');
                            convo.next();
                        }
                    },
                    {
                        pattern: 'no not updated',
                        callback: function (response, convo) {
                            var msg = DatabaseManager.getScrumQuestions('all')
                            convo.say('Please update your daily status. ' + msg);
                            convo.next();
                        }
                    },
                    {
                        pattern: 'off|absent',
                        callback: function (response, convo) {
                            var msg = DatabaseManager.getScrumQuestions('today')
                            convo.say('Please update your daily status.' + msg);
                            convo.next();
                        }
                    },
                    {
                        default: true,
                        callback: function (response, convo) {
                            // just repeat the question
                            convo.repeat();
                            convo.next();
                        }
                    }
                ], {}, 'default');
            }

            this.output_message = new OutputMessage({
                message: '',
                messageType: config.messageType.Conversation,
                conversationCallback: callback
            });

            return true;
        }

        return false;
    }

    checkDailyStatus(message) {
        var obj = new RegExp('yes|no', 'i');
        var action1 = new RegExp('updated|not updated', 'i');
        var action2 = new RegExp('off|absent', 'i');

        if (obj.test(message) && action1.test(message)) {
            // Reply for status
            var yesReply = new RegExp('yes', 'i');
            this.output_message = yesReply.test(message) ? 'Okay, thank you! You may sign off.' : 'Please update your daily status.';

            return true;
        }
        if (obj.test(message) && action2.test(message)) {
            // Reply for absence of work
            var noReply = new RegExp('no', 'i');
            this.updateStatus('absent');
            return true;
        }

        return false;
    }

    updateStatus(message) {
        var action = new RegExp('add daily status', 'i');
        var action2 = new RegExp('off|absent', 'i');
        if (action.test(message)) {
            //Scrum Questions
            this.output_message = DatabaseManager.getScrumQuestions('all');
            return true;
        } else if (action2.test(message)) {
            //today alone
            this.output_message = DatabaseManager.getScrumQuestions('today');
            return true;
        }
        return false;
    }

    addUpdateStatus(message) {
        var obj = new RegExp('daily status', 'i');
        var action1 = new RegExp('Yesterday:', 'i');
        var action2 = new RegExp('Today:', 'i');
        var action3 = new RegExp('Obstacles:', 'i');

        if (obj.test(message) && action1.test(message) && action2.test(message) && action3.test(message)) {
            DatabaseManager.saveDailyStatus(message);
            this.output_message = 'Your daily status has been saved!';
            return true;
        } else if (action2.test(message)) {
            DatabaseManager.saveDailyStatus('Yesterday:Absent' + message + 'Obstacles:Absent');
            this.output_message = 'Your daily status has been saved!';
            return true;
        }
        return false;
    }

    
    //Method to generate the rpeort for a given sprint
    checkIfReportToBeGenerated(message) {
        var obj = new RegExp('report', 'i');
        var action = new RegExp('generate(d?)', 'i');
        var time = new RegExp('(current|this|previous) sprint', 'i');

        if (obj.test(message) && action.test(message) && time.test(message)) {
            // Report to be generated
            var currentSprint = new RegExp('(current|this) sprint', 'i');

            this.output_message = new OutputMessage({
                message: currentSprint.test(message) ? DatabaseManager.generateReport('current') : DatabaseManager.generateReport('previous'),
                messageType: config.messageType.Reply,
                conversationCallback: undefined
            });

            return true;
        }

        return false;
    }

    createPingEvent(message) {
        //ping user USERNAME at 1pm everyday
        //ping user USERNAME at 1pm on 1/11/17
        var obj = new RegExp('ping', 'i');
        var user = new RegExp('user (.*)? ', 'i');
        var time = new RegExp('at (.*)');

        if (obj.test(message) && user.test(message) && time.test(message)) {
            //parse day
            var day = new RegExp('tomorrow|today|everyday');
            var date = new RegExp('on (.*)');
            if (day.test(time)) {
                //ping user USERNAME at 1pm everyday|today|tomorrow
            }
            else if (date.test(time)) {
                //ping user USERNAME at 1pm on 11/11/17

            }
            else {
                this.output_message = "Not a valid request to ping";
                return false;
            }
            return true;
        }
        return false;
    }

}

module.exports.ParserEngine = ParserEngine;

