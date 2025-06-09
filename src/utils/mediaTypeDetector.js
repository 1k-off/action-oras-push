const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const mime = require('mime-types');
const { lookup } = require('mime-types');

// Media type constants
const MEDIA_TYPES = {
  // Default types
  DEFAULT_FILE: 'application/octet-stream',
  DEFAULT_TEXT: 'text/plain',
  DEFAULT_DIRECTORY: 'application/vnd.oci.image.layer.v1.tar',
  
  // Special directory types
  DIRECTORY: {
    docs: 'application/vnd.acme.rocket.docs.layer.v1+tar',
    documentation: 'application/vnd.acme.rocket.docs.layer.v1+tar',
  }
};

function detectMediaTypeFromContent(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check for common file signatures
    const signatures = {
      // PDF
      '25504446': 'application/pdf',
      // ZIP
      '504B0304': 'application/zip',
      // PNG
      '89504E47': 'image/png',
      // JPEG
      'FFD8FF': 'image/jpeg',
      // GIF
      '47494638': 'image/gif',
      // XML
      '3C3F786D6C': 'application/xml',
      // JSON
      '7B': 'application/json',
      // YAML
      '2D2D2D': 'application/yaml'
    };

    // Get first few bytes as hex using subarray
    const hex = buffer.subarray(0, 8).toString('hex').toUpperCase();
    
    // Check against known signatures
    for (const [signature, type] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        core.debug(`Detected media type ${type} from file signature for ${filePath}`);
        return type;
      }
    }

    // If no signature match, check if it's binary
    const isBinary = buffer.some(byte => byte === 0);
    const defaultType = isBinary ? MEDIA_TYPES.DEFAULT_FILE : MEDIA_TYPES.DEFAULT_TEXT;
    
    core.debug(`No signature match for ${filePath}, detected as ${defaultType}`);
    return defaultType;
  } catch (error) {
    core.warning(`Could not read file ${filePath} to detect media type: ${error.message}`);
    return MEDIA_TYPES.DEFAULT_FILE;
  }
}

function getMediaTypeForFile(filePath) {
  // First try to detect from file extension
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = lookup(ext);
  
  if (mimeType) {
    core.debug(`Detected media type ${mimeType} from extension for ${filePath}`);
    return mimeType;
  }

  // If no mime type found from extension, try content detection
  return detectMediaTypeFromContent(filePath);
}

function getMediaTypeForDirectory(dirPath, customMediaType = null) {
  if (customMediaType) {
    core.debug(`Using custom media type ${customMediaType} for directory ${dirPath}`);
    return customMediaType;
  }

  // Check if it's a special directory that might need a specific media type
  const dirName = path.basename(dirPath).toLowerCase();
  for (const [key, mediaType] of Object.entries(MEDIA_TYPES.DIRECTORY)) {
    if (dirName.includes(key)) {
      core.debug(`Using special media type ${mediaType} for directory ${dirPath}`);
      return mediaType;
    }
  }

  core.debug(`Using default media type ${MEDIA_TYPES.DEFAULT_DIRECTORY} for directory ${dirPath}`);
  return MEDIA_TYPES.DEFAULT_DIRECTORY;
}

module.exports = {
  getMediaTypeForFile,
  getMediaTypeForDirectory,
  MEDIA_TYPES
}; 