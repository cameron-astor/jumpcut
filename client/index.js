const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const EXE_PATH = "C:/Program Files (x86)/Common Files/Adobe/CEP/extensions/jumpcut/dist/jumpcut.exe";

let csInterface = new CSInterface();
let operating_system = "WIN" // Default to Windows
initFrontend();
init();

async function init() {
  operating_system = await getOS();
}

async function runJumpCut() {
  let mediaPath = await asyncGetMediaPath();
  let jumpcutParams = getJumpcutParams();
  let jumpcutData = "";

  try {
    jumpcutData = await asyncCallPythonJumpcut(EXE_PATH, mediaPath, jumpcutParams);
    alert("Python script successful.");
  } catch (error) {
    alert("Failure executing Python script: " + error);
  }

  // fs.appendFileSync('C:/Program Files (x86)/Common Files/Adobe/CEP/extensions/jumpcut/log.txt', jumpcutData, 'utf8'); // log

  // Prepare data to send to extend script
  let dataJSON = ""
  try {
    dataJSON = JSON.parse(jumpcutData);
  } catch (error) {
    alert(error);
  }

  let silences = JSON.stringify(dataJSON['silences']);
  // let offsets = JSON.stringify(dataJSON['offsets']);

  try {
    await runPremiereJumpCut(silences);
    alert("Success.");
  } catch (error) {
    alert("Failure executing jump cuts in Premiere.");
  }

}

async function runPremiereJumpCut(silences) {
  return new Promise((resolve, reject) => {
    csInterface.evalScript(`jumpCutActiveSequence("${silences}")`, (result) => {
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

// TODO programatically get the Adobe extensions path here.
async function asyncCallPythonJumpcut(exe_path, media_path, jumpcutParams) {
  return new Promise((resolve, reject) => {
    let command_prompt;
  
    // Normalize paths
    exe_path = path.normalize(exe_path);
    media_path = path.normalize(media_path);

    // Call the Python jumpcut calculator
    if (operating_system == "WIN") {
      command_prompt = child_process.spawn(exe_path, [media_path, jumpcutParams]);
    } else {
      command_prompt = child_process.spawn('bash'); // TODO Unix-like invocation
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