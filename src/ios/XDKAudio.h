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

#import <UIKit/UIKit.h>
#import "Cordova/CDV.h"

@interface XDKAudio : CDVPlugin

- (void) getAudioInfo:      (CDVInvokedUrlCommand*)command;
- (void) startPlaying:      (CDVInvokedUrlCommand*)command; // (recURL)
- (void) pausePlaying:      (CDVInvokedUrlCommand*)command;
- (void) continuePlaying:   (CDVInvokedUrlCommand*)command;
- (void) stopPlaying:       (CDVInvokedUrlCommand*)command;
- (void) startRecording:    (CDVInvokedUrlCommand*)command; // (format, samplingRate, channels)
- (void) pauseRecording:    (CDVInvokedUrlCommand*)command;
- (void) continueRecording: (CDVInvokedUrlCommand*)command;
- (void) stopRecording:     (CDVInvokedUrlCommand*)command;
- (void) addSound:          (CDVInvokedUrlCommand*)command; // (sound)
- (void) deleteRecording:   (CDVInvokedUrlCommand*)command; // (recURL)
- (void) clearRecordings:   (CDVInvokedUrlCommand*)command;

@end
