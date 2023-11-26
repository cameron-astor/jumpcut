function jumpCutActiveSequence(silences, offsets) {

    // TODO
    // Make a backup of the sequence before initiating jumpcuts.
    // How to make sure the video and audio stays linked or re-links afterwards?

    const VIDEO_TRACK = 0;
    const AUDIO_TRACK = 0;

    app.enableQE();

    silences = eval(silences);
    offsets = eval(offsets); // convert back to arrays


    var time = new Time();

    // Perform jump cuts with razor tool
    for (var i = 0; i < silences.length; i++) {
        silence_range = silences[i];
        for (var j = 0; j < silence_range.length; j++) {

            time.seconds = silence_range[j];
            var timecode = time.getFormatted(app.project.activeSequence.getSettings().videoFrameRate, app.project.activeSequence.getSettings().videoDisplayFormat);
            
            qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).razor(timecode);
            qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).razor(timecode);
        }
    }

    // Remove silences and adjust clips by offsets
    // If silences begins at 0 seconds, start removing from element 0 of clips array. Otherwise, start from element 1.
    // Alternate until reaching the end.
    var startingIndex;
    if (silences[0][0] === 0) {
        startingIndex = 0;
    } else {
        startingIndex = 1;
    }

    var nonEmptyTrackItems;
    var nonEmptyAudioTrackItems;

    try {
        nonEmptyTrackItems = getNonEmptyTrackItems("Video", VIDEO_TRACK, AUDIO_TRACK);
        nonEmptyAudioTrackItems = getNonEmptyTrackItems("Audio", VIDEO_TRACK, AUDIO_TRACK);       
    } catch (error) {
        alert(error.message);
    }

    try {
        var currentTrackItem = null;
        var currentAudioTrackItem = null;
        for (var i = startingIndex; i < nonEmptyTrackItems.length; i++) {
            if (i % 2 === startingIndex) {
                currentTrackItem = nonEmptyTrackItems[i];
                currentAudioTrackItem = nonEmptyAudioTrackItems[i];
                currentTrackItem.remove();
                currentAudioTrackItem.remove();
            } 
        }
    } catch (error) {
        alert(error.message);
    }

    // Recalculate non-empty clips (the remaining clips will correspond to the offsets)
    try {
        nonEmptyTrackItems = getNonEmptyTrackItems("Video", VIDEO_TRACK, AUDIO_TRACK);
        nonEmptyAudioTrackItems = getNonEmptyTrackItems("Audio", VIDEO_TRACK, AUDIO_TRACK);       
    } catch (error) {
        alert(error.message);
    }

    for (var i = 0; i < nonEmptyTrackItems.length; i++) {
            // 'Ripple delete' (it would be nice if the API's ripple delete function actually worked...)
            currentTrackItem = nonEmptyTrackItems[i];
            currentAudioTrackItem = nonEmptyAudioTrackItems[i];

            // Convert offset to timecode based on project and video properties
            time.seconds = offsets[i] * -1;
            var timecode = time.getFormatted(app.project.activeSequence.getSettings().videoFrameRate, app.project.activeSequence.getSettings().videoDisplayFormat); 

            currentTrackItem.move("-" + timecode);
            currentAudioTrackItem.move("-" + timecode);
    }
}

function getNonEmptyTrackItems(type, VIDEO_TRACK, AUDIO_TRACK) {
    var result = [];
    if (type === "Video") {
        for (var i = 0; i < qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).numItems; i++) {
            if (qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).getItemAt(i).type === "Clip") {
                result.push(qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).getItemAt(i));
            }
        }
    } else if (type === "Audio") {
        for (var i = 0; i < qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).numItems; i++) {
            if (qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).getItemAt(i).type === "Clip") {
                result.push(qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).getItemAt(i));
            }
        }
    } else {
        alert("Invalid track type!");
    }

    return result;
}

// Get the file path of the clip that should be jump cut.
// Currently this defaults to the first clip on the first video track.
//
// -- TODO --
// Parameters for:
// - Track
// - Video or audio or both
function getMediaPath() {
    var sequence = app.project.activeSequence;
    var track1 = sequence.videoTracks[0];
    clip = track1.clips[0];
    return clip.projectItem.getMediaPath();
}