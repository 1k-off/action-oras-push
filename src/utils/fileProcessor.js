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

const findCommonParent = (paths) => {
  if (paths.length === 1) return path.dirname(paths[0]);
  const splitPaths = paths.map(p => path.resolve(p).split(path.sep));
  let i = 0;
  while (splitPaths[0][i] && splitPaths.every(arr => arr[i] === splitPaths[0][i])) i++;
  return splitPaths[0].slice(0, i).join(path.sep) || path.sep;
};

async function processInputFiles(filesInput, keepFullPath, keepRootDir) {
  const inputs = filesInput.split(' ').filter(f => f.trim());
  core.debug(`Processing inputs: ${JSON.stringify(inputs)}`);
  core.debug(`Keep full path: ${keepFullPath}`);
  core.debug(`Keep root dir: ${keepRootDir}`);

  // Validate
  if (inputs.length > 1 && (keepFullPath || keepRootDir)) {
    throw new Error('keep-full-path and keep-root-dir options can only be used with a single directory input');
  }

  // If keepRootDir is false, force keepFullPath to false
  if (!keepRootDir && keepFullPath) {
    core.warning('keep-full-path is set to true but keep-root-dir is false. This is an unusual combination as the root directory structure will not be preserved.');
    keepFullPath = false;
  }

  // Single input
  if (inputs.length === 1) {
    const input = inputs[0].replace(/\/$/, '');
    if (!fs.existsSync(input)) throw new Error(`File or directory not found: ${input}`);
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      if (keepRootDir) {
        // Fix: If keepFullPath, use full relative path from cwd
        const mediaType = getMediaTypeForDirectory(input);
        let artifactPath, workingDir;
        if (keepFullPath) {
          artifactPath = path.relative(process.cwd(), input);
          workingDir = process.cwd();
        } else {
          artifactPath = path.basename(input);
          workingDir = path.dirname(input);
        }
        const processedFiles = [`${artifactPath}:${mediaType}`];
        core.debug(`Directory as single artifact: ${processedFiles[0]}, workingDir: ${workingDir}`);
        return { processedFiles, workingDir };
      } else {
        // Push the directory as '.' from inside the directory
        const processedFiles = ['.'];
        const workingDir = input;
        core.debug(`Directory as '.', workingDir: ${workingDir}`);
        return { processedFiles, workingDir };
      }
    } else {
      // Single file
      const mediaType = getMediaTypeForFile(input);
      const processedFiles = [`${path.basename(input)}:${mediaType}`];
      const workingDir = path.dirname(input);
      core.debug(`Single file: ${processedFiles[0]}, workingDir: ${workingDir}`);
      return { processedFiles, workingDir };
    }
  }

  // Multiple inputs (files or directories)
  let processedFiles = [];
  let allPaths = [];
  for (const input of inputs) {
    const cleanPath = input.replace(/\/$/, '');
    if (!fs.existsSync(cleanPath)) throw new Error(`File or directory not found: ${cleanPath}`);
    const stat = fs.statSync(cleanPath);
    if (stat.isDirectory()) {
      if (keepRootDir) {
        const mediaType = getMediaTypeForDirectory(cleanPath);
        processedFiles.push(`${path.basename(cleanPath)}:${mediaType}`);
        allPaths.push(path.dirname(cleanPath));
      } else {
        processedFiles.push('.');
        allPaths.push(cleanPath);
      }
    } else {
      const mediaType = getMediaTypeForFile(cleanPath);
      processedFiles.push(`${path.basename(cleanPath)}:${mediaType}`);
      allPaths.push(path.dirname(cleanPath));
    }
  }
  // For keepRootDir=false, workingDir is the common parent of all directories/files
  // For keepRootDir=true, workingDir is the common parent of all parent dirs
  const workingDir = findCommonParent(allPaths);
  core.debug(`Multiple inputs: ${JSON.stringify(processedFiles)}, workingDir: ${workingDir}`);
  return { processedFiles, workingDir };
}

module.exports = {
  getDirectoryContents,
  processInputFiles
}; 