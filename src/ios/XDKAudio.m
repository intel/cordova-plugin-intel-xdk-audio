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

#import "XDKAudio.h"
#import <AVFoundation/AVFoundation.h>
#import "PCMMixer.h"

@interface XDKAudio ()  <AVAudioRecorderDelegate, AVAudioPlayerDelegate>

//! The active audio player, or nil if no playback is in progress.
@property (nonatomic) AVAudioPlayer*        audioPlayer;

//! The active audio recorder, or nil if no recording is in progress.
@property (nonatomic) AVAudioRecorder*      audioRecorder;

//! The URL for the directory where recordings made with this plugin are stored.
@property (nonatomic) NSURL*                recordingDirectory;

//! Array of {@"sound": file-name-string, @"time":since-start-of-recording-in-seconds} entries
//! created by addSound calls during a recording.
@property (nonatomic) NSMutableArray*       activeAdditions;

//! The revocrding number to assign to the next recording added to the recordings directory.
@property (nonatomic) NSUInteger            nextRecordingNumber;

@end

@implementation XDKAudio

#pragma mark - Commands
#pragma mark -

#pragma mark Initialization

- (void) getAudioInfo:(CDVInvokedUrlCommand*)command
{
    NSArray* recordings = [self getRecordingList];
    CDVPluginResult* result;
    if (self.recordingDirectory && recordings) {
        result = [CDVPluginResult
                  resultWithStatus:CDVCommandStatus_OK
                  messageAsDictionary:@{@"recordingDirectory":[self.recordingDirectory path],
                                        @"recordingList":recordings}];
    }
    else if (!self.recordingDirectory) {
        result = [CDVPluginResult
                  resultWithStatus:CDVCommandStatus_ERROR
                  messageAsString:@"Unable to create the plugin recordings directory"];
    }
    else {
        result = [CDVPluginResult
                  resultWithStatus:CDVCommandStatus_ERROR
                  messageAsString:@"Unable to retrieve the recordings list"];
    }
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

#pragma mark Playback

- (void) startPlaying:(CDVInvokedUrlCommand*)command
{
    NSString* recPath = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    if (recPath.length == 0) return;
    
    // Ignore the directory part of the URL, and just look for the
    // file name in the recordings directory.
    NSURL* recURL = [self.recordingDirectory URLByAppendingPathComponent:
                     [recPath lastPathComponent]];
    
	if (self.audioPlayer) {
		[self fireEvent:@"audio.play.busy"];
		return;
	}
    
	self.audioPlayer = [[AVAudioPlayer alloc] initWithContentsOfURL:recURL error:NULL];
	if (! self.audioPlayer) {
		[self fireEvent:@"audio.play.error"];
		return;
	}
	
	self.audioPlayer.delegate = self;
    
    if ([self.audioPlayer play]) {
		[self fireEvent:@"audio.play.start"];
    }
    else {
		[self fireEvent:@"audio.play.error"];
	}
}


- (void) pausePlaying:(CDVInvokedUrlCommand*)command
{
    if (self.audioPlayer) {
        [self.audioPlayer pause];
        [self fireEvent:@"audio.play.pause"];
    }
}


- (void) continuePlaying:(CDVInvokedUrlCommand*)command
{
    if (self.audioPlayer) {
        if ([self.audioPlayer play]) {
            [self fireEvent:@"audio.play.continue"];
        }
        else {
            [self fireEvent:@"audio.play.error"];
        }
    }
}


- (void) stopPlaying:(CDVInvokedUrlCommand*)command
{
    if (self.audioPlayer) {
        [self.audioPlayer stop];
        self.audioPlayer = nil;
        [self fireEvent:@"audio.play.stop"];
    }
}

#pragma mark Recording

- (void) startRecording:(CDVInvokedUrlCommand*)command
{
    if (self.audioRecorder) {
        [self fireEvent:@"audio.record.busy"];
        return;
    }
    
    NSString* format = [command argumentAtIndex:0 withDefault:@"lpcm" andClass:[NSString class]];
    float sampleRate = [[command argumentAtIndex:1 withDefault:@44100.0 andClass:[NSNumber class]] floatValue];
    NSInteger channels = [[command argumentAtIndex:2 withDefault:@2 andClass:[NSNumber class]] integerValue];
    
    int formatID = [format caseInsensitiveCompare:@"ilbc"] == NSOrderedSame ? kAudioFormatiLBC
    : [format caseInsensitiveCompare:@"aac" ] == NSOrderedSame ? kAudioFormatMPEG4AAC
    : [format caseInsensitiveCompare:@"lpcm"] == NSOrderedSame ? kAudioFormatLinearPCM
    :                                                            0
    ;
    if (!formatID || !sampleRate || !channels) return;
    
    NSDictionary* recordSettings = @{AVFormatIDKey:         @(formatID),
                                     AVSampleRateKey:       @(sampleRate),
                                     AVNumberOfChannelsKey: @(channels) };
    
    // Find an unused filename in the recordings directory.
    NSString* fileName;
    NSURL* fileURL;
    do {
        fileName = [NSString stringWithFormat:@"recording_%03lu.%@",
                    (unsigned long)self.nextRecordingNumber++, format];
        fileURL = [self.recordingDirectory URLByAppendingPathComponent:fileName];
    } while ([[NSFileManager defaultManager] fileExistsAtPath:[fileURL path]]);
    
	self.audioRecorder = [[AVAudioRecorder alloc] initWithURL:fileURL
                                                     settings:recordSettings
                                                        error:NULL];
	if (! self.audioRecorder ||
        ! [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayAndRecord
                                                 error:nil] ||
        ! [[AVAudioSession sharedInstance] setActive:YES error:nil] )
    {
		[self fireEvent:@"audio.record.error"];
		return;
	}
	
    self.audioRecorder.delegate = self;
    [self.activeAdditions removeAllObjects];

    if (! [self.audioRecorder record]) {
		[[NSFileManager defaultManager] removeItemAtPath:[fileURL path] error:nil];
		[self fireEvent:@"audio.record.error"];
		self.audioRecorder = nil;
		return;
	}

	[self fireEvent:@"audio.record.start" recording:fileName internal:YES];
}


- (void) pauseRecording:(CDVInvokedUrlCommand*)command
{
    if (self.audioRecorder) {
        [self.audioRecorder pause];
        [self fireEvent:@"audio.record.pause"];
    }
}


- (void) continueRecording:(CDVInvokedUrlCommand*)command
{
    if (self.audioRecorder) {
        if ([self.audioRecorder record]) {
            [self fireEvent:@"audio.record.continue"];
        }
        else {
            [self fireEvent:@"audio.record.error"];
        }
    }
}


- (void) stopRecording:(CDVInvokedUrlCommand*)command
{
    if (self.audioRecorder) {
        [self.audioRecorder stop];
        // The "done recording" logic is in the audioReorderDidFinishRecording:successfully:
        // delegate method, which will be called once the recorder has actually stopped.
    }
}


- (void) addSound:(CDVInvokedUrlCommand*)command
{
    NSString *soundFile = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    if (self.audioRecorder) {
        [self.activeAdditions addObject:@{@"sound": soundFile,
                                          @"time": @(self.audioRecorder.currentTime)}];
    }
}


#pragma mark File Management

- (void) deleteRecording:(CDVInvokedUrlCommand*)command
{
    NSString* recording = [command argumentAtIndex:0 withDefault:@"" andClass:[NSString class]];
    if ([self deleteFile:recording fromDirectory:self.recordingDirectory]) {
        [self fireEvent:@"audio.record.removed" recording:recording internal:YES];
    }
    else {
        [self fireEvent:@"audio.record.notRemoved"];
    }
    
}


- (void) clearRecordings:(CDVInvokedUrlCommand*)command
{
    [self eraseDirectory:self.recordingDirectory];
    [self fireEvent:@"audio.record.clear" recording:@"" internal:YES];
}


#pragma mark - Private

//! Fire a JavaScript event.
//!
//! Generates a string of JavaScript code to create and dispatch an event.
//! @param eventName    The name of the event (not including the @c "intel.xdk." prefix).
//!
- (void) fireEvent:(NSString*)eventName
{
    NSString* script = [NSString stringWithFormat:
                        @"var e = document.createEvent('Events');"
                        "e.initEvent('intel.xdk.%@', true, true);"
                        "document.dispatchEvent(e);",
                        eventName];
    [self.commandDelegate evalJs:script];
}


//! Fire a JavaScript event with a name string parameter.
//!
//! Generates a string of JavaScript code to create and dispatch an event.
//! @param eventName    The name of the event (not including the @c "intel.xdk." prefix).
//! @param fileName     A recording file name.
//!
- (void) fireEvent:(NSString*)eventName
         recording:(NSString*)filename
{
    NSString* script = [NSString stringWithFormat:
                        @"var e = document.createEvent('Events');"
                        "e.initEvent('intel.xdk.%@', true, true);"
                        "e.name = '%@';"
                        "document.dispatchEvent(e);",
                        eventName, filename];
    [self.commandDelegate evalJs:script];
}


//! Fire a JavaScript event and a related internal event.
//!
//! Use this method to fire an internal event before firing a client event. The internal
//! event is the same as the client event, with a modified name: Assuming that @a eventName
//! is @c "component.subcomponents.event", the internal event name is
//! @c "component.internal.subcomponents.event".
//!
//! Internal events are used to notify the plugin JavaScript to update its state before
//! sending the client event to a client code listener that may react by querying the
//! updated state.
//!
//! @note   It is only necessary to fire an internal event to inform the plugin Javascript that
//!         of some action that it needs to take. When no action is called for, the internal
//!         event should be suppressed. For example, a failure event (success = false) usually
//!         means that nothing actually happened, and that no plugin Javascript action is
//!         needed. This can conveniently be indicated by passing the same value to the
//!         @a success: and @a internal: parameters.
//!
//! @param eventName    The name of the client event (not including the @c "intel.xdk." prefix).
//! @param fileName     A recording file name.
//! @param internal     YES => fire both the internal event and the specified event.
//!                     NO => fire only the specified event.
//!
- (void) fireEvent:(NSString*)eventName
         recording:(NSString*)filename
          internal:(BOOL)internal
{
    if (internal) {
        NSArray* nameParts = [eventName componentsSeparatedByString:@"."];
        NSMutableArray* internalNameParts = [NSMutableArray arrayWithArray:nameParts];
        [internalNameParts insertObject:@"internal" atIndex:1];
        NSString* internalName = [internalNameParts componentsJoinedByString:@"."];
        [self fireEvent:internalName recording:filename];
    }
    [self fireEvent:eventName recording:filename];
}


//! Get a list of the recording files in the plugin recordings directory.
//! @return An array whose elements are NSStrings containing the file names of all the files
//!         in the plugin recordings directory. nil if an error occurs.
- (NSArray*) getRecordingList
{
    NSFileManager* fm = [NSFileManager defaultManager];
    NSArray* recordings = [fm contentsOfDirectoryAtURL:self.recordingDirectory
                            includingPropertiesForKeys:nil
                                               options:0
                                                 error:nil];
    
    // Strip the recording file URLs down to just the bare file names.
    return [recordings valueForKey:@"lastPathComponent"];
}


//! @brief Delete the contents of a specified directory.
//! @note Actually deletes and recreates the photos directory, which is the quickest and
//! easiest way of deleting its contents.
//! @return YES if successful, NO if some error occurred.
- (BOOL) eraseDirectory:(NSURL*) directory
{
    NSFileManager* fm = [NSFileManager defaultManager];

    return ([fm removeItemAtURL:directory
                          error:nil] &&
        [fm createDirectoryAtURL:directory
     withIntermediateDirectories:NO
                      attributes:nil
                           error:nil]);
}


//! Delete a specified file in a specified directory.
//! @param  filePath    Either a complete absolute path or just the name of a file in the
//!                     specified directory.
//! @param  directory   The directory containing the file to be deleted.
//! @return The name of the deleted file if successful; otherwise nil.
//! @note   If a full path is provided, it @e must be a path to a file in the specified
//!         directory.
//!
- (NSString*) deleteFile:(NSString*)filePath fromDirectory:(NSURL*)directory
{
    NSString* fileName = [filePath lastPathComponent];
    NSString* fileDirectory = [filePath stringByDeletingLastPathComponent];
    if ([fileDirectory length] == 0 ||
        [fileDirectory isEqualToString:[directory path]])
    {
        filePath = [[directory path] stringByAppendingPathComponent:fileName];
    }
    else {
        // Path is not to a file in the pictures directory
        return nil;
    }
    
    NSFileManager* fm = [NSFileManager defaultManager];
    if ([fm fileExistsAtPath:filePath] &&
        [fm removeItemAtPath:filePath error:nil])
    {
        // Success
        return fileName;
    }
    else {
        // File does not  exist, or remove failed.
        return nil;
    }
}


#pragma mark - AVAudioPlayerDelegate

- (void) audioPlayerDidFinishPlaying:(AVAudioPlayer *)player
                        successfully:(BOOL)success {
	
	if (player == self.audioPlayer) {
        [self fireEvent:(success ? @"audio.play.stop" : @"audio.play.error")];
        self.audioPlayer = nil;
    }
}

- (void)audioPlayerDecodeErrorDidOccur:(AVAudioPlayer *)player
                                 error:(NSError *)error {
	
	if (player == self.audioPlayer) {
        [self fireEvent:@"audio.play.stop"];
        self.audioPlayer = nil;
    }
}


#pragma mark AVAudioRecorderDelegate

- (void) audioRecorderDidFinishRecording:(AVAudioRecorder *)recorder
                            successfully:(BOOL)success
{
	if (recorder != self.audioRecorder) return;

    NSFileManager* fm = [NSFileManager defaultManager];
    
    NSString* recordingPath = [self.audioRecorder.url path];
    NSString* recordingName = [recordingPath lastPathComponent];
    NSString* tempDir = NSTemporaryDirectory();
    NSString* tempResultPath = [tempDir stringByAppendingPathComponent:
                                @"intel.xdk.audio.mixer-output"];

	if (! success || ! recordingPath) goto error;

    if (! [fm fileExistsAtPath:tempDir] &&
        ! [fm createDirectoryAtPath:tempDir
        withIntermediateDirectories:NO
                         attributes:nil
                              error:nil]) goto error;
    
    // Mix each added sound into the recording file. The mixer result is actually
    // written to a temporary file, which is then moved toreplace the original
    // recording file.
    for (NSDictionary* addition in self.activeAdditions) {
        //FIXME: Get the correct directory for sound files.
        NSString* soundPath = [[self.recordingDirectory path]
                               stringByAppendingPathComponent:addition[@"sound"]];
        [fm removeItemAtPath:tempResultPath error:nil];
        if ([PCMMixer mix:recordingPath
                withSound:soundPath
                 atOffset:[addition[@"time"] doubleValue]
                  forDest:tempResultPath] != 0) goto error;
        [fm removeItemAtPath:recordingPath error:nil];
        if (! [fm moveItemAtPath:tempResultPath toPath:recordingPath error:nil]) goto error;
    }
    [self.activeAdditions removeAllObjects];
    
    [self fireEvent:@"audio.record.stop" recording:recordingName internal:YES];
	self.audioRecorder = nil;
    return;

error:
    [fm removeItemAtPath:recordingPath error:nil];
    [fm removeItemAtPath:tempResultPath error:nil];
    self.audioRecorder = nil;
    [self fireEvent:@"audio.record.error"];
    return;
}


- (void)audioRecorderEncodeErrorDidOccur:(AVAudioRecorder *)recorder error:(NSError *)error
{
	if(recorder == self.audioRecorder) {
        [[NSFileManager defaultManager] removeItemAtURL:self.audioRecorder.url error:nil];
        self.audioRecorder = nil;
        [self fireEvent:@"audio.record.error"];
    }
}


#pragma mark - CDVPlugin

- (void)pluginInitialize
{
    [super pluginInitialize];
    
    // Find or create the plugin pictures directory, and set the picturesDirectoryURL
    // instance variable to point to it. If the directory does not exist and could
    // not be created, set the variable to nil.
    NSFileManager* fm = [NSFileManager defaultManager];
    NSURL* documents = [fm URLForDirectory:NSDocumentDirectory
                                  inDomain:NSUserDomainMask
                         appropriateForURL:nil
                                    create:YES
                                     error:nil];
    if (documents) {
        NSURL* recDir = [documents URLByAppendingPathComponent:@"intel.xdk.audio"
                                                    isDirectory:YES];
        if ([fm fileExistsAtPath:[recDir path]] ||
            [fm createDirectoryAtURL:recDir
         withIntermediateDirectories:NO
                          attributes:nil
                               error:nil])
        {
            self.recordingDirectory = recDir;
        }
    }
    
    // Set the nextPictureNumber property to one higher than the largest number used in any
    // existing picture file name.
    NSError* err;
    NSRegularExpression* regex =
        [NSRegularExpression regularExpressionWithPattern:@"(?<=^recording_)\\d+"
                                                  options:0
                                                    error:&err];
    self.nextRecordingNumber = 1;
    if (err) {
        NSLog(@"%@", err);
    }
    else {
        for (NSString* rec in [self getRecordingList]) {
            NSRange nr = [regex rangeOfFirstMatchInString:rec
                                                  options:0
                                                    range:NSMakeRange(0, [rec length])];
            if (nr.location != NSNotFound) {
                NSInteger filenum = [[rec substringWithRange:nr] integerValue];
                if (filenum >= self.nextRecordingNumber ) {
                    self.nextRecordingNumber = filenum + 1;
                }
            }
        }
    }
    
    self.activeAdditions = [NSMutableArray array];
}

@end
