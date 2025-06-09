# ORAS Push Action

This action pushes artifacts to an OCI registry using the ORAS CLI.

## Prerequisites

- Docker login credentials for the target registry

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `registry` | The OCI registry URL | Yes | - |
| `username` | Registry username | Yes | - |
| `password` | Registry password or token | Yes | - |
| `repository` | Target repository name | Yes | - |
| `tag` | Tag for the artifact | Yes | `latest` |
| `files` | Files to push (space-separated list with optional media types) | Yes | - |
| `annotation-file` | Path to annotation file | No | - |
| `manifest-annotations` | Manifest annotations (key=value pairs) | No | - |
| `plain-http` | Allow plain HTTP connections | No | `false` |
| `insecure` | Skip TLS verification | No | `false` |

## Example Usage

```yaml
name: Push Artifacts
on: [push]

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Install ORAS CLI using the official action
      - uses: oras-project/setup-oras@v1
        with:
          version: 1.2.3
      
      # Push artifacts using ORAS
      - name: Push Artifacts
        uses: 1k-off/action-oras-push@v1
        with:
          registry: myregistry.azurecr.io
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
          repository: myapp/artifacts
          tag: v1.0.0
          files: |
            dist/
            index.html
          manifest-annotations: "key1=value1,key2=value2"
```

## Development

### Local Testing

You can test the action locally using [@github/local-action](https://github.com/github/local-action):

1. Install the local-action tool:
```bash
npm install -g @github/local-action
```

2. Run the action locally:
```bash
local-action -run ./ src/index.js ./test/.env
```


## License

MIT 