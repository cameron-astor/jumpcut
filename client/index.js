const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

let csInterface = new CSInterface();
let operating_system = getOS();
initFrontend();
init();

// Name of executable file varies by OS
var EXE_NAME = "";
if (operating_system == "WIN")
{
  EXE_NAME = "jumpcut.exe";
} else {
  EXE_NAME = "jumpcut";
}
var EXE_PATH = path.join(path.normalize(csInterface.getSystemPath(SystemPath.EXTENSION)), "/dist/" + EXE_NAME);

async function init() {
  operating_system = await getOS();
}

async function runJumpCut() {
  var isValid = await checkTimelineValidity() // Check that current prerequisites for jumpcuts are met.
  if (isValid === "true")
  {
    let mediaPath = await asyncGetMediaPath();

    let jumpcutParams = getJumpcutParams();
    let inoutpoints = await asyncGetInOutStartPoints();
    inoutpoints = JSON.parse(inoutpoints);
    jumpcutParams = JSON.parse(jumpcutParams);
    jumpcutParams["in"] = inoutpoints["in"];
    jumpcutParams["out"] = inoutpoints["out"];
    jumpcutParams["start"] = inoutpoints["start"];
    jumpcutParams = JSON.stringify(jumpcutParams);

    let jumpcutData = "";
  
    // Run the Python script to calculate jump cut locations.
    try {
      jumpcutData = await asyncCallPythonJumpcut(EXE_PATH, mediaPath, jumpcutParams);
      alert("Python script successful.");
    } catch (error) {
      alert("Failure executing Python script: " + error);
    }

    // Prepare data to send to ExtendScript.
    let dataJSON = ""
    try {
      dataJSON = JSON.parse(jumpcutData);
    } catch (error) {
      alert(error);
    }
  
    // If no silences were returned, alert the user and exit.
    if (dataJSON['silences'].length === 0) { 
      alert("No silences detected.");
      return;
    }
  
    let silences = JSON.stringify(dataJSON['silences']);
  
    let checkBox = document.getElementById("backupCheck");
    let checked = checkBox.checked;
    alert(checked);

    try {
      await runPremiereJumpCut(silences, checked);
      alert("Success.");
    } catch (error) {
      alert("Failure executing jump cuts in Premiere.");
    }
  } else {
    alert ("Timeline prerequisites not met. There must be a single linked video/audio pair on tracks V1 and A1.");
  }
}

async function runPremiereJumpCut(silences, backup) {
  return new Promise((resolve, reject) => {
    csInterface.evalScript(`jumpCutActiveSequence("${silences}", "${backup}")`, (result) => {
      if (result) {
        resolve(result);
      } else {
        reject("Error executing jump cuts.")
      }
    });
  });
}

// Gets the absolute filepath of the requested media.
// TODO: parameterize
async function asyncGetMediaPath() {
  return new Promise((resolve, reject) => {
    csInterface.evalScript("getMediaPath()", (result) => {
      if (result) {
        resolve(result);
      } else {
        reject("Error getting media path.");
      }
    });
  });
}

async function checkTimelineValidity() {
  return new Promise((resolve, reject) => {
    csInterface.evalScript("checkOneLinkedClipPair()", (result) => {
      resolve(result);
    });
  });
}

async function asyncGetInOutStartPoints()
{
  return new Promise((resolve, reject) => {
    csInterface.evalScript(`getInOutStartPoints()`, (result) => {
      if (result) {
        resolve(result);
      } else {
        reject("Error getting in and out points.");
      }
    });
  });
}

// TODO programatically get the Adobe extensions path here.
async function asyncCallPythonJumpcut(exe_path, media_path, jumpcutParams) {
  return new Promise((resolve, reject) => {
    let command_prompt;
  
    // Normalize paths
    exe_path = path.normalize(exe_path);
    media_path = path.normalize(media_path);
    let cwd = path.dirname(exe_path); // To run Python exe from its own directory

    try {
      // Call the Python jumpcut calculator
      command_prompt = child_process.spawn(exe_path, [media_path, jumpcutParams], { cwd });
    } catch (error) {
      alert(error);
    }

    let outputData = "";

    command_prompt.stdout.on('data', function (data) {
      outputData += data.toString();
    });
  
    command_prompt.stderr.on('data', function (data) {
      reject(data.toString());
    });
  
    command_prompt.on('exit', function (code) {
      if (code === 0) {
        resolve(outputData);
      } else {
        reject(`Process exited with code ${code}`);
      }
    });

  });
}


async function getOS() {
  let os = null;
  if (navigator.userAgentData) {
      const brands = await navigator.userAgentData.getHighEntropyValues(["platform"]);
      if (brands.platform.includes('macOS')) {
          os = "MAC";
      } else if (brands.platform.includes('Windows')) {
          os = "WIN";
      }
  } else {
      // Fallback for browsers that do not support userAgentData
      var platform = window.navigator.platform;
      var macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
      var windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];

      if (macosPlatforms.indexOf(platform) != -1) {
          os = "MAC";
      } else if (windowsPlatforms.indexOf(platform) != -1) {
          os = "WIN";
      }
  }
  return os;
}

// Frontend functions
function initFrontend() {

  document.addEventListener('DOMContentLoaded', () => {
    let sliderIds = ['silenceCutoff', 'removeOver', 'keepOver', 'padding'];
  
    sliderIds.forEach(function(id) {
      let slider = document.getElementById(id);
      let numberInput = slider.nextElementSibling; // Assumes the number input is right after the slider
  
      slider.oninput = function() {
          numberInput.value = slider.value;
      };
  
      numberInput.oninput = function() {
          slider.value = numberInput.value;
      };
    });
  }); 

}

function getJumpcutParams() {
  let sliderIds = ['silenceCutoff', 'removeOver', 'keepOver', 'padding'];
  let jumpcutParams = {};
  sliderIds.forEach(function(id) {
    let slider = document.getElementById(id);
    let numberInput = slider.nextElementSibling;

    jumpcutParams[id] = numberInput.value;
  });

  return JSON.stringify(jumpcutParams);
}