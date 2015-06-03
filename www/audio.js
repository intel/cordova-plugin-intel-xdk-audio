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

var channel = require('cordova/channel'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec');

/**
 * Provides access to the various audio features on the device.
 */

module.exports = {

	recordingDirectory: null,
	recordingList: [],
	getInfo: function(successCallback, errorCallback) {
	    exec(successCallback, errorCallback, "IntelXDKAudio", "getAudioInfo", []);
	},

	/**
	 * 
	 */
	startPlaying: function(recURL) {
		exec(null, null, "IntelXDKAudio", "startPlaying", [recURL]);
	},

	/**
	 * 
	 */
	pausePlaying: function() {
		exec(null, null, "IntelXDKAudio", "pausePlaying", []);
	},

	/**
	 * 
	 */
	continuePlaying: function() {
		exec(null, null, "IntelXDKAudio", "continuePlaying", []);
	},

	/**
	 * 
	 */
	stopPlaying: function() {
		exec(null, null, "IntelXDKAudio", "stopPlaying", []);
	},

	/**
	 * 
	 */
	startRecording: function(format, samplingRate, channels) {
		exec(null, null, "IntelXDKAudio", "startRecording", [format, samplingRate, channels]);
	},

	/**
	 * 
	 */
	addSound: function(sound) {
		exec(null, null, "IntelXDKAudio", "addSound", [sound]);
	},

	/**
	 * 
	 */
	pauseRecording: function() {
		exec(null, null, "IntelXDKAudio", "pauseRecording", []);
	},

	/**
	 * 
	 */
	continueRecording: function() {
		exec(null, null, "IntelXDKAudio", "continueRecording", []);
	},

	/**
	 * 
	 */
	stopRecording: function() {
		exec(null, null, "IntelXDKAudio", "stopRecording", []);
	},

	/**
	 * 
	 */
	deleteRecording: function(recURL) {
		exec(null, null, "IntelXDKAudio", "deleteRecording", [recURL]);
	},

	/**
	 * 
	 */
	clearRecordings: function() {
		exec(null, null, "IntelXDKAudio", "clearRecordings", []);
	},

	/**
	 * 
	 */
	getRecordingList: function() {
		var list = [];
        for(var i = 0; i != this.recordingList.length; i++) {
			list.push(this.recordingList[i]);
		}
		return list;
	},

	/**
	 * 
	 */
	getRecordingURL: function(filename) {
       for(var i = 0; i != this.recordingList.length; i++) {
			if(filename == this.recordingList[i]) {
				 return this.recordingDirectory + "/" + filename;
			}
		}
		return undefined;
	},

	// Private function to switch the plugin native-code object methods into a "testing" state.
	// Arguments:
	//      ("off") - Turn off testing mode.
	//      ("ignore") - Methods should do nothing.
	//      ("succeed", t) - Methods should exhibit success behavior after t milliseconds.
	//      ("fail", t) - Methods should exhibit failure behavior after t milliseconds.
	//      ("cancel", t) - Methods should exhibit cancellation behavior after t milliseconds.
	//
	_setTestMode: function(mode, delay) {
        exec(null, null, "IntelXDKAudio", "setTestMode", [mode || "off", delay || 0]);
	}
}

var me = module.exports;
//recordingList maintenance
document.addEventListener('intel.xdk.audio.internal.record.stop', function(e){
	me.recordingList.push(e.name);
}, false);
document.addEventListener('intel.xdk.audio.internal.record.removed', function(e){
		var index = me.recordingList.indexOf(e.name);
		while (index > -1) {
		    me.recordingList.splice(index, 1);
		    index = me.recordingList.indexOf(e.name);
		}
}, false);
document.addEventListener('intel.xdk.audio.internal.record.clear', function(e){
	me.recordingList = [];
}, false);

channel.createSticky('IntelXDKAudio');
channel.waitForInitialization('IntelXDKAudio');
channel.onCordovaReady.subscribe(function() {
    me.getInfo(function(info) {
        me.recordingDirectory = info.recordingDirectory;
        me.recordingList = info.recordingList;
        channel.IntelXDKAudio.fire();
    },function(e) {
        utils.alert("[ERROR] Error initializing Intel XDK Audio: " + e);
    });
});
