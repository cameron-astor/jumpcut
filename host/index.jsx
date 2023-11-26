// TODO
// Make a backup of the sequence before initiating jumpcuts.

function jumpCutActiveSequence(silences, offsets) {

    app.enableQE();

    silences = eval(silences);
    offsets = eval(offsets); // convert inputs back to arrays

    var SEQUENCE = app.project.activeSequence;
    var QE_SEQUENCE = qe.project.getActiveSequence();
    var VIDEO_TRACK = 0;
    var AUDIO_TRACK = 0;

    var time = new Time();

    // Make a backup of the sequence before initiating jumpcuts.
    SEQUENCE.clone();

    // Perform jump cuts with razor tool
    // This requires the QE version of the sequence.
    for (var i = 0; i < silences.length; i++) {
        silence_range = silences[i];
        for (var j = 0; j < silence_range.length; j++) {

            time.seconds = silence_range[j];
            var timecode = time.getFormatted(SEQUENCE.getSettings().videoFrameRate, app.project.activeSequence.getSettings().videoDisplayFormat);
            
            QE_SEQUENCE.getVideoTrackAt(VIDEO_TRACK).razor(timecode);
            QE_SEQUENCE.getAudioTrackAt(AUDIO_TRACK).razor(timecode);
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


// -- DEPRECATED --

// Deprecated offsets logic
// Recalculate non-empty clips (the remaining clips will correspond to the offsets)
// try {
//     nonEmptyTrackItems = getNonEmptyTrackItems("Video", SEQUENCE, VIDEO_TRACK, AUDIO_TRACK);
//     nonEmptyAudioTrackItems = getNonEmptyTrackItems("Audio", SEQUENCE, VIDEO_TRACK, AUDIO_TRACK);       
// } catch (error) {
//     alert("Recalculate non-empty clips: " + error.message);
// }

// for (var i = 0; i < nonEmptyTrackItems.length; i++) {
//         // 'Ripple delete' (it would be nice if the API's ripple delete function actually worked...)
//         currentTrackItem = nonEmptyTrackItems[i];
//         currentAudioTrackItem = nonEmptyAudioTrackItems[i];

//         // Convert offset to timecode based on project and video properties
//         time.seconds = offsets[i] * -1;
//         var timecode = time.getFormatted(app.project.activeSequence.getSettings().videoFrameRate, app.project.activeSequence.getSettings().videoDisplayFormat); 

//         currentTrackItem.move("-" + timecode);
//         currentAudioTrackItem.move("-" + timecode);
// }

// QE version (returns a collection of QETrackItem)
// Not currently used.
// function getNonEmptyTrackItemsQE(type, VIDEO_TRACK, AUDIO_TRACK) {
//     var result = [];
//     if (type === "Video") {
//         for (var i = 0; i < qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).numItems; i++) {
//             if (qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).getItemAt(i).type === "Clip") {
//                 result.push(qe.project.getActiveSequence().getVideoTrackAt(VIDEO_TRACK).getItemAt(i));
//             }
//         }
//     } else if (type === "Audio") {
//         for (var i = 0; i < qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).numItems; i++) {
//             if (qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).getItemAt(i).type === "Clip") {
//                 result.push(qe.project.getActiveSequence().getAudioTrackAt(AUDIO_TRACK).getItemAt(i));
//             }
//         }
//     } else {
//         alert("Invalid track type!");
//     }

//     return result;
// }