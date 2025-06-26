# Namestone CSV Importer

A TypeScript tool to batch import profiles from CSV files to Namestone using their API.

## Setup

1. Install dependencies:
```bash
yarn install
```

## Usage

### Development (with ts-node)
```bash
yarn dev <csv-file> <domain> <api-key>
```

### Production (compiled)
```bash
yarn build
yarn start <csv-file> <domain> <api-key>
```

### Example
```bash
yarn dev profiles.csv mydomain.eth your-namestone-api-key
```

## CSV Format

The CSV file should have the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| `ethereumAddress` | Yes | Ethereum address for the profile |
| `username` | Yes | Username/subdomain for Namestone |
| `profile_name` | No | Display name for the profile |
| `description` | No | Profile description |
| `avatar` | No | Avatar URL |
| `profile_created` | No | Creation timestamp |

### Example CSV:
```csv
ethereumAddress,username,profile_name,description,avatar,profile_created
0x00,user98,User,A sample user profile,https://example.com/avatar.jpg,2025-06-26T04:46:22.353Z
```

## Features

- Batch processing (50 profiles per request, max allowed by Namestone)
- Automatic rate limiting with 1-second delays between batches
- Error handling and detailed logging
- Maps CSV columns to Namestone text records:
  - `profile_name` → `display.name`
  - `description` → `description`
  - `avatar` → `avatar`
  - `profile_created` → `created`

## API Key

Get your Namestone API key from your dashboard and use it as the third argument.

## Error Handling

The script will:
- Stop on API errors and display detailed error messages
- Show individual profile errors while continuing with the batch
- Validate CSV file existence before processing