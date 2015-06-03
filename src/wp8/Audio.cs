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

using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Audio;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.IsolatedStorage;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using Windows.Storage;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.CordovaLib;

namespace Cordova.Extension.Commands
{
    /// <summary>
    /// Audio Command
    /// </summary>
    public class IntelXDKAudio : BaseCommand
    {
        #region Private Variables
        public static bool debug = true;
        private Microphone mediaRecorder;
        private SoundEffectInstance soundInstance;              // Used to play back audio

        private bool isRecording = false;

        // this is just temporary
        private string microphoneID;

        private string fileName = "";
        private byte[] buffer;
        private MemoryStream stream;
        private SoundEffect sound;

        public const string RECORDINGS = "_recordings";
        #endregion

        #region constructor
        /// <summary>
        /// Constructor
        /// </summary>
        public IntelXDKAudio()
        {
            microphoneID = Guid.NewGuid().ToString();
        }
        #endregion

        #region appMobi.js public methods
        public void getAudioInfo(string parameters)
        {
            SetupAudio();
        }

        private async Task SetupAudio() {
            try
            {
                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {
                    StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                    if (!isolatedStorage.DirectoryExists(Path.Combine(local.Path, RECORDINGS)))
                        isolatedStorage.CreateDirectory(Path.Combine(local.Path, RECORDINGS));
                }

                string list = await getRecordingListJS();

                string info = "{\"recordingDirectory\":\"" + RECORDINGS + "\" ,\"recordingList\":" + list + "}";

                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, info));

                InvokeCustomScript(new ScriptCallback("eval", new string[] { "var temp = {};" }), true);
            }
            catch (Exception ex)
            {
                throw;
            }
        }

        /// <summary>
        /// Start Recording 
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void startRecording(string Parameters)
        {
            if (mediaRecorder != null && mediaRecorder.State == MicrophoneState.Started)
            {
                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=false;ev.initEvent('intel.xdk.audio.record.busy',true,true);" +
                    "ev.error='Device is already recording.';" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                return;
            }

            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                //IntelMicrophone microphone = new IntelMicrophone();
                //IntelAudio.mediaRecorders.Add(microphoneID, microphone);
                //microphone.StartRecorder();
                StartRecorder();
            });

        }

        /// <summary>
        /// Pause Recording
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void pauseRecording(string Parameters)
        {
            Debug.WriteLine("AppMobiAudio.pauseRecording: not supported");
            string js = ("var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.pause.notsupported',true,true);document.dispatchEvent(ev);");
            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
        }

        /// <summary>
        /// Resume Recording
        /// </summary>
        public void resumeRecording()
        {
            Debug.WriteLine("AppMobiAudio.resumeRecording: not supported");
            string js = ("var ev = document.createEvent('Events');" +
                    "ev.initEvent('intel.xdk.audio.resume.notsupported',true,true);document.dispatchEvent(ev);");
            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
        }

        /// <summary>
        /// Stop Recording
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void stopRecording(string Parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                StopRecorder();
            });
        }

        /// <summary>
        /// Delete Recording
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void deleteRecording(string Parameters)
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(Parameters);

                DeleteRecorder(args[0]);
            });
        }

        /// <summary>
        /// Start Playing Audio
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void startPlaying(string Parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(Parameters);

            if (args[0] == null)
            {
                string js = ("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.error',true,true);document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                return;
            }

            this.fileName = HttpUtility.UrlDecode(args[0]);

            if (this.fileName.Length > 0)
            {
                // Update the UI to reflect that
                // sound is playing

                // Play the audio in a new thread so the UI can update.
                Thread soundThread = new Thread(new ThreadStart(PlaySound));
                soundThread.Start();
            }
        }

        /// <summary>
        /// Stop Playing Audio
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void stopPlaying(string Parameters)
        {
            if (soundInstance != null && (soundInstance.State == SoundState.Playing || soundInstance.State == SoundState.Paused))
            {
                // In PLAY mode, user clicked the 
                // stop button to end playing back
                soundInstance.Stop();
                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=true;ev.initEvent('intel.xdk.audio.play.stop',true,true);" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            else
            {
                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=false;ev.initEvent('intel.xdk.audio.play.stop',true,true);" +
                    "ev.error='No audio is playing or paused.';" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
        }

        /// <summary>
        /// Retrieve All Recordings
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public async void getRecordings(string Parameters)
        {
            string list = await getRecordingListJS();
            string js = (string.Format("{0}; ev = document.createEvent('Events');" +
                            "ev.initEvent('intel.xdk.audio.get',true,true);ev.success=true;" +
                            "document.dispatchEvent(ev);", list));
            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
        }
        
        /// <summary>
        /// Pause the Playing of audio
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void pausePlaying(string Parameters)
        {
            if (soundInstance != null && soundInstance.State == SoundState.Playing)
            {
                soundInstance.Pause();

                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=true;ev.initEvent('intel.xdk.audio.play.pause',true,true);" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            else
            {
                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=false;ev.initEvent('intel.xdk.audio.play.pause',true,true);" +
                    "ev.error='No audio is playing.';" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
        }

        /// <summary>
        /// Continue Playing Audio
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public void continuePlaying(string Parameters)
        {
            if (soundInstance != null && soundInstance.State == SoundState.Paused)
            {
                soundInstance.Resume();

                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=true;ev.initEvent('intel.xdk.audio.play.continue',true,true);" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            else
            {
                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=false;ev.initEvent('intel.xdk.audio.play.continue',true,true);" +
                    "ev.error='No audio is paused.';" +
                    "document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
        }

        /// <summary>
        /// Retrieve All Recordings
        /// </summary>
        /// <param name="Parameters">Parameters sent from client</param>
        public async void addSound(string Parameters)
        {
            string js = ("var ev = document.createEvent('Events');" +
                            "ev.initEvent('intel.xdk.audio.add',true,true);ev.success=false;" +
                            "ev.message='Add Sound is not implemented in Windows Phone.'" +
                            "document.dispatchEvent(ev);");
            InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
        }

        /// <summary>
        /// Delete all the recordings from inside the recordings directory
        /// </summary>
        /// <param name="Parameters"></param>
        public void clearRecordings(string Parameters)
        {
            DeleteRecordings();
        }
        #endregion

        #region private methods
        /// <summary>
        /// Build with the recordings to the client
        /// </summary>
        /// <returns></returns>
        private async Task<string> getRecordingListJS(params string[] parameters)
        {
            bool firstPic = true;

            StringBuilder js = new StringBuilder("[");

            StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

            StorageFolder storageFolder = await GetStorageFolder(Path.Combine(local.Path, RECORDINGS));
            foreach (StorageFile file in await storageFolder.GetFilesAsync())
            {
                if (!firstPic)
                    js.Append(", ");
                else
                    firstPic = false;

                js.Append(string.Format("\"{0}\"", file.Name));
            }

            js.Append("]");

            //Debug.WriteLine(js.ToString());

            return js.ToString();
        }

        /// <summary>
        /// Play the last sound recorded into memory
        /// </summary>
        private void PlaySound()
        {
            // Play audio using SoundEffectInstance so we can monitor it's State 
            // and update the UI in the dt_Tick handler when it is done playing.

            MemoryStream memoryStream = GetAudio(this.fileName);

            if (memoryStream.CanRead)
            {
                try
                {
                    if (this.mediaRecorder == null)
                        this.mediaRecorder = Microphone.Default;

                    SoundEffect sound = new SoundEffect(memoryStream.ToArray(), mediaRecorder.SampleRate, AudioChannels.Mono);

                    if (soundInstance != null && soundInstance.State == SoundState.Playing)
                        soundInstance.Stop();

                    soundInstance = sound.CreateInstance();
                    //soundIsPlaying = true;
                    soundInstance.Play();
                    string js = ("var ev = document.createEvent('Events');" +
                        "ev.success=true;ev.initEvent('intel.xdk.audio.play.start',true,true);" +
                        "document.dispatchEvent(ev);");

                    InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                }
                catch (Exception)
                {
                    string js = string.Format(" var ev = document.createEvent('Events');" +
                        "ev.initEvent('intel.xdk.audio.play.start',true,true);ev.cancelled=true;" +
                        "ev.success=false;ev.error='{0}';document.dispatchEvent(ev);", "There was a problem playing: " + this.fileName);
                    //InjectJS(js);
                    InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                }
            }
            else
            {
                string js = string.Format(" var ev = document.createEvent('Events');" +
                    "ev.initEvent('intel.xdk.audio.play.start',true,true);ev.cancelled=true;" +
                    "ev.success=false;ev.error='{0}';document.dispatchEvent(ev);", "Could not find audio clip.");
                //InjectJS(js);
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
        }

        /// <summary>
        /// Start the recording.
        /// </summary>
        private void StartRecorder()
        {
            this.fileName = "hiryan";

            int i = 0;
            bool result = false;
            do
            {
                this.fileName = string.Format("recording_{0}.wav", i++);
                result = FileExist(this.fileName);
            } while (result);


            Debug.WriteLine("startupRecorder: " + this.fileName);
            try
            {
                DispatcherTimer dt = new DispatcherTimer();
                dt.Interval = TimeSpan.FromMilliseconds(50);
                dt.Tick += delegate { try { FrameworkDispatcher.Update(); } catch { } };
                dt.Start();

                if (this.mediaRecorder==null)
                    this.mediaRecorder = Microphone.Default;
                // Get audio data in 1/2 second chunks
                this.mediaRecorder.BufferDuration = TimeSpan.FromMilliseconds(500);

                // Allocate memory to hold the audio data
                buffer = new byte[this.mediaRecorder.GetSampleSizeInBytes(this.mediaRecorder.BufferDuration)];

                this.mediaRecorder.BufferReady += new EventHandler<EventArgs>(mediaRecorder_BufferReady);

                stream = new MemoryStream();

                // Set the stream back to zero in case there is already something in it
                stream.SetLength(0);

                // Start recording
                mediaRecorder.Start();
                FrameworkDispatcher.Update();

                string js = ("var ev = document.createEvent('Events');" +
                    "ev.success=true;ev.initEvent('intel.xdk.audio.record.start',true,true);document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);

                // Add name to JavaScript list.
                //js = string.Format("AppMobi.recordinglist.push('{0}');", this.fileName);
                //InjectJS(js);
                //InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            catch (Exception e)
            {
                if (debug) Debug.WriteLine("AppMobiAudio.startRecording err: " + e.Message);
                string js = ("var ev = document.createEvent('Events');" +
                        "ev.success=false;ev.initEvent('intel.xdk.audio.record.error',true,true);document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
                mediaRecorder = null;
                return;
            }
        }

        private void StopRecorder()
        {
            if (debug) Debug.WriteLine("AppMobiMicrophone.stopRecording");
            if (mediaRecorder.State == MicrophoneState.Started)
            {
                // In RECORD mode, user clicked the 
                // stop button to end recording
                mediaRecorder.Stop();

                SaveAudio(stream, this.fileName);

                this.mediaRecorder.BufferReady -= new EventHandler<EventArgs>(mediaRecorder_BufferReady);

                string js = ("var ev = document.createEvent('Events');" +
                "ev.success=true;ev.initEvent('intel.xdk.audio.internal.record.stop',true,true);" +
                "ev.name=\"" + this.fileName + "\";document.dispatchEvent(ev);" +
                "ev = document.createEvent('Events');" +
                "ev.success=true;ev.initEvent('intel.xdk.audio.record.stop',true,true);document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            //InjectJS("var ev = document.createEvent('Events');" +
            //    "ev.initEvent('intel.xdk.audio.record.stop',true,true);document.dispatchEvent(ev);");
        }

        private async Task DeleteRecorder(string Parameters)
        {
            string[] tempParams = HttpUtility.UrlDecode(Parameters).Split('~');
            this.fileName = tempParams[0];

            if (RemoveAudio(this.fileName)) {
                //string js = ("" + await getRecordingListJS());
                //InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);

                string js = ("var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.internal.record.removed',true,true);ev.success=true;ev.name = \"" + this.fileName + "\";document.dispatchEvent(ev);" +
                "ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.record.removed',true,true);ev.success=true;document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            else 
            {
                string js = ("var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.record.notRemoved',true,true);document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
        }

        private async Task DeleteRecordings()
        {
            try
            {
                StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                StorageFolder storageFolder = await GetStorageFolder(Path.Combine(local.Path, RECORDINGS));
                foreach (StorageFile file in await storageFolder.GetFilesAsync())
                {
                    RemoveAudio(file.Name);
                }

                string js = ("var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.internal.record.clear',true,true);ev.success=true;document.dispatchEvent(ev);" +
                "ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.record.clear',true,true);ev.success=true;document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
            catch (Exception ex)
            {
                string js = ("var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.record.clear',true,true);document.dispatchEvent(ev);");
                InvokeCustomScript(new ScriptCallback("eval", new string[] { js }), true);
            }
        }

        void mediaRecorder_BufferReady(object sender, EventArgs e)
        {
            mediaRecorder.GetData(buffer);
            stream.Write(buffer, 0, buffer.Length);
        }

        //  Pass list of current recordings to Javascript.
        public void initRecordingList() {
            /*File dir = new File(recordingDir());
            string[] children = dir.list();
            int cnt = children == null ? 0 : children.length;
            for (int i = 0; i < cnt; i++) {
                // Add name to JavaScript list.
                String js = String.format("AppMobi.recordinglist.push('%1$s');", children[i]);
                injectJS(js);
                if (debug)
                    System.out.println("initRecordingList: " + js);
            }*/
        }
        #endregion


        public static async Task<StorageFolder> GetStorageFolder(string path)
        {
            StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

            //path = path.Replace(local.Path + "\\", "");
            StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(path);

            return storageFolder;
        }

        /// <summary>
        /// Gets the audio file from the isolated storage audio folder
        /// </summary>
        /// <param name="fileName"></param>
        /// <returns></returns>
        public MemoryStream GetAudio(string fileName)
        {
            string audio = "";
            MemoryStream ms = new MemoryStream();

            try
            {
                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {

                    StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                    if (isolatedStorage.DirectoryExists(Path.Combine(local.Path, RECORDINGS)))
                    {
                        FileStream file = isolatedStorage.OpenFile(Path.Combine(local.Path, RECORDINGS, fileName), FileMode.Open);
                        byte[] bytes = new byte[file.Length];
                        file.Read(bytes, 0, (int)file.Length);
                        ms.Write(bytes, 0, (int)file.Length);
                        file.Close();
                        //ms.Close();
                    }
                }
            }
            catch (Exception)
            { }

            return ms;
        }

        /// <summary>
        /// Checks to see if a file exists in the isolated storage
        /// </summary>
        /// <param name="aist"></param>
        /// <param name="fileName"></param>
        /// <returns></returns>
        public bool FileExist(string fileName = "")
        {
            bool result = false;
            using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
            {
                StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                if (isolatedStorage.FileExists(Path.Combine(local.Path, RECORDINGS, fileName)))
                    result = true;
            }

            return result;
        }

        /// <summary>
        /// Saves the audio file to the isolated storage audio folder
        /// </summary>
        /// <param name="memoryStream"></param>
        /// <param name="fileName"></param>
        /// <returns></returns>
        public bool SaveAudio(MemoryStream memoryStream, string fileName)
        {
            if (memoryStream == null || memoryStream.Length <= 0)
                return false;

            try
            {
                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {
                    StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                    if (!isolatedStorage.DirectoryExists(Path.Combine(local.Path, RECORDINGS)))
                        isolatedStorage.CreateDirectory(Path.Combine(local.Path, RECORDINGS));

                    if (isolatedStorage.FileExists(Path.Combine(local.Path, RECORDINGS, fileName)))
                        isolatedStorage.DeleteFile(Path.Combine(local.Path, RECORDINGS, fileName));

                    memoryStream.Seek(0, SeekOrigin.Begin);

                    using (IsolatedStorageFileStream fileStream = isolatedStorage.CreateFile(Path.Combine(local.Path, RECORDINGS, fileName)))
                    {
                        memoryStream.CopyTo(fileStream);
                    }
                }

                return true;
            }
            catch (Exception)
            {
                //throw;
                return false;
            }
        }

        /// <summary>
        /// Removed the specified audio file from the isolated storage audio folder
        /// </summary>
        /// <param name="fileName"></param>
        /// <returns></returns>
        public bool RemoveAudio(string fileName)
        {
            try
            {
                using (var isolatedStorage = IsolatedStorageFile.GetUserStoreForApplication())
                {
                    StorageFolder local = Windows.Storage.ApplicationData.Current.LocalFolder;

                    if (isolatedStorage.FileExists(Path.Combine(local.Path, RECORDINGS, fileName)))
                    {
                        isolatedStorage.DeleteFile(Path.Combine(local.Path, RECORDINGS, fileName));
                    }
                }
            }
            catch (Exception)
            {
                //throw;
                return false;
            }

            return true;
        }
    }
}
