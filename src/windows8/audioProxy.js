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


    // This try/catch is temporary to maintain backwards compatibility. Will be removed and changed to just 
    // require('cordova/exec/proxy') at unknown date/time.
    var commandProxy;
    try {
        commandProxy = require('cordova/windows8/commandProxy');
    } catch (e) {
        commandProxy = require('cordova/exec/proxy');
    }

    module.exports = {
        mediaCapture: null,
        busy: false,
        recordingFileName: null,
        captureInitSettings: null,
        recordingName: "_recordings/",
        recordingExtension: "ms-appdata:///local/",
        fileName: "",
        currentAudio: null,

        getAudioInfo: function (successCallback, errorCallback, params) {
            var me = module.exports;

            // replace picture location to pull picture from local folder.
            if (!intel.xdk.audio.recordingDirectory || intel.xdk.audio.recordingDirectory.indexOf("ms-appdata") == -1) {
                intel.xdk.audio.recordingDirectory = me.recordingExtension + me.recordingName;
            }

            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            localFolder.createFolderAsync(intel.xdk.audio.recordingDirectory.replace(me.recordingExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                function (dataFolder) {
                    dataFolder.getFilesAsync().then(
                        function (files) {
                            var info = {};
                            info.recordingDirectory = me.recordingName;

                            var tmpRecordingList = []
                            if (files.size === 0) {
                            } else {
                                files.forEach(function (file) {
                                    tmpRecordingList.push(file.name);
                                });
                            }

                            info.recordingList = tmpRecordingList;
                            successCallback(info);
                        }
                    );
                }
            );
        },

        startRecording: function (successCallback, errorCallback, params) {
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            var me = module.exports;

            if (me.busy) {
                me.audioBusy();
                return;
            }

            me.busy = true;

            me.mediaCapture = new Windows.Media.Capture.MediaCapture();

            me.captureInitSettings = null;
            me.captureInitSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            //me.captureInitSettings.audioDeviceId = "";
            //me.captureInitSettings.videoDeviceId = "";
            me.captureInitSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audio;

            me.mediaCapture.initializeAsync(me.captureInitSettings).then(function (result, b, c) {
                if (me.mediaCapture.audioDeviceController.muted) {
                    var ev = document.createEvent('Events');
                    ev.initEvent('intel.xdk.audio.record.busy', true, true);
                    ev.error = 'Device is muted.';
                    ev.success = false;
                    document.dispatchEvent(ev);
                    return;
                }


                var fileGood = false;
                var i = 1;
                fileName = "recording_.wma";

                localFolder.createFolderAsync(intel.xdk.audio.recordingDirectory.replace(me.recordingExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                        function (dataFolder) {
                            dataFolder.createFileAsync(fileName, Windows.Storage.CreationCollisionOption.generateUniqueName).done(
                                function (file) {
                                    me.recordingFileName = file.name;
                                    var profile = Windows.Media.MediaProperties.MediaEncodingProfile.createWma(Windows.Media.MediaProperties.AudioEncodingQuality.auto);

                                    me.mediaCapture.startRecordToStorageFileAsync(profile, file).done(
                                        function () {
                                            me.busy = true;
                                            var ev = document.createEvent('Events');
                                            ev.initEvent('intel.xdk.audio.record.start', true, true);
                                            ev.name = file.name;
                                            ev.success = true;
                                            document.dispatchEvent(ev);
                                        }
                                    );
                                });
                        }
                );


                }, function (err) {
                });
        },

        pauseRecording: function (successCallback, errorCallback, params) {
            var ev = document.createEvent('Events');
            ev.initEvent('intel.xdk.audio.record.stop', true, true);
            ev.success = false;
            ev.error = 'Pause is not supported.';
            document.dispatchEvent(ev);
        },

        resumeRecording: function (successCallback, errorCallback, params) {
            var ev = document.createEvent('Events');
            ev.initEvent('intel.xdk.audio.record.stop', true, true);
            ev.success = false;
            ev.error = 'Resume is not supported.';
            document.dispatchEvent(ev);
        },

        stopRecording: function (successCallback, errorCallback, params) {
            var me = module.exports;

            if (me.mediaCapture != null) {
                var me = module.exports;

                me.mediaCapture.stopRecordAsync().then(
                    function (result) {
                        me.busy = false;

                        var ev = document.createEvent('Events');
                        ev.initEvent('intel.xdk.audio.internal.record.stop', true, true);
                        ev.success = true;
                        ev.name = me.recordingFileName;
                        document.dispatchEvent(ev);
                        me.recordingFileName = null;
                    }, 
                    function (err) {
                        me.busy = false;
                    }
                );

                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.record.stop', true, true);
                ev.success = true;
                document.dispatchEvent(ev);
            } else {
                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.record.stop', true, true);
                ev.success = false;
                ev.error = 'No audio is recurding.';
                document.dispatchEvent(ev);
            }

            me.busy = false;
        },

        deleteRecording: function (successCallback, errorCallback, params) {
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            var me = module.exports;

            if (me.busy)
                return;

            me.busy = true;

            var name = params[0];
            try {
                localFolder.createFolderAsync(intel.xdk.audio.recordingDirectory.replace(me.recordingExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                    function (dataFolder) {
                        dataFolder.getFilesAsync().then(
                            function (files) {
                                files.forEach(function (file) {
                                    if (file.name == name) {
                                        file.deleteAsync();

                                        var ev = document.createEvent('Events');
                                        ev.initEvent('intel.xdk.audio.internal.record.removed', true, true);
                                        ev.name = name;
                                        ev.success = true; document.dispatchEvent(ev);

                                        ev = document.createEvent('Events');
                                        ev.initEvent('intel.xdk.audio.record.removed', true, true);
                                        ev.name = name;
                                        ev.success = true; document.dispatchEvent(ev);
                                    }
                                });
                            }
                        );
                    }
                );

            } catch (e) {
                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.record.notRemoved', true, true);
                document.dispatchEvent(ev);
            }

            me.busy = false;
        },

        clearRecordings: function (successCallback, errorCallback, params) {
            var applicationData = Windows.Storage.ApplicationData.current;
            var localFolder = applicationData.localFolder;

            var me = module.exports;

            localFolder.createFolderAsync(intel.xdk.audio.recordingDirectory.replace(me.recordingExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                function (dataFolder) {
                    dataFolder.getFilesAsync().then(
                        function (files) {
                            files.forEach(function (file) {
                                file.deleteAsync();
                            });

                            var ev = document.createEvent('Events');
                            ev.initEvent('intel.xdk.audio.internal.record.clear', true, true);
                            document.dispatchEvent(ev);

                            ev = document.createEvent('Events');
                            ev.initEvent('intel.xdk.audio.record.clear', true, true);
                            document.dispatchEvent(ev);
                        }
                    );
                }
            );

        },

        addSound: function() {
            // Verify that we are currently not snapped, or that we can unsnap to open the picker
            var currentState = Windows.UI.ViewManagement.ApplicationView.value;
            if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped && !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.record.start', true, true);
                ev.name = file.name;
                ev.success = true;
                document.dispatchEvent(ev);
                return;
            }

            // Create the picker object and set options
            var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
            openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.thumbnail;
            openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.musicLibrary;
            // Users expect to have a filtered view of their folders depending on the scenario.
            // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
            openPicker.fileTypeFilter.replaceAll([".mp3", ".wma"]);

            // Open the picker for the user to pick a file
            openPicker.pickSingleFileAsync().then(function (file) {
                if (file) {
                    var applicationData = Windows.Storage.ApplicationData.current;
                    var localFolder = applicationData.localFolder;

                    var me = module.exports;

                    localFolder.createFolderAsync(me.recordingName.replace(me.recordingExtension, ""), Windows.Storage.CreationCollisionOption.openIfExists).then(
                        function (dataFolder) {
                            file.copyAsync(dataFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(
                                function (storageFile) {
                                    if (storageFile != null) {
                                        var ev = document.createEvent('Events');
                                        ev.initEvent('intel.xdk.audio.record.start', true, true);
                                        ev.success = true;
                                        ev.name = storageFile.name;
                                        document.dispatchEvent(ev);
                                    }
                                }, function () {
                                    var ev = document.createEvent('Events');
                                    ev.initEvent('intel.xdk.audio.record.start', true, true);
                                    ev.success = false;
                                    ev.message = 'File save failed.';
                                    document.dispatchEvent(ev);

                                }, function () {

                                });
                        });
                } else {
                    var ev = document.createEvent('Events');
                    ev.initEvent('ntel.xdk.audio.record.start', true, true);
                    ev.success = false;
                    ev.message = 'The user canceled.';
                    ev.filename = "";
                    document.dispatchEvent(ev);

                    openPicker = null;
                    me.busy = false;
                }
            });
        },

        startPlaying: function (successCallback, errorCallback, params) {
            var me = module.exports;
            
            if (me.busy) {
                me.audioBusy();
                return;
            }

            me.busy = true;
            me.fileName = params[0];

            if (me.fileName.length > 0) {
                me.currentAudio = new Audio(me.recordingExtension + me.recordingName + me.fileName);
                try {
                    if (me.currentAudio != null) {
                        me.currentAudio.addEventListener('ended', function (e) {
                            me.currentAudio.pause();
                            me.currentAudio = null;
                            me.busy = false;
                        }, false);

                        me.currentAudio.play();

                    }
                } catch (e) {
                    me.busy = false;
                }
            }

        },

        stopPlaying: function (successCallback, errorCallback, params) {
            var me = module.exports;

            if (me.currentAudio != null) {
                me.currentAudio.pause();
                me.currentAudio = null;
                me.busy = false;

               var ev = document.createEvent('Events');
               ev.initEvent('intel.xdk.audio.play.stop', true, true);
               ev.success = true;
               document.dispatchEvent(ev);
            }
            else {
                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.play.stop', true, true);
                ev.success = false;
                ev.error='No audio is playing or paused.';
                document.dispatchEvent(ev);
            }
        },

        pausePlaying: function (successCallback, errorCallback, params) {
            var me = module.exports;

            if (me.currentAudio != null) {
                me.currentAudio.pause();

                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.play.pause', true, true);
                ev.success = true;
                document.dispatchEvent(ev);
            }
            else {
                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.play.pause', true, true);
                ev.success = false;
                ev.error = 'No audio is playing or paused.';
                document.dispatchEvent(ev);
            }
        },

        continuePlaying: function (successCallback, errorCallback, params) {
            var me = module.exports;

            if (me.currentAudio != null) {
                me.currentAudio.play();

                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.play.continue', true, true);
                ev.success = true;
                document.dispatchEvent(ev);
            }
            else {
                var ev = document.createEvent('Events');
                ev.initEvent('intel.xdk.audio.play.continue', true, true);
                ev.success = false;
                ev.error='No audio is paused.';
                document.dispatchEvent(ev);
            }
        },

        audioBusy: function () {
            var ev = document.createEvent('Events');
            ev.initEvent('appMobi.audio.record.busy', true, true);
            ev.success = false;
            ev.error = 'Audio is busy.';
            document.dispatchEvent(ev);
        }
    };

    commandProxy.add('IntelXDKAudio', module.exports);

