intel.xdk.audio
===============

For recording sounds with the microphone and playing them back.

Description
-----------

The audio object provides methods to control the recording and playback of audio
files. The audio object contains a list of audio recordings known as the
"recording list". The recording list is where new recordings are placed once
they are created.

Recordings may be created from the device's native microphone and added to the
recording list with the [startRecording](#startrecording),
[stopRecording](#stoprecording), [pauseRecording](#pauserecording), and
[continueRecording](#continuerecording) methods. An existing sound file may be
blended into a recording using [addSound](#addsound).

All the recordings on the list may be listed in an array using
[getRecordingList](#getrecordinglist), and a reference to a particular recording
for use in an application can be obtained with the
[getRecordingURL](#gerecordingurl) method.

A recording can be played back with the [startPlaying](#startplaying),
[stopPlaying](#stopplaying), [pausePlaying](#pauseplaying), and
[continuePlaying](#continueplaying) methods.

Individual recordings may be removed
from the list with [deleteRecording](#deleterecording), or the recording list
may be wiped clear using [clearRecordings](#clearrecordings). Finally, files in
the picture list may be referenced for use in an application with 

### Methods

-   [startPlaying](#startplaying) — Start playing a recorded sound file.
-   [pausePlaying](#pauseplaying) — Pause playing a recorded sound file.
-   [continuePlaying](#continueplaying) — Resume playing a paused recorded sound 
    file.
-   [stopPlaying](#stopplaying) — Stop playing a recorded sound file.
-   [startRecording](#startrecording) — Start recording with the device 
    microphone.
-   [addSound](#addsound) — Blend a pre-existing sound file into an in-progress 
    recording.
-   [pauseRecording](#pauserecording) — Pause recording.
-   [continueRecording](#continuerecording) — Continue a paused recording.
-   [stopRecording](#stoprecording) — Stop recording and saved the recorded 
    sound file.
-   [deleteRecording](#deleterecording) — Remove a recorded sound file from the 
    device.
-   [clearRecordings](#clearrecordings) — Remove all recorded sound files from
    the device.
-   [getRecordingList](#getrecordinglist) — Get a list of all recorded sound 
    files.
-   [getRecordingURL](#getrecordingurl) — Get a URL for accessing a recorded 
    sound file.

### Events

-   [play.busy](#playbusy) — [startPlaying](#startplaying) was called when a
    file was already being played.
-   [play.continue](#playcontinue) — Playback of a file was continued.
-   [play.error](#playerror) — An error occurred when trying to play a file.
-   [play.pause](#playpause) — Playback of a file was paused.
-   [play.start](#playstart) — Playback of a file started.
-   [play.stop](#playstop) — Playback of a file finished or was stopped.
-   [record.busy](#recordbusy) — [startRecording](#startrecording) was called 
    when recording was already in progress.
-   [record.clear](#recordclear) — All files were removed from the recording 
    list.
-   [record.continue](#recordcontinue) — Recording was continued.
-   [record.error](#recorderror) — An error occurred when trying to make a 
    recording.
-   [record.notRemoved](#recordnotremoved) — An error occurred while trying to     
    remove a recorded sound file.
-   [record.pause](#recordpause) — Recording was paused.
-   [record.removed](#recordremoved) — A file was removed from the recording
    list.
-   [record.start](#recordstart) — Recording started.
-   [record.stop](#recordstop) — Recording was stopped and the recorded file
    was saved.

Methods
-------

### addSound

Blend a pre-existing sound file into an in-progress recording.

```javascript
intel.xdk.audio.addSound(soundFile);
```

#### Description

This method is called while a recording (started by
[startRecording](#startrecording)) is in progress. It takes an existing sound
file (not a recording sound file), and overlays the sound it contains on top of
the current portion of the recording. 

(Actually, `addSound` just records the current time in the recording and the
name of the added sound file; the blending is done in a post-processing step
when the recording is complete.)

If no recording is currently in progress, then this method has no effect.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Parameters

-   **soundFile:** The file name (not the complete path) of the sound file to be     
    blended into the recording. The plugin looks for a sound file with that name in (?).

#### Example

### continuePlaying

Resume playing a paused sound recording file.

```javascript
intel.xdk.audio.continuePlaying();
```

#### Description

This method is called when the playback of a sound recording file has been paused by a call to [pausePlaying](#pauseplaying), and causes the playback to resume where it left off. If there is not a currently paused playback, then this method has no effect.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Events

-   **[play.start](#playstart):** The current recorded sound file playback was
    successfully resumed.
-   **[play.error](#playerror):** An error occurred when attempting to resume 
    the paused playback.

#### Example

### continueRecording

Resume a paused recording.

```javascript
intel.xdk.audio.continueRecording();
```

#### Description

This method is called when recording with the device's microphone has been
paused by a call to [pauseRecording](#pauserecording), and causes the recording
to resume. If there is not a currently paused recording, then this method has no
effect.

#### Available Platforms

-   Apple iOS
-   Google Android
-   Microsoft Windows 8 - BETA
-   Microsoft Windows Phone 8 - BETA

#### Events

-   **[record.start](#recordstart):** The recording waas successfully resumed.
-   **[record.error](#recorderror):** An error occurred when attempting to 
    resume the recording.

#### Example

### clearRecordings

Remove all recorded sound files.

```javascript
intel.xdk.audio.clearRecordings()
```

#### Description

This method removes all recorded sound files from the recording list.

#### Events

-   **[record.clear](#recordclear):** All recorded sound files have been 
    deleted, and the recording list is empty.

### deleteRecording

Remove a recorded sound file.

```javascript
intel.xdk.audio.deleteRecording(recording)
```

#### Description

This method removes a single recorded sound file from the recording list.

#### Parameters

-   **recording:** The file name (not the complete path) of the sound file to be 
    removed. This is a name which was in the array returned by
    [getRecordingList](#getrecordinglist).
    
#### Events

-   **[record.removed](#recordremoved):** A recorded sound file has been 
    deleted. The event object has a `name` property which is the string that 
    was passed as the **recording** argument to `deleteRecording`.
-   **[record.notRemoved](#recordnotremoved):** A call to `deleteRecording` did 
    not delete a recorded sound file. The **recording** argument may not have
    been the name of a file in the recording list, or there may have been some
    other error.

#### Example

### getRecordingList

Get a list of all recorded sound files.

```javascript
recordings = intel.xdk.audio.getRecordingList()
```

#### Description

This method returns an array containing the file names (not the complete paths) 
of all the recorded sound files in the recording list. Pass one of the file 
names to [getRecordingURL](#getrecordingurl) to get a complete file path URL
for the file.

#### Returns

-   An array containing the file names (not the complete paths) of all the
    recorded sound files in the recording list.

#### Example

### getRecordingURL

Get a URL for accessing a recorded sound file.

```javascript
url = intel.xdk.audio.getRecordingURL(recording)
```

#### Description

This method returns the full path URL of a recorded sound file, given the
file name from the array returned by [getRecordingList](#getrecordinglist).

### Parameters

-   **recording:** A file name from the array of file names returned by a
    call to [getRecordingList](#getrecordinglist).

#### Returns

-   An string containing a complete path URL for the recorded sound file whose 
    file name is **recording**.

#### Example

```javascript
recordings = intel.xdk.getRecordingList();
url = intel.xdk.getRecordingURL(recordings[0]);
```

Events
------

### picture.add

Fired when a photo is added to the application's picture list

#### Description

This event is fired in response to a [takePicture](#takepicture) or
[importPicture](#importpicture) method once a photo is available to the
application in the picture list. The event is returned with two parameters.

-   **success:**
    This parameter returns a true or a false depending on whether the photo was
    successfully captured or not.
-   **filename:**
    The filename of the image in the picture list.

Once an image has been added to the picture list, it can be referenced in an
application using [getPictureURL](#getpictureurl) and passing its filename. The
entire list of available images file names can be accessed using
[getPictureList](#getpicturelist).

### picture.busy

Fired when accessing the native camera functionality is blocked by another
process

### picture.cancel

Fired when the user chooses to cancel rather than taking or importing a picture

#### Description

Fired when the user chooses to cancel rather than taking or importing a picture.

The event is returned with one parameter.

-   **success:**
    This parameter is always false for the cancel event

### picture.clear

This event is fired when the application's picture list has been cleared.

### picture.remove

This event is fired when a photo is removed from application's picture list.

