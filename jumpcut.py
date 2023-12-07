from pydub import AudioSegment, silence
import argparse
import os
import json
import sys
import subprocess
import logging

def is_ffmpeg_installed():
    try:
        # Run "ffmpeg -version" command and suppress output
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True  # ffmpeg command was successful
    except OSError as e:
        return False  # ffmpeg not installed

if not is_ffmpeg_installed(): # If ffmpeg is not on the PATH, check for it in the extension /bin folder
    if os.name == 'nt': # Windows
        AudioSegment.converter = "./bin/ffmpeg.exe"
    else:
        AudioSegment.converter = "./bin/ffmpeg"

# logging.basicConfig(filename='C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\jumpcut\jumpcutpy.log', filemode='w')
# logging.getLogger().setLevel(logging.DEBUG)

parser = argparse.ArgumentParser()
parser.add_argument("path")
parser.add_argument("jumpcutparams", default=None)
args = parser.parse_args()

# Values in milliseconds
jumpcut_params = { # Default parameters based on the Premiere extension GUI sliders.
    'silenceCutoff': -80,
    'removeOver': 1000,
    'keepOver': 300,
    'padding': 500,
    'in': None, 
    'out': None,
    'start': None
}

if args.jumpcutparams: # If parameters are passed, overwrite the defaults.
    input = json.loads(args.jumpcutparams)
    jumpcut_params.update(input)
    # Convert to ms
    jumpcut_params = {k: float(v) * 1000 for k, v in jumpcut_params.items()}
    jumpcut_params['silenceCutoff'] = int(jumpcut_params['silenceCutoff']) / 1000 # dB

THRESHOLD = int(jumpcut_params['silenceCutoff'])
PADDING = int(jumpcut_params['padding'])
MIN_SILENCE_LENGTH = int(jumpcut_params['removeOver'])
KEEP_OVER = int(jumpcut_params['keepOver'])
INPOINT = int(jumpcut_params['in'])
OUTPOINT = int(jumpcut_params['out'])
START = int(jumpcut_params['start'])

# Other parameters not controlled by the GUI
SEEK_STEP = 50

# File path and format config
file_extension = os.path.splitext(args.path)[1].replace('.', '')

FILE_PATH = args.path
FILE_TYPE = file_extension

# Load file
audio = AudioSegment.from_file(FILE_PATH, FILE_TYPE)
# Crop audio based on in and out points
audio = audio[INPOINT:OUTPOINT]
CLIP_LENGTH = len(audio)

silences = []
try:
    silences = silence.detect_silence(audio, min_silence_len=MIN_SILENCE_LENGTH, seek_step=SEEK_STEP, silence_thresh=THRESHOLD)
except Exception as e:
    pass

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

# Implement 'keep over' functionality. If the kept space between two silences is smaller than the keep over value,
# combine them into one long silence.
cleaned_silences = []
for i in range(0, len(silences), 2):
    if i + 1 < len(silences):
        if silences[i+1][0] - silences[i][1] < KEEP_OVER:
            cleaned_silences.append([silences[i][0], silences[i+1][1]])
        else:
            cleaned_silences.append(silences[i])
            cleaned_silences.append(silences[i+1])
    else:
        cleaned_silences.append(silences[i])

silences = cleaned_silences

# Convert to seconds for Premiere
silences = [[s[0]/1000 + START/1000, s[1]/1000 + START/1000] for s in silences]

# Add a flag at the end for the Premiere script to know whether the silences line up
# with the beginning of the clip or not.
# logging.debug(silences[0][0])
# logging.debug(START/1000)
if silences[0][0] == START/1000:
    silences.append(1)
else:
    silences.append(0)

# logging.debug(jumpcut_params)
# logging.debug(silences)

print(json.dumps({"silences": silences}))
