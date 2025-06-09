const core = require('@actions/core');
const { processInputFiles } = require('./utils/fileProcessor');
const { checkOrasCLI, loginToRegistry, pushArtifacts } = require('./utils/orasCli');
const { validateInputs } = require('./validators/inputValidator');

async function run() {
  try {
    core.info('Starting ORAS push action...');

    // Check ORAS CLI and get inputs
    core.info('Checking ORAS CLI installation...');
    await checkOrasCLI();
    
    core.info('Validating inputs...');
    const inputs = validateInputs();
    core.debug(`Input configuration: ${JSON.stringify({
      registry: inputs.registry,
      repository: inputs.repository,
      tag: inputs.tag,
      keepFullPath: inputs.keepFullPath,
      keepRootDir: inputs.keepRootDir,
      plainHttp: inputs.plainHttp,
      insecure: inputs.insecure
    }, null, 2)}`);

    // Process files
    core.info('Processing input files...');
    core.debug(`Input files: ${inputs.files}`);
    core.debug(`Keep full path: ${inputs.keepFullPath}`);
    core.debug(`Keep root dir: ${inputs.keepRootDir}`);
    
    const { processedFiles, workingDir } = await processInputFiles(
      inputs.files,
      inputs.keepFullPath,
      inputs.keepRootDir
    );

    // Prepare repository URL
    const repoUrl = `${inputs.registry}/${inputs.repository}:${inputs.tag}`;
    core.info(`Target repository: ${repoUrl}`);

    // Login and push
    await loginToRegistry(
      inputs.registry,
      inputs.username,
      inputs.password,
      inputs.plainHttp,
      inputs.insecure
    );

    core.info('Starting artifact push...');
    await pushArtifacts(repoUrl, processedFiles, workingDir, {
      annotationFile: inputs.annotationFile,
      manifestAnnotations: inputs.manifestAnnotations,
      plainHttp: inputs.plainHttp,
      insecure: inputs.insecure
    });

    core.info('ORAS push action completed successfully');
  } catch (error) {
    core.error(`Action failed: ${error.message}`);
    core.setFailed(error.message);
  }
}

// Export for both local-action and GitHub Actions
module.exports = { run };

// Execute if running in GitHub Actions
if (require.main === module) {
  run();
} 