const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const { getMediaTypeForFile, getMediaTypeForDirectory } = require('./mediaTypeDetector');

function getDirectoryContents(dirPath, basePath = '', keepFullPath = false) {
  core.debug(`Scanning directory: ${dirPath}`);
  const contents = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile()) {
      const artifactPath = keepFullPath ? fullPath : path.relative(basePath, fullPath);
      const mediaType = getMediaTypeForFile(fullPath);
      contents.push(`${artifactPath}:${mediaType}`);
      core.debug(`Found file: ${artifactPath} (${mediaType})`);
    } else if (stat.isDirectory()) {
      core.debug(`Found subdirectory: ${fullPath}`);
      contents.push(...getDirectoryContents(fullPath, basePath, keepFullPath));
    }
  }

  return contents;
}

function getWorkingDirectory(filePath, keepFullPath, keepRootDir) {
  let workingDir;
  if (keepFullPath) {
    workingDir = process.cwd();
    core.debug('Using current working directory (keepFullPath=true)');
  } else if (keepRootDir) {
    workingDir = path.dirname(filePath);
    core.debug(`Using parent directory: ${workingDir} (keepRootDir=true)`);
  } else {
    workingDir = filePath;
    core.debug(`Using file path as working directory: ${workingDir}`);
  }
  return workingDir;
}

function processDirectory(dirPath, keepFullPath, keepRootDir) {
  core.debug(`Processing directory: ${dirPath}`);
  if (!keepRootDir) {
    core.debug('Processing directory contents individually (keepRootDir=false)');
    return getDirectoryContents(dirPath, dirPath, keepFullPath);
  }

  const fullPath = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  const mediaType = getMediaTypeForDirectory(dirPath);
  const result = keepFullPath ? 
    [`${fullPath}:${mediaType}`] : 
    [`${path.basename(dirPath)}:${mediaType}`];
  
  core.debug(`Directory processing result: ${JSON.stringify(result)}`);
  return result;
}

function processFile(filePath, keepFullPath, keepRootDir) {
  core.debug(`Processing file: ${filePath}`);
  let result;
  const mediaType = getMediaTypeForFile(filePath);
  
  if (keepFullPath) {
    result = [`${filePath}:${mediaType}`];
    core.debug('Keeping full file path');
  } else if (keepRootDir) {
    const versionDir = path.basename(path.dirname(filePath));
    const fileName = path.basename(filePath);
    result = [`${versionDir}/${fileName}:${mediaType}`];
    core.debug(`Keeping version directory structure: ${result[0]}`);
  } else {
    result = [`${path.basename(filePath)}:${mediaType}`];
    core.debug(`Using only filename: ${result[0]}`);
  }
  
  return result;
}

async function processInputFiles(filesInput, keepFullPath, keepRootDir) {
  const inputs = filesInput.split(' ').filter(f => f.trim());
  
  core.debug(`Processing inputs: ${JSON.stringify(inputs)}`);
  core.debug(`Keep full path: ${keepFullPath}`);
  core.debug(`Keep root dir: ${keepRootDir}`);
  
  // Validate inputs
  if (inputs.length > 1 && (keepFullPath || keepRootDir)) {
    throw new Error('keep-full-path and keep-root-dir options can only be used with a single directory input');
  }

  // If keepRootDir is false, force keepFullPath to false
  if (!keepRootDir && keepFullPath) {
    core.warning('keep-full-path is set to true but keep-root-dir is false. This is an unusual combination as the root directory structure will not be preserved.');
    keepFullPath = false;
  }

  for (const input of inputs) {
    const cleanPath = input.replace(/\/$/, '');
    core.debug(`Processing input: ${cleanPath}`);
    
    if (!fs.existsSync(cleanPath)) {
      throw new Error(`File or directory not found: ${cleanPath}`);
    }

    const stat = fs.statSync(cleanPath);
    const workingDir = getWorkingDirectory(cleanPath, keepFullPath, keepRootDir);
    const processedFiles = stat.isDirectory() ?
      processDirectory(cleanPath, keepFullPath, keepRootDir) :
      processFile(cleanPath, keepFullPath, keepRootDir);

    core.debug(`Processed files: ${JSON.stringify(processedFiles)}`);
    core.debug(`Working directory: ${workingDir}`);
    return { processedFiles, workingDir };
  }

  throw new Error('No valid input files found');
}

module.exports = {
  getDirectoryContents,
  processInputFiles
}; 