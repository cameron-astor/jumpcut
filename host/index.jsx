
function jumpCutActiveSequence(silences, backup) {

    app.enableQE();

    silences = eval(silences); // convert inputs back to arrays

    // Get the flag that indicates whether
    // the clip starts with silence or not.
    var cutStartflag = silences[silences.length - 1];

    // Remove the flag
    silences.splice(silences.length - 1, 1);

    var MAKE_BACKUP = eval(backup);

    var SEQUENCE = app.project.activeSequence;
    var QE_SEQUENCE = qe.project.getActiveSequence();

    var VIDEO_TRACK = 0; // For now, default to V1 and A1 only.
    var AUDIO_TRACK = 0;

    var time = new Time();

    // Make a backup of the sequence before initiating jumpcuts.
    if (MAKE_BACKUP) {
        SEQUENCE.clone();
    }

    // Perform jump cuts with razor tool
    // This requires the QE version of the sequence.
    try {
        for (var i = 0; i < silences.length; i++) {
            silence_range = silences[i];
            for (var j = 0; j < silence_range.length; j++) {

                time.seconds = silence_range[j];
                var timecode = time.getFormatted(SEQUENCE.getSettings().videoFrameRate, app.project.activeSequence.getSettings().videoDisplayFormat);

                QE_SEQUENCE.getVideoTrackAt(VIDEO_TRACK).razor(timecode);
                QE_SEQUENCE.getAudioTrackAt(AUDIO_TRACK).razor(timecode);
            }
        }
    } catch (error) {
        alert(error);
    }

    // Remove silences.
    // If silences begins at 0 seconds, start removing from element 0 of clips array. Otherwise, start from element 1.
    // Alternate until reaching the end.
    var startingIndex;
    if (cutStartflag === 1) {
        startingIndex = 0;
    } else {
        startingIndex = 1;
    }

    var nonEmptyTrackItems;
    var nonEmptyAudioTrackItems;

    try {
        nonEmptyTrackItems = getNonEmptyTrackItems("Video", SEQUENCE, VIDEO_TRACK, AUDIO_TRACK);
        nonEmptyAudioTrackItems = getNonEmptyTrackItems("Audio", SEQUENCE, VIDEO_TRACK, AUDIO_TRACK);       
    } catch (error) {
        alert("Get non-empty items: " + error.message);
    }

    try {
        var currentTrackItem = null;
        var currentAudioTrackItem = null;
        for (var i = startingIndex; i < nonEmptyTrackItems.length; i++) {
            if (i % 2 === startingIndex) {
                currentTrackItem = nonEmptyTrackItems[i];
                currentAudioTrackItem = nonEmptyAudioTrackItems[i];
                currentTrackItem.remove(true, true);
                currentAudioTrackItem.remove(true, true); // Not exactly sure but one of these parameters seems to be the 'ripple' parameter. True = ripple delete.
            } 
        }
    } catch (error) {
        alert("Remove silent track items: " + error.message);
    }

    // Re-link tracks
    relinkTracks(VIDEO_TRACK, AUDIO_TRACK, SEQUENCE);
}

function relinkTracks(VIDEO_TRACK, AUDIO_TRACK, SEQUENCE) {    
    var video_items = getNonEmptyTrackItems("Video", SEQUENCE, VIDEO_TRACK, AUDIO_TRACK);
    var audio_items = getNonEmptyTrackItems("Audio", SEQUENCE, VIDEO_TRACK, AUDIO_TRACK);

    for (var i = 0; i < video_items.length; i++) {
        var selection = [video_items[i], audio_items[i]];
        SEQUENCE.setSelection(selection);
        SEQUENCE.linkSelection();
    }
}

function getNonEmptyTrackItems(type, SEQUENCE, VIDEO_TRACK, AUDIO_TRACK) {
    var result = [];
    if (type === "Video") {
        for (var i = 0; i < SEQUENCE.videoTracks[VIDEO_TRACK].clips.length; i++) {
            if (SEQUENCE.videoTracks[VIDEO_TRACK].clips[i].mediaType === "Video") {
                result.push(SEQUENCE.videoTracks[VIDEO_TRACK].clips[i]);
            }
        }
    } else if (type === "Audio") {
        for (var i = 0; i < SEQUENCE.audioTracks[AUDIO_TRACK].clips.length; i++) {
            if (SEQUENCE.audioTracks[AUDIO_TRACK].clips[i].mediaType === "Audio") {
                result.push(SEQUENCE.audioTracks[AUDIO_TRACK].clips[i]);
            }
        }
    } else {
        alert("Invalid track type!");
    }

    return result;
}


// Get the file path of the clip that should be jump cut.
// Currently this defaults to the first clip on the first video track.
function getMediaPath() {
    var sequence = app.project.activeSequence;
    var track1 = sequence.videoTracks[0];
    clip = track1.clips[0]; // For now, we are dealing only with one clip.
    return clip.projectItem.getMediaPath();
}

// Returns the in and out points of clip[0] on track V1.
// The in and out points are relative to the base media.
// The start point is relative to the timeline. We need it for offsetting
// the silences correctly in Python.
function getInOutStartPoints()
{
    var clip = app.project.activeSequence.videoTracks[0].clips[0];
    var inPoint = clip.inPoint.seconds;
    var outPoint = clip.outPoint.seconds;
    var start = clip.start.seconds;
    var result = '{"in": ' + inPoint + ', "out": ' + outPoint + ', "start": ' + start + '}';
    return result;
}

// Enforces jumpcut prerequisites.
// There must be only one clip in the timeline.
// That clip must be a linked pair of audio and video.
function checkOneLinkedClipPair() {
    if (app.project.activeSequence.videoTracks[0].clips.length != 1)
    {
        return false; // Failed conditions. More than one or no video clips.
    }

    if (app.project.activeSequence.audioTracks[0].clips.length != 1)
    {
        return false;
    }

    if (app.project.activeSequence.videoTracks[0].clips[0].getLinkedItems().length != 2)
    {
        return false; // Linking not valid
    }
    return true;
}