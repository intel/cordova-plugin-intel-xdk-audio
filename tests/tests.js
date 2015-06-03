/*
Copyright 2015 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file 
except in compliance with the License. You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the 
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License
*/
/*global document, exports, describe, xdescribe, it, xit, jasmine, expect*/
/*global beforeEach, afterEach, intel, console, setTimeout*/

exports.defineAutoTests = function () {
    'use strict';
    
    describe('intel.xdk.audio.startRecording', function () {
        
        var TestSuite = {};
        
        TestSuite.listeners = [];
        
        TestSuite.listen = function (event, listener) {
            document.addEventListener(event, listener);
            TestSuite.listeners.push([event, listener]);
        };
        
        TestSuite.unexpectedEvent = function (evt) {
            expect(evt).toBeUndefined; // jshint ignore:line
        };
        
        TestSuite.JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        TestSuite.TEST_TIMEOUT = 20000;
        TestSuite.STATE = 0;
        
        beforeEach(function () {
            TestSuite.JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = TestSuite.TEST_TIMEOUT;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = TestSuite.JASMINE_TIMEOUT;
            
            TestSuite.listeners.forEach(function(listener){
                document.removeEventListener(listener[0], listener[1]);
            });
            
            TestSuite.listeners = [];
        });

        it('is defined', function() {
            expect(intel.xdk.audio.startRecording).toBeDefined();
        });

        it('records until it is stopped', function(done) {
            TestSuite.listen('intel.xdk.audio.record.start', function(evt){
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                intel.xdk.audio.stopRecording();
            });
            
            TestSuite.listen('intel.xdk.audio.record.stop',  function(evt){
                expect(evt).toBeDefined();
                expect(evt.name).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                done();
            });
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startRecording('amr_nb',1,1);
        });        
        
        it('adds a file to the recording list', function(done) {
            var numRecordings = intel.xdk.audio.getRecordingList().length;
            
            TestSuite.listen('intel.xdk.audio.record.start', function(evt){
                expect(TestSuite.STATE).toBe(1);
                expect(evt).toBeDefined();
                TestSuite.STATE = 2;
                setTimeout(function (){ intel.xdk.audio.stopRecording(); }, 200);
            });
            
            TestSuite.listen('intel.xdk.audio.record.stop',  function(evt){
                expect(TestSuite.STATE).toBe(2);
                expect(evt).toBeDefined();
                expect(evt.name).toBeDefined();
                expect(intel.xdk.audio.getRecordingList().length).toBe(numRecordings+1);
                expect(intel.xdk.audio.getRecordingList()).toContain(evt.name);
                done();
            });
            
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startRecording('amr_nb',1,1);
        });
        
        it('fires a record.busy event when a recording is already in progress', function(done) {
            TestSuite.listen('intel.xdk.audio.record.start', function (evt) {
                expect(TestSuite.STATE).toBe(1);
                expect(evt).toBeDefined();
                TestSuite.STATE = 2;
                intel.xdk.audio.startRecording('amr_nb',1,1);   // This one should get 'busy'
            });
            
            TestSuite.listen('intel.xdk.audio.record.busy',  function (evt) {
                expect(TestSuite.STATE).toBe(2);
                expect(evt).toBeDefined();
                TestSuite.STATE = 3;
                setTimeout(function(){ intel.xdk.audio.stopRecording(); }, 200);
            });
            
            TestSuite.listen('intel.xdk.audio.record.stop',  function (evt) {
                expect(evt).toBeDefined();
                expect(evt.name).toBeDefined();
                expect(TestSuite.STATE).toBe(3);
                done();
            });
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startRecording('amr_nb',1,1);       // This one should succeed
        });
        
        /** Not Working, unsupported */
        xit('can be paused and restarted', function(done) {
            
            function recordStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                setTimeout(function(){ intel.xdk.audio.pauseRecording(); }, 200);
            }
            
            function recordPause(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                TestSuite.STATE = 3;
                intel.xdk.audio.continueRecording();
            }
            
            function recordContinue(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(3);
                TestSuite.STATE = 4;
                setTimeout(function(){ intel.xdk.audio.stopRecording(); }, 200);
            }
            
            function recordStop(evt) {
                expect(evt).toBeDefined();
                expect(evt.name).toBeDefined();
                expect(TestSuite.STATE).toBe(4);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.record.start',    recordStart);
            TestSuite.listen('intel.xdk.audio.record.stop',     recordStop);
            TestSuite.listen('intel.xdk.audio.record.pause',    recordPause);
            TestSuite.listen('intel.xdk.audio.record.continue', recordContinue);
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startRecording('amr_nb',1,1);
        });
        
        /** Not Working, unsupported */
        xit('can be paused and stopped', function(done) {
            
            function recordStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                setTimeout(function(){ intel.xdk.audio.pauseRecording(); }, 200);
            }
            
            function recordPause(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                TestSuite.STATE = 3;
                intel.xdk.audio.stopRecording();
            }
            
            function recordStop(evt) {
                expect(evt).toBeDefined();
                expect(evt.name).toBeDefined();
                expect(TestSuite.STATE).toBe(3);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.record.start',    recordStart);
            TestSuite.listen('intel.xdk.audio.record.stop',     recordStop);
            TestSuite.listen('intel.xdk.audio.record.pause',    recordPause);
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startRecording('amr_nb',1,1);
            
        });
    });

    describe('The recording list', function() {

        var TestSuite = {};
        
        TestSuite.listeners = [];
        
        TestSuite.listen = function (event, listener) {
            document.addEventListener(event, listener);
            TestSuite.listeners.push([event, listener]);
        };
        
        TestSuite.unexpectedEvent = function (evt) {
            expect(evt).toBeUndefined; // jshint ignore:line
        };
        
        TestSuite.JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        TestSuite.TEST_TIMEOUT = 20000;
        TestSuite.STATE = 0;
        
        beforeEach(function () {
            TestSuite.JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = TestSuite.TEST_TIMEOUT;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = TestSuite.JASMINE_TIMEOUT;
            
            TestSuite.listeners.forEach(function(listener){
                document.removeEventListener(listener[0], listener[1]);
            });
            
            TestSuite.listeners = [];
        });

        it('is an array of recording filename strings', function() {
            expect(intel.xdk.audio.getRecordingList() instanceof Array).toBe(true);
        });

        it('can have recordings added to it', function(done) {
            
            var numRecordings = intel.xdk.audio.getRecordingList().length;
            var nr = numRecordings;
            
            function recordStart(evt) {
                setTimeout(function(){ intel.xdk.audio.stopRecording(); }, 100);
            }
            
            function recordStop(evt) {
                expect(intel.xdk.audio.getRecordingList().length).toBe(++numRecordings);
                expect(intel.xdk.audio.getRecordingList()).toContain(evt.name);
                if (numRecordings == nr + 3) {
                    done();
                }
                else {
                    intel.xdk.audio.startRecording('amr_nb',1,1);
                }
            }
            
            TestSuite.listen('intel.xdk.audio.record.start', recordStart);
            TestSuite.listen('intel.xdk.audio.record.stop',  recordStop);
            
            intel.xdk.audio.startRecording('amr_nb',1,1);
        });

        it('can have recordings removed from it', function(done) {
            
            var numRecordings = intel.xdk.audio.getRecordingList().length;
            var nr = numRecordings;
            var recording;
            
            function recordStart(evt) {
                setTimeout(function(){ intel.xdk.audio.stopRecording(); }, 100);
            }
            
            function recordStop(evt) {
                expect(intel.xdk.audio.getRecordingList().length).toBe(++numRecordings);
                expect(intel.xdk.audio.getRecordingList()).toContain(evt.name);
                if (numRecordings == nr + 3) {
                    removeRecordings();
                }
                else {
                    intel.xdk.audio.startRecording('amr_nb',1,1);
                }
            }
            
            function removeRecordings() {
                if (numRecordings == nr) {
                    done();
                }
                else {
                    recording = intel.xdk.audio.getRecordingList()[0];
                    intel.xdk.audio.deleteRecording(recording);
                }
            }
            
            function recordRemoved() {
                expect(intel.xdk.audio.getRecordingList().length).toBe(--numRecordings);
                expect(intel.xdk.audio.getRecordingList()).not.toContain(recording);
                removeRecordings();
            }
            
            TestSuite.listen('intel.xdk.audio.record.start',    recordStart);
            TestSuite.listen('intel.xdk.audio.record.stop',     recordStop);
            TestSuite.listen('intel.xdk.audio.record.removed',  recordRemoved);
            
            intel.xdk.audio.startRecording('amr_nb',1,1);
        });
        
        it('fires record.notRemoved if you try to remove a nonexistent recording', function(done) {
            function recordNotRemoved(evt) {
                expect(evt).toBeDefined();
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.record.notRemoved', recordNotRemoved);
            intel.xdk.audio.deleteRecording("The Best of Alvin and the Chipmunks");
        });

        it('can be emptied', function(done) {
            
            function recordStart(evt) {
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                setTimeout(function(){ intel.xdk.audio.stopRecording(); }, 200);
            }
            
            function recordStop(evt) {
                expect(TestSuite.STATE).toBe(2);
                expect(intel.xdk.audio.getRecordingList().length).not.toBe(0);
                TestSuite.STATE = 3;
                intel.xdk.audio.clearRecordings();
            }
            
            function recordClear(evt) {
                expect(TestSuite.STATE).toBe(3);
                expect(intel.xdk.audio.getRecordingList().length).toBe(0);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.record.start', recordStart);
            TestSuite.listen('intel.xdk.audio.record.stop',  recordStop);
            TestSuite.listen('intel.xdk.audio.record.clear', recordClear);
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startRecording('amr_nb',1,1);
        });
    });
    
    describe('The startPlaying method', function() {

        var TestSuite = {};
        
        TestSuite.listeners = [];
        
        TestSuite.listen = function (event, listener) {
            document.addEventListener(event, listener);
            TestSuite.listeners.push([event, listener]);
        };
        
        TestSuite.unexpectedEvent = function (evt) {
            expect(evt).toBeUndefined; // jshint ignore:line
        };
        
        TestSuite.JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        TestSuite.TEST_TIMEOUT = 20000;
        TestSuite.STATE = 0;
        TestSuite.RECORDING = null;
        
        beforeEach(function () {
            TestSuite.JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = TestSuite.TEST_TIMEOUT;
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = TestSuite.JASMINE_TIMEOUT;
            
            TestSuite.listeners.forEach(function(listener){
                document.removeEventListener(listener[0], listener[1]);
            });
            
            TestSuite.listeners = [];
        });

        it('is defined', function() {
            expect(intel.xdk.audio.startPlaying).toBeDefined();
        });

        it('needs a recording to play', function(done) {
            
            function recordStart(evt) {
                setTimeout(function(){ intel.xdk.audio.stopRecording(); }, 200);
            }
            
            function recordStop(evt) {
                TestSuite.RECORDING = intel.xdk.audio.getRecordingURL(evt.name);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.record.start', recordStart);
            TestSuite.listen('intel.xdk.audio.record.stop',  recordStop);
            
            intel.xdk.audio.startRecording('amr_nb',1,1);
            
        });

        it('fires a play.error event if it fails', function(done) {
            function playError(evt) {
                expect(evt).toBeDefined();
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.play.error', playError);
            
            intel.xdk.audio.startPlaying("The Best of Alvin and the Chipmunks");
        });

        it('fires a play.start and a play.stop event if it completes successfully', function(done) {
            
            function playStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
            }
            
            function playStop(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.play.start', playStart);
            TestSuite.listen('intel.xdk.audio.play.stop',  playStop);
            TestSuite.STATE = 1;
            
            intel.xdk.audio.startPlaying(TestSuite.RECORDING);
        });


        it('fires a play.busy event if the player is already active', function(done) {
            
             function playStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                intel.xdk.audio.startPlaying(TestSuite.RECORDING);
            }
            
            function playBusy(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                TestSuite.STATE = 3;
            }
            
            function playStop(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(3);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.play.start', playStart);
            TestSuite.listen('intel.xdk.audio.play.stop',  playStop);
            TestSuite.listen('intel.xdk.audio.play.busy',  playBusy);
            TestSuite.STATE = 1;
            
            intel.xdk.audio.startPlaying(TestSuite.RECORDING);
        });
        
        it('can be stopped before it completes', function(done) {
            
            function playStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                intel.xdk.audio.stopPlaying();
            }
            
            function playStop(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.play.start', playStart);
            TestSuite.listen('intel.xdk.audio.play.stop',  playStop);
            TestSuite.STATE = 1;
            
            intel.xdk.audio.startPlaying(TestSuite.RECORDING);
        });
        
        it('can be paused and continued', function(done) {
            
            function playStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                intel.xdk.audio.pausePlaying();
            }
            
            function playPause(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                TestSuite.STATE = 3;
                intel.xdk.audio.continuePlaying();
            }
            
            function playContinue(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(3);
                TestSuite.STATE = 4;
            }
            
            function playStop(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(4);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.play.start',    playStart);
            TestSuite.listen('intel.xdk.audio.play.pause',    playPause);
            TestSuite.listen('intel.xdk.audio.play.continue', playContinue);
            TestSuite.listen('intel.xdk.audio.play.stop',     playStop);
            
            TestSuite.STATE = 1;
            intel.xdk.audio.startPlaying(TestSuite.RECORDING);
        });
        
        it('can be paused and stopped', function(done) {
             function playStart(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(1);
                TestSuite.STATE = 2;
                intel.xdk.audio.pausePlaying();
            }
            
            function playPause(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(2);
                TestSuite.STATE = 3;
                intel.xdk.audio.stopPlaying();
            }
            
            function playStop(evt) {
                expect(evt).toBeDefined();
                expect(TestSuite.STATE).toBe(3);
                done();
            }
            
            TestSuite.listen('intel.xdk.audio.play.start',    playStart);
            TestSuite.listen('intel.xdk.audio.play.pause',    playPause);
            TestSuite.listen('intel.xdk.audio.play.stop',     playStop);
            TestSuite.STATE = 1;
            
            intel.xdk.audio.startPlaying(TestSuite.RECORDING);
        });
        
    });
};

exports.defineManualTests = function(contentEl, createActionButton) {

    var TestSuite = {};
    
    TestSuite.selectedRecording = null;
    
    TestSuite.$markup =
        '<fieldset>' + 
            '<legend>Record Buttons</legend>' +
        
            '<h3>Start Recording</h3>' +
            '<div id="buttonStartRecording"></div>' +
            'Expected result: should start recording sounds' + 

            '<h3>Stop Recording</h3>' +
            '<div id="buttonStopRecording"></div>' +
            'Expected result: should stop current recording' + 

            '<h3>Pause Recording</h3>' +
            '<div id="buttonPauseRecording"></div>' +
            'Expected result: should pause current recording' + 
        
            '<h3>Continue Recording</h3>' +
            '<div id="buttonContinueRecording"></div>' +
            'Expected result: should resume current recording' +
        
            '<h3>Add Sound</h3>' +
            '<div id="buttonAddSound"></div>' +
            'Expected result: not implemented yet' +
        '</fieldset>' +
    
        '<fieldset>' + 
            '<legend>Record List Buttons</legend>' +
            
            '<ul id="recordings"></ul>' +
      
            '<h3>Get Recording List</h3>' +
            '<div id="buttonGetRecordingList"></div>' +
            'Expected result: should display the list of recordings' +
      
            '<h3>Clear List</h3>' +
            '<div id="buttonClearList"></div>' +
            'Expected result: should remove all recordings from the list' +
        
            '<h3>Delete Recording</h3>' +
            '<div id="buttonDeleteRecording"></div>' +
            'Expected result: should delete the selected recording' +

            '<h3>Get URL</h3>' +
            '<div id="buttonGetRecordingUrl"></div>' +
            'Expected result: should display url for the selected recording' +
        '</fieldset>' +
      
        '<fieldset>' + 
            '<legend>Play Buttons</legend>' +
        
            '<h3>Start Playing</h3>' +
            '<div id="buttonStartPlaying"></div>' +
            'Expected result: call startPlaying()' + 

            '<h3>Stop Playing</h3>' +
            '<div id="buttonStopPlaying"></div>' +
            'Expected result: call stopPlaying()' + 

            '<h3>Pause Playing</h3>' +
            '<div id="buttonPausePlaying"></div>' +
            'Expected result: call pausePlaying()' + 
        
            '<h3>Continue Playing</h3>' +
            '<div id="buttonContinuePlaying"></div>' +
            'Expected result: call continuePlaying()' +
        '</fieldset>';

    contentEl.innerHTML = '<div id="info"></div>' + TestSuite.$markup;
    
    var logMessage = function (message, color) {
        var log = document.getElementById('info');
        var logLine = document.createElement('div');
        if (color) {
            logLine.style.color = color;
        }
        logLine.innerHTML = message;
        log.appendChild(logLine);
    };

    var clearLog = function () {
        var log = document.getElementById('info');
        log.innerHTML = '';
    };
    
    function testNotImplemented (testName) {
        return function(){ console.error('test', testName, 'not implemented'); };
    }
    
    function init(){
        bindEvents();
        displayRecordings();
    }

    function bindEvents() {
        var events = [
            "continue.notsupported",
            "pause.notsupported",
            "play.busy",
            "play.continue",
            "play.error",
            "play.pause",
            "play.start",
            "play.stop",
            "record.busy",
            "record.clear",
            "record.continue",
            "record.error",
            "record.notRemoved",
            "record.pause",
            "record.removed",
            "record.start",
            "record.stop"
        ];
        
        events.forEach(function(event){
            document.addEventListener("intel.xdk.audio." + event, receivedAudioEvent, false);
        });
    }
    
    // Intercepts and audio event an log it into the log div
    function receivedAudioEvent(event) {
        console.log(event.name ? event.type + "(" + event.name + ")" : event.type);
        displayRecordings();
    }

    // Repopulate the recordings info box with the recordings list. If there is a recording
    // in the list that matches the `selectedRecording` string, give it the `selected` class.
    // If there isn't, then clear the `selectedRecording` string.
    function displayRecordings() {
        var recordings = document.getElementById("recordings");
        while (recordings.firstChild) {
            recordings.removeChild(recordings.firstChild);
        }
        var haveSelection = false;
        intel.xdk.audio.getRecordingList().forEach(function(rec) {
            var liNode = document.createElement("li");
            liNode.appendChild(document.createTextNode(rec));
            liNode.addEventListener("click", selectRecording);
            if (rec === TestSuite.selectedRecording) {
                liNode.classList.add("selected");
                haveSelection = true;
            }
            recordings.appendChild(liNode);
        });
        if (! haveSelection) {
            TestSuite.selectedRecording = null;
        }
    }

    // Event listener that is called when an line in the recording list is clicked.
    // `this` is the <li> node for the line. Sets `selectedRecording` to the text of
    // the clicked line, and gives the line the `selected` class.
    function selectRecording(event) {
        var oldSelection = document.querySelector("#recordings .selected");
        if (oldSelection) {
            oldSelection.classList.remove("selected");
        }
        TestSuite.selectedRecording = this.firstChild.nodeValue;
        this.classList.add("selected");
        console.log('event:', 'recording selected', TestSuite.selectedRecording);
    }
    
    /** 
     * Record Buttons 
     */
    createActionButton('Start Recording', function() {
        console.log('executing:', 'intel.xdk.audio.startRecording();');
        intel.xdk.audio.startRecording('amr_nb',1,1);
    }, "buttonStartRecording");

    createActionButton('Stop Recording', function() {
        console.log('executing:', 'intel.xdk.audio.stopRecording();');
        intel.xdk.audio.stopRecording();
    }, "buttonStopRecording");

    createActionButton('Pause Recording', function() {
        console.log('executing:', 'intel.xdk.audio.pauseRecording();');
        intel.xdk.audio.pauseRecording();
    }, "buttonPauseRecording");

    createActionButton('Continue Recording', function() {
        console.log('executing:', 'intel.xdk.audio.continueRecording();');
        intel.xdk.audio.continueRecording();
    }, "buttonContinueRecording");

    /** 
     * List Buttons 
     */
    createActionButton('Get Recording List', function(){
        console.log('executing:', 'intel.xdk.audio.getRecordingList();');
        displayRecordings();
              
    }, "buttonGetRecordingList");
  
    createActionButton('Delete Recording', function(){
        console.log('executing:', 'intel.xdk.audio.deleteRecording();');
        if(TestSuite.selectedRecording){
            var recordingUrl = intel.xdk.audio.getRecordingURL(TestSuite.selectedRecording);
            console.log('executing:', 'intel.xdk.audio.deleteRecording("' + TestSuite.selectedRecording + '");');
            intel.xdk.audio.deleteRecording(recordingUrl);  
        } else {
            console.error('select a recording to delete');
        }
              
    }, "buttonDeleteRecording");
    
    createActionButton('Clear List',function(){
        console.log('executing:', 'intel.xdk.audio.clearRecordings();');
        intel.xdk.audio.clearRecordings();
    }, "buttonClearList");
    
    createActionButton('Get Recording URL', function(){
        if(TestSuite.selectedRecording){
            console.log('executing:', 'intel.xdk.audio.getRecordingUrl();');
            console.log('recording url:', intel.xdk.audio.getRecordingURL(TestSuite.selectedRecording));
        } else {
            console.error('select a recording first');
        }
    }, "buttonGetRecordingUrl");
    
    /** Play Buttons */
    createActionButton('Start Playing', function(){
        if(TestSuite.selectedRecording){
            var recordingUrl = intel.xdk.audio.getRecordingURL(TestSuite.selectedRecording);
            console.log('executing:', 'intel.xdk.audio.startPlaying("' + TestSuite.selectedRecording + '");');
            intel.xdk.audio.startPlaying(recordingUrl);
        } else {
            console.error('select a recording to start playing');
        }
    }, "buttonStartPlaying");
    
    createActionButton('Stop Playing', function(){
        console.log('executing:', 'intel.xdk.audio.stopPlaying();');
        intel.xdk.audio.stopPlaying();
    }, "buttonStopPlaying");    
    
    createActionButton('Pause Playing', function(){
        console.log('executing:', 'intel.xdk.audio.pausePlaying();');
        intel.xdk.audio.pausePlaying();
    }, "buttonPausePlaying");    
    
    createActionButton('Continue Playing', function(){
        console.log('executing:', 'intel.xdk.audio.continuePlaying();');
        intel.xdk.audio.continuePlaying();
    }, "buttonContinuePlaying");
  
    createActionButton('Add Sound', testNotImplemented('intel.xdk.audio.addSound()'), "buttonAddSound");
  
    document.addEventListener("deviceready", init, false);
};
