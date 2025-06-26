# Namestone CSV Importer

A TypeScript tool to batch import profiles from CSV files to Namestone using their API.

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Edit `.env` file with your Namestone configuration:
```bash
NAMESTONE_DOMAIN=mydomain.eth
NAMESTONE_API_KEY=your-api-key-here
```

## Usage

### Development (with ts-node)
```bash
yarn dev <csv-file>
```

### Production (compiled)
```bash
yarn build
yarn start <csv-file>
```

### Example
```bash
yarn dev profiles.csv
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

## Configuration

Get your Namestone API key from your dashboard and set it in the `.env` file along with your domain.

## Error Handling

The script will:
- Stop on API errors and display detailed error messages
- Show individual profile errors while continuing with the batch
- Validate CSV file existence before processing