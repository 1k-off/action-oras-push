const core = require('@actions/core');
const exec = require('@actions/exec');

async function checkOrasCLI() {
  try {
    core.debug('Checking ORAS CLI version...');
    await exec.exec('oras version');
    core.debug('ORAS CLI is installed and working');
  } catch (error) {
    core.error('ORAS CLI check failed');
    throw new Error('ORAS CLI is not installed. Please install it first.');
  }
}

async function loginToRegistry(registry, username, password, plainHttp, insecure) {
  if (!username || !password) {
    core.info('No credentials provided, skipping login. Make sure you are already authenticated if the registry requires it.');
    return;
  }

  const loginArgs = ['login', registry, '-u', username, '-p', password];
  if (plainHttp) loginArgs.push('--plain-http');
  if (insecure) loginArgs.push('--insecure');

  core.info(`Logging in to registry: ${registry}`);
  core.debug(`Login arguments: ${loginArgs.join(' ').replace(/-p\s+\S+/, '-p ****')}`);
  
  try {
    await exec.exec('oras', loginArgs, { silent: true });
    core.info('Successfully logged in to registry');
  } catch (error) {
    core.error('Failed to login to registry');
    throw error;
  }
}

async function pushArtifacts(repoUrl, processedFiles, workingDir, options = {}) {
  const { annotationFile, manifestAnnotations, plainHttp, insecure } = options;
  const pushArgs = ['push', repoUrl];

  // Add optional arguments
  if (annotationFile) pushArgs.push('--annotation-file', annotationFile);
  if (manifestAnnotations) pushArgs.push('--manifest-annotations', manifestAnnotations);
  if (plainHttp) pushArgs.push('--plain-http');
  if (insecure) pushArgs.push('--insecure');

  pushArgs.push(...processedFiles);

  core.info(`Pushing artifacts to: ${repoUrl}`);
  core.debug(`Working directory: ${workingDir}`);
  core.debug(`Push command: oras ${pushArgs.join(' ')}`);
  core.debug(`Number of files to push: ${processedFiles.length}`);
  
  try {
    await exec.exec('oras', pushArgs, { cwd: workingDir });
    core.info('Successfully pushed artifacts to registry');
  } catch (error) {
    core.error('Failed to push artifacts');
    throw error;
  }
}

module.exports = {
  checkOrasCLI,
  loginToRegistry,
  pushArtifacts
}; 