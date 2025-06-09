const core = require('@actions/core');

function validateInputs() {
  return {
    // Required inputs
    registry: core.getInput('registry', { required: true }),
    repository: core.getInput('repository', { required: true }),
    tag: core.getInput('tag', { required: true }),
    files: core.getInput('files', { required: true }),
    
    // Optional boolean inputs
    keepFullPath: core.getBooleanInput('keep-full-path'),
    keepRootDir: core.getBooleanInput('keep-root-dir'),
    plainHttp: core.getBooleanInput('plain-http'),
    insecure: core.getBooleanInput('insecure'),
    
    // Optional string inputs
    annotationFile: core.getInput('annotation-file'),
    manifestAnnotations: core.getInput('manifest-annotations'),
    username: core.getInput('username'),
    password: core.getInput('password')
  };
}

module.exports = { validateInputs }; 