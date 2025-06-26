#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface ProfileRow {
  address: string;
  username: string;
  profile_name: string;
  description: string;
  avatar?: string;
  profile_created: string;
}

interface NamestoneProfile {
  name: string;
  address: string;
  text_records: {
    'display.name'?: string;
    description?: string;
    avatar?: string;
    created?: string;
  };
}

const NAMESTONE_API_URL = 'https://namestone.com/api/public_v1/set-names';
const BATCH_SIZE = 50;

async function readCSV(filePath: string): Promise<ProfileRow[]> {
  return new Promise((resolve, reject) => {
    const results: ProfileRow[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

function convertToNamestoneProfile(row: any): NamestoneProfile {
  const textRecords: NamestoneProfile['text_records'] = {};
  
  if (row.profile_name) textRecords['display.name'] = row.profile_name;
  if (row.description) textRecords.description = row.description;
  if (row.avatar) textRecords.avatar = row.avatar;
  if (row.profile_created) textRecords.created = row.profile_created;

  // Handle CSV files with BOM by finding the address field dynamically
  let address = '';
  const keys = Object.keys(row);
  
  for (const key of keys) {
    if (key.toLowerCase().includes('address')) {
      address = row[key];
      break;
    }
  }

  return {
    name: row.username,
    address: address,
    text_records: textRecords
  };
}

async function batchImportProfiles(
  profiles: NamestoneProfile[], 
  domain: string, 
  apiKey: string,
  dryRun: boolean = false
): Promise<void> {
  const batches = [];
  
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    batches.push(profiles.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${profiles.length} profiles in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} profiles)...`);
    
    // Debug: show what we're sending
    if (dryRun) {
      console.log(`🔍 DRY RUN: Batch ${i + 1} (${batch.length} profiles)`);
      console.log('Sample data:', JSON.stringify(batch.slice(0, 1), null, 2));
    } else {
      try {
        const response = await axios.post(NAMESTONE_API_URL, {
          domain,
          names: batch
        }, {
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
          }
        });

        console.log(`✅ Batch ${i + 1} completed successfully`);
        
        if (response.data.errors && response.data.errors.length > 0) {
          console.log('⚠️  Some errors occurred:');
          response.data.errors.forEach((error: any) => {
            console.log(`  - ${error.name}: ${error.message}`);
          });
        }
      } catch (error: any) {
        console.error(`❌ Batch ${i + 1} failed:`, error.response?.data || error.message);
        throw error;
      }
    }

    // Add delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: yarn dev <csv-file> [--dry-run]');
    console.error('Example: yarn dev profiles.csv');
    console.error('Example (dry run): yarn dev profiles.csv --dry-run');
    console.error('Make sure to set NAMESTONE_DOMAIN and NAMESTONE_API_KEY in .env file');
    process.exit(1);
  }

  const csvFile = args[0];
  const dryRun = args.includes('--dry-run');
  const domain = process.env.NAMESTONE_DOMAIN;
  const apiKey = process.env.NAMESTONE_API_KEY;

  if (!domain || !apiKey) {
    console.error('Error: NAMESTONE_DOMAIN and NAMESTONE_API_KEY must be set in .env file');
    process.exit(1);
  }

  console.log(`Using domain: ${domain}`);
  console.log(`API key loaded: ${apiKey.substring(0, 8)}...`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual API calls will be made');
  }

  if (!fs.existsSync(csvFile)) {
    console.error(`Error: CSV file '${csvFile}' not found`);
    process.exit(1);
  }

  try {
    console.log(`Reading CSV file: ${csvFile}`);
    const rows = await readCSV(csvFile);
    
    console.log(`Found ${rows.length} profiles to import`);
    
    const profiles = rows.map(convertToNamestoneProfile);
    
    await batchImportProfiles(profiles, domain, apiKey, dryRun);
    
    if (dryRun) {
      console.log('🔍 DRY RUN completed - no changes were made');
    } else {
      console.log('🎉 Import completed successfully!');
    }
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}