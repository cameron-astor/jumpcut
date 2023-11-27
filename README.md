# Open Jump Cuts
A free, open-source jump cut extension for Adobe Premiere Pro.

Currently in **alpha**. Expect bugs. Make copies of your work.

## About

I made this extension based on my experience editing lengthy, repetitive educational materials in Adobe Premiere. 'Jump cut' refers to the tedious task of removing silence and mistakes from voiceovers. While automating jump cuts is no substitute for good editing, it saves me hours (if not days) of tedious edits in my own work. 

The extension works by analyzing the audio waveform of a given clip and removing areas below a certain loudness threshold. The loudness threshold, padding, and minimum silence lengths are all configurable from the extension GUI in Premiere.

### A note on Premiere AI tools
As of November of 2023, the Premiere AI tools are still in beta. They are promising as a potential replacement for this jump cut automation, but as of now they are not at the point where I find them usable in my own workflow. If you prefer classic jump cuts based on audio waveforms and not language models or transcription, this extension is for you!

## Installation


## Manual

### Known issues and pitfalls
If your whole clip is being deleted, it is likely that the silence threshold has been set such that the entire clip is considered silent. Try adjusting the threshold slider lower.


## Contributing
