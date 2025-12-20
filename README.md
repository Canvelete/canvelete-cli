# Canvelete CLI

Official command-line interface for the Canvelete API. Create, manage, and render designs directly from your terminal.

## Installation

```bash
npm install -g canvelete-cli
```

Or with yarn:
```bash
yarn global add canvelete-cli
```

## Quick Start

```bash
# Authenticate
canvelete auth login

# List your designs
canvelete designs list

# Render a design to PNG
canvelete render --design <design-id> --output image.png

# Quick render shortcut
canvelete quick-render <design-id>
```

## Authentication

### Login with API Key

```bash
# Interactive login
canvelete auth login

# Login with key directly
canvelete auth login --key cvt_your_api_key

# Open browser to get API key
canvelete auth login --browser
```

### Environment Variable

```bash
export CANVELETE_API_KEY="cvt_your_api_key"
```

### Check Status

```bash
canvelete auth status
canvelete whoami
```

## Commands

### Project Initialization

```bash
# Initialize a new project
canvelete init
canvelete init --yes  # Use defaults
canvelete init --template batch  # Use batch template

# Validate configuration
canvelete validate
canvelete validate --data data.json
```

### Designs

```bash
# List all designs
canvelete designs list
canvelete designs ls --limit 50

# Get design details
canvelete designs get <design-id>

# Create a new design
canvelete designs create --name "My Design" --width 1920 --height 1080
canvelete designs create -i  # Interactive mode with presets

# Update a design
canvelete designs update <id> --name "New Name" --status PUBLISHED

# Delete a design
canvelete designs delete <id>
canvelete designs rm <id> --force

# Duplicate a design
canvelete designs duplicate <id> --name "Copy of Design"
```

### Templates

```bash
# List templates
canvelete templates list
canvelete templates ls --category "certificates"

# Search templates
canvelete templates search "business card"

# Get template details
canvelete templates get <template-id>

# Create design from template
canvelete templates use <template-id> --name "My Certificate"
```

### Rendering

```bash
# Render to PNG (default)
canvelete render --design <id> --output image.png

# Render to different formats
canvelete render --design <id> --format pdf --output document.pdf
canvelete render --design <id> --format jpg --quality 95 --output photo.jpg

# Render with dynamic data
canvelete render --design <id> --data '{"name":"John","date":"2024-01-01"}' -o cert.png

# Render with data from file
canvelete render --design <id> --data-file data.json --output output.png

# Custom dimensions
canvelete render --design <id> --width 1200 --height 630 --output banner.png

# Async rendering (for large designs)
canvelete render --design <id> --async
canvelete renders status <job-id> --wait

# Output to stdout (for piping)
canvelete render --design <id> --stdout > image.png
```

### Batch Rendering

```bash
# Create a batch file (batch.json):
# [
#   {"designId": "design-1", "format": "png", "output": "output1.png"},
#   {"designId": "design-2", "format": "pdf", "output": "output2.pdf", "data": {"name": "John"}}
# ]

canvelete batch-render --file batch.json --output-dir ./renders
```

### Export

```bash
# Export to file
canvelete export <design-id> --format png --output design.png
canvelete export <design-id> --format pdf --quality 100

# Export to multiple formats
canvelete export-all <design-id> --formats png,pdf,svg --output-dir ./exports

# Open file after export
canvelete export <design-id> --open
```

### Canvas Manipulation

```bash
# List elements on canvas
canvelete canvas elements <design-id>
canvelete canvas ls <design-id> --json

# Add element to canvas
canvelete canvas add <design-id> --type rectangle --x 100 --y 100 --width 200 --height 100 --fill "#3b82f6"
canvelete canvas add <design-id> --type text --text "Hello World" --x 50 --y 50
canvelete canvas add <design-id> -i  # Interactive mode
canvelete canvas add <design-id> --from-file element.json

# Clear all elements
canvelete canvas clear <design-id>
canvelete canvas clear <design-id> --force

# Resize canvas
canvelete canvas resize <design-id> --width 1920 --height 1080
canvelete canvas resize <design-id> --preset instagram-post

# Export canvas data
canvelete canvas export <design-id> --output canvas.json

# Import canvas data
canvelete canvas import <design-id> canvas.json
canvelete canvas import <design-id> canvas.json --merge
```

### Watch Mode

```bash
# Watch a data file and auto-render on changes
canvelete watch data.json --design <id> --output output.png

# Watch with post-render command
canvelete watch data.json --design <id> --on-change "echo 'Rendered!'"

# Watch directory for batch processing
canvelete watch-dir ./input --design <id> --output-dir ./output
canvelete watch-dir ./input --design <id> --delete-after
```

### Compare & Clone

```bash
# Compare two designs
canvelete diff <design-id-1> <design-id-2>
canvelete diff <design-id-1> <design-id-2> --elements

# Clone a design with modifications
canvelete clone <design-id> --name "New Design"
canvelete clone <design-id> --scale 2  # Double the size
canvelete clone <design-id> --width 1200 --height 630
```

### Assets

```bash
# List your assets
canvelete assets list
canvelete assets ls --type IMAGE

# Search stock images
canvelete assets stock "nature landscape"

# Search icons
canvelete assets icons "arrow"

# List fonts
canvelete assets fonts
canvelete assets fonts --category serif

# Delete an asset
canvelete assets delete <asset-id>
```

### API Keys

```bash
# List API keys
canvelete apikeys list

# Create new key
canvelete apikeys create --name "Production Key"

# Revoke a key
canvelete apikeys revoke <key-id>
```

### Usage & Billing

```bash
# View usage statistics
canvelete usage

# View billing info
canvelete billing info

# List invoices
canvelete billing invoices
```

### Profiles (Multiple Accounts)

```bash
# List profiles
canvelete profiles list

# Add a new profile
canvelete profiles add production --key cvt_xxx
canvelete profiles add staging --description "Staging environment"

# Switch profiles
canvelete profiles use production
canvelete profiles switch staging

# Show current profile
canvelete profiles current

# Remove a profile
canvelete profiles remove old-profile

# Export/import profiles
canvelete profiles export > profiles.json
canvelete profiles import profiles.json --merge
```

### Configuration

```bash
# Show all config
canvelete config list

# Get a value
canvelete config get baseUrl

# Set a value
canvelete config set defaultFormat jpg
canvelete config set defaultQuality 95

# Show config file path
canvelete config path
```

## Output Formats

Most commands support `--json` flag for machine-readable output:

```bash
# JSON output
canvelete designs list --json

# Use with jq
canvelete designs list --json | jq '.data[0].name'

# Use in scripts
DESIGN_ID=$(canvelete designs list --json | jq -r '.data[0].id')
canvelete render --design $DESIGN_ID --output first.png
```

## Shell Completion

```bash
# Bash
eval "$(canvelete completion --shell bash)"

# Zsh
eval "$(canvelete completion --shell zsh)"

# Fish
canvelete completion --shell fish > ~/.config/fish/completions/canvelete.fish
```

## Project Configuration

Create a `canvelete.config.json` in your project:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "canvelete": {
    "defaultFormat": "png",
    "defaultQuality": 90,
    "outputDir": "./output"
  },
  "designs": {
    "certificate": "design-id-here",
    "badge": "another-design-id"
  },
  "batch": {
    "parallel": 3,
    "retryAttempts": 2
  }
}
```

## Examples

### Automated Certificate Generation

```bash
#!/bin/bash
# Generate certificates for a list of names

TEMPLATE_ID="your-template-id"

while IFS= read -r name; do
    canvelete render \
        --template $TEMPLATE_ID \
        --data "{\"name\":\"$name\",\"date\":\"$(date +%Y-%m-%d)\"}" \
        --output "certificates/${name// /_}.pdf" \
        --format pdf
done < names.txt
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate Social Images
  env:
    CANVELETE_API_KEY: ${{ secrets.CANVELETE_API_KEY }}
  run: |
    npm install -g canvelete-cli
    canvelete render --design ${{ env.DESIGN_ID }} --output social.png
```

### Watch and Auto-Render

```bash
# Watch a JSON file and re-render on changes
canvelete watch data.json --design $DESIGN_ID --output preview.png

# Watch a directory for new files
canvelete watch-dir ./queue --design $DESIGN_ID --output-dir ./rendered --delete-after
```

### Batch Processing with Profiles

```bash
# Switch to production profile
canvelete profiles use production

# Run batch render
canvelete batch-render --file batch.json --output-dir ./output

# Switch back to development
canvelete profiles use development
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CANVELETE_API_KEY` | API key for authentication |
| `CANVELETE_BASE_URL` | Custom API base URL |
| `NO_COLOR` | Disable colored output |

## Troubleshooting

### Authentication Issues

```bash
# Check auth status
canvelete auth status

# Re-authenticate
canvelete auth logout
canvelete auth login
```

### Debug Mode

```bash
canvelete --debug designs list
```

### Common Errors

- **401 Unauthorized**: Invalid or expired API key
- **404 Not Found**: Design/template ID doesn't exist
- **429 Too Many Requests**: Rate limit exceeded, wait and retry

## All Commands

```
canvelete auth          Manage authentication
canvelete designs       Manage designs
canvelete templates     Browse and use templates
canvelete render        Render a design
canvelete renders       Manage render jobs
canvelete batch-render  Batch render multiple designs
canvelete export        Export design to file
canvelete export-all    Export to multiple formats
canvelete canvas        Manipulate canvas elements
canvelete assets        Manage assets
canvelete apikeys       Manage API keys
canvelete usage         View usage statistics
canvelete billing       View billing information
canvelete config        Manage CLI configuration
canvelete profiles      Manage multiple profiles
canvelete init          Initialize a project
canvelete validate      Validate configuration
canvelete watch         Watch file and auto-render
canvelete watch-dir     Watch directory for batch
canvelete diff          Compare two designs
canvelete clone         Clone a design
canvelete whoami        Show current user
canvelete open          Open dashboard in browser
canvelete quick-render  Quick render shortcut
canvelete completion    Generate shell completion
```

## License

MIT

## Links

- [Documentation](https://docs.canvelete.com/cli)
- [API Reference](https://docs.canvelete.com/api)
- [GitHub](https://github.com/Canvelete/canvelete-cli)
