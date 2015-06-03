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
package com.intel.xdk.audio;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.os.Build;
import android.webkit.WebView;


public class Audio extends CordovaPlugin {
    private MediaPlayer mediaPlayer = null;
    private MediaRecorder mediaRecorder = null;
    private final String recordingDirName = "_recordings";
    private String recordingFileName = null;
    private File recordingDirectory = null;
    private Activity activity;
    
    public Audio(){
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);

        //get convenience reference to activity
        activity = cordova.getActivity();
    }

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action            The action to execute.
     * @param args              JSONArray of arguments for the plugin.
     * @param callbackContext   The callback context used when calling back into JavaScript.
     * @return                  True when the action was valid, false otherwise.
     */
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("getAudioInfo")) {
            JSONObject r = new JSONObject();
            recordingDirectory = activity.getDir(recordingDirName, 0);
            r.put("recordingDirectory", recordingDirectory.getAbsolutePath());
            List<String> recordingList = ((recordingDirectory.list()!=null)?Arrays.asList(recordingDirectory.list()):new ArrayList<String>());
            r.put("recordingList", new JSONArray(recordingList));
            callbackContext.success(r);
        }
        else if (action.equals("startPlaying")) {
            this.startPlaying(args.getString(0));
        }
        else if (action.equals("stopPlaying")) {
            this.stopPlaying();
        }
        else if (action.equals("pausePlaying")) {
            this.pausePlaying();
        }
        else if (action.equals("continuePlaying")) {
            this.continuePlaying();
        }
        else if (action.equals("startRecording")) {
            this.startRecording(args.getString(0), args.getInt(1), args.getInt(2));
        }
        else if (action.equals("stopRecording")) {
            this.stopRecording();
        }
        else if (action.equals("pauseRecording")) {
            this.pauseRecording();
        }
        else if (action.equals("continueRecording")) {
            this.continueRecording();
        }
        else if (action.equals("deleteRecording")) {
            this.deleteRecording(args.getString(0));
        }
        else if (action.equals("addSound")) {
            this.addSound(args.getString(0));
        }
        else if (action.equals("clearRecordings")) {
            this.clearRecordings();
        }
        else {
            return false;
        }

        return true;
    }

    //--------------------------------------------------------------------------
    // LOCAL METHODS
    //--------------------------------------------------------------------------    

    /*
     *  Record methods.
     */
    public void startRecording(String format, int samplingRate, int numChannels) {
        int encodeFormat = MediaRecorder.AudioEncoder.DEFAULT;
        
        if (format.toUpperCase().matches("AMR_NB"))
            encodeFormat = MediaRecorder.AudioEncoder.AMR_NB;
        if (mediaRecorder != null) {
            injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.record.busy',true,true);document.dispatchEvent(ev);");
            return;
        }
        mediaRecorder = new MediaRecorder();
        String filePath = null, baseName = null;
        File outFile;
        int i = 0;
        do {
            baseName = String.format("recording_%1$03d.amr", i++);
            filePath = String.format("%1$s/%2$s", recordingDirectory.getAbsolutePath(), baseName);
            outFile = new File(filePath);
        } while (outFile.exists());
        recordingFileName = baseName;
        mediaRecorder.setOnErrorListener(recordOnError);
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP);
        mediaRecorder.setAudioEncoder(encodeFormat);
        mediaRecorder.setAudioChannels(numChannels);
        if (samplingRate > 0)
            mediaRecorder.setAudioSamplingRate(samplingRate);
        mediaRecorder.setOutputFile(filePath);
        try {
            mediaRecorder.prepare();
            mediaRecorder.start();   // Recording is now started
        } catch (Exception e) {
            injectJS("javascript:var ev = document.createEvent('Events');" +
                    "ev.initEvent('intel.xdk.audio.record.error',true,true);document.dispatchEvent(ev);");
            mediaRecorder.release();
            mediaRecorder = null;
            return;
        }
        injectJS("javascript:var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.record.start',true,true);document.dispatchEvent(ev);");
    }
    public void pauseRecording() {
        injectJS("javascript:var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.pause.notsupported',true,true);document.dispatchEvent(ev);");
    }
    public void continueRecording() {
        injectJS("javascript:var ev = document.createEvent('Events');" +
                "ev.initEvent('intel.xdk.audio.continue.notsupported',true,true);document.dispatchEvent(ev);");
    }
    public void stopRecording() {
        if (mediaRecorder != null) {
            mediaRecorder.stop();
            mediaRecorder.release();
            mediaRecorder = null;
            injectJS("javascript:var ev = document.createEvent('Events');" +
            "ev.name = '"+recordingFileName+"';ev.initEvent('intel.xdk.audio.internal.record.stop',true,true);document.dispatchEvent(ev);");
            injectJS("javascript:var ev = document.createEvent('Events');" +
            "ev.name = '"+recordingFileName+"';ev.initEvent('intel.xdk.audio.record.stop',true,true);document.dispatchEvent(ev);");
        }
    }
    
    public void addSound(String audioFile) {
        // placeholder to mark addition for iOS compatibility
    }
    private final String baseFromUrl(String url) {
        int ind = url.lastIndexOf('/');
        return (ind < 0 || ind == url.length() - 1) ? url : url.substring(ind + 1);
    }
    private final String fileFromUrl(String url) {
        return recordingDirectory.getAbsolutePath() + "/" + baseFromUrl(url);
    }
    public void deleteRecording(String url) {
        String filePath = fileFromUrl(url);
        String baseName = baseFromUrl(url);
        File f = new File(filePath);
        boolean removed = f.delete();
        if (removed) {  /* Update the dictionary. */
            injectJS("javascript:var ev = document.createEvent('Events');" +
            "ev.name = '"+baseName+"';ev.initEvent('intel.xdk.audio.internal.record.removed',true,true);document.dispatchEvent(ev);");
            injectJS("javascript:var ev = document.createEvent('Events');" +
            "ev.name = '"+baseName+"';ev.initEvent('intel.xdk.audio.record.removed',true,true);document.dispatchEvent(ev);");
        } else {
            injectJS("javascript:var ev = document.createEvent('Events');" +
            "ev.initEvent('intel.xdk.audio.record.notRemoved',true,true);document.dispatchEvent(ev);");
        }
    }
    public void clearRecordings() {
        // Remove all the files.
        String[] children = recordingDirectory.list();
        int cnt = children == null ? 0 : children.length;
        for (int i = 0; i < cnt; i++) {
            new File(recordingDirectory, children[i]).delete();
        }
        injectJS("javascript:var ev = document.createEvent('Events');" +
        "ev.initEvent('intel.xdk.audio.internal.record.clear',true,true);document.dispatchEvent(ev);");
        injectJS("javascript:var ev = document.createEvent('Events');" +
        "ev.initEvent('intel.xdk.audio.record.clear',true,true);document.dispatchEvent(ev);");
    }
    private MediaRecorder.OnErrorListener recordOnError = new MediaRecorder.OnErrorListener(){
        //@Override
        public void onError(MediaRecorder mp, int what, int extra) {
            injectJS("javascript:var ev = document.createEvent('Events');" + 
                    "ev.initEvent('intel.xdk.audio.record.error',true,true);document.dispatchEvent(ev);");
            mediaRecorder.release();
            mediaRecorder = null;
        }
    };    
    /*
     *  Play methods.
     */
    public void startPlaying(String url) {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.busy',true,true);document.dispatchEvent(ev);");
                    return;
                }
            } catch (Exception e) { }
            mediaPlayer.release();
            mediaPlayer = null;
        }
        String path = fileFromUrl(url);
        File file = new File(path);
        FileInputStream fis = null;
        try {
            fis = new FileInputStream(file);
        } catch (FileNotFoundException e1) {
            e1.printStackTrace();
        }       
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setOnErrorListener(soundOnError);
            mediaPlayer.setOnCompletionListener(soundOnComplete);       
            mediaPlayer.setDataSource(fis.getFD());
            mediaPlayer.prepare();
            mediaPlayer.start();
        }
        catch (Exception e) {
            injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.error',true,true);document.dispatchEvent(ev);");
            return;
        }       
        injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.start',true,true);document.dispatchEvent(ev);");  
    }
    
    public void stopPlaying() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying())
                    mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) { 
                System.out.println("IntelXDKAudio.stopPlaying: " + e.getMessage());
            }
            mediaPlayer = null;
        }
        injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.stop',true,true);document.dispatchEvent(ev);");
    }
    
    public void pausePlaying() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying())
                    mediaPlayer.pause();
            } catch (Exception e) {
                System.out.println("IntelXDKAudio.pausePlaying: " + e.getMessage());
            }
        }
        injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.pause',true,true);document.dispatchEvent(ev);");
    }
    
    public void continuePlaying() {
        if (mediaPlayer != null) {
            try {
                if (!mediaPlayer.isPlaying())
                    mediaPlayer.start();
            } catch (Exception e) {
                System.out.println("IntelXDKAudio.continuePlaying: " + e.getMessage());
            }
        }
        injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.continue',true,true);document.dispatchEvent(ev);");
    }
    private MediaPlayer.OnErrorListener soundOnError = new MediaPlayer.OnErrorListener(){
        //@Override
        public boolean onError(MediaPlayer mp, int what, int extra) {
            injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.error',true,true);document.dispatchEvent(ev);");
            return true;
        }
    };    

    private MediaPlayer.OnCompletionListener soundOnComplete = new MediaPlayer.OnCompletionListener(){
        //@Override
        public void onCompletion(MediaPlayer mp) {
            mediaPlayer.release();
            mediaPlayer = null;
            injectJS("javascript:var ev = document.createEvent('Events');ev.initEvent('intel.xdk.audio.play.stop',true,true);document.dispatchEvent(ev);");
        }
    };
    
    private void injectJS(final String js) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                webView.loadUrl(js);
            }
        });
    }
}
