from pydub import AudioSegment, silence
import argparse
import os
import json
import math
import logging

logging.basicConfig(filename='C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\jumpcut\jumpcutpy.log', filemode='w')

parser = argparse.ArgumentParser()
parser.add_argument("path")
parser.add_argument("jumpcutparams", default=None)
args = parser.parse_args()

# Values in milliseconds
jumpcut_params = { # Default parameters based on the Premiere extension GUI sliders.
    'silenceCutoff': -80,
    'removeOver': 1000,
    'keepOver': 300,
    'padding': 500
}

if args.jumpcutparams: # If parameters are passed, overwrite the defaults.
    input = json.loads(args.jumpcutparams)
    jumpcut_params.update(input)
    # Convert to ms
    jumpcut_params = {k: float(v) * 1000 for k, v in jumpcut_params.items()}
    jumpcut_params['silenceCutoff'] = int(jumpcut_params['silenceCutoff']) / 1000 # dB

logging.error(jumpcut_params)

THRESHOLD = int(jumpcut_params['silenceCutoff'])
PADDING = int(jumpcut_params['padding'])
MIN_SILENCE_LENGTH = int(jumpcut_params['removeOver'])

logging.error(MIN_SILENCE_LENGTH)

# Other parameters not controlled by the GUI
SEEK_STEP = 50

# File path and format config
file_extension = os.path.splitext(args.path)[1].replace('.', '')

FILE_PATH = args.path
FILE_TYPE = file_extension

# Load file
audio = AudioSegment.from_file(FILE_PATH, FILE_TYPE)
CLIP_LENGTH = len(audio)

silences = []
try:
    silences = silence.detect_silence(audio, min_silence_len=MIN_SILENCE_LENGTH, seek_step=SEEK_STEP, silence_thresh=THRESHOLD)
except Exception as e:
    logging.error(e)

# Add padding
to_remove = []
for i in range(len(silences)):

    # Check that this silence is not at the beginning of the file
    if silences[i][0] > 0:
        silences[i][0] = silences[i][0] + PADDING

    # Check that this silence is not at the end of the file
    if silences[i][1] < CLIP_LENGTH:
        silences[i][1] = silences[i][1] - PADDING
        
    if silences[i][1] <= silences[i][0]:
        to_remove.append(i)

# Remove silences that were padded out of existence
silences = [s for idx, s in enumerate(silences) if idx not in to_remove]

logging.error(silences)

# Calculate clip starting locations
# TODO
# Test with clips that have sound until the very last frame
# Test with clips that have sound at the very beginning

# Remember that everything here is in 'clip time' not the time for the whole
# sequence. This allows us to use 0 as a starting point regardless of the position
# of the clip in the original Premiere sequence.
kept_clips = [] 
for i in range(len(silences) - 1): # We are doing this rather than taking advantage of the pydub function that does the same because this is faster.
    kept_clips.append([silences[i][1], silences[i + 1][0]])

# This is probably messed up because this doesn't take into account padding!!
# TEST ###########################
# kept_clips = silence.detect_nonsilent(audio, min_silence_len=MIN_SILENCE_LENGTH, seek_step=SEEK_STEP, silence_thresh=THRESHOLD)
##################################

# Adjust first chunk to start at 0
diff = kept_clips[0][0]
kept_clips[0] = [x - diff for x in kept_clips[0]]

offsets = []
offsets.append(diff * -1) # First element (start at 0)

for i in range(1, len(kept_clips)): # Remove space between clips
    diff = kept_clips[i][0] - kept_clips[i - 1][1]
    offsets.append(diff * -1)
    kept_clips[i] = [x - diff for x in kept_clips[i]]

# Convert to seconds for Premiere
silences = [[s[0]/1000, s[1]/1000] for s in silences]
kept_clips = [[k[0]/1000, k[1]/1000] for k in kept_clips]
offsets = [o/1000 for o in offsets]

logging.error(kept_clips)
logging.error(offsets)



print(json.dumps({"silences": silences, "offsets": offsets}))
