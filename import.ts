#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface ProfileRow {
  ethereumAddress: string;
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

function convertToNamestoneProfile(row: ProfileRow): NamestoneProfile {
  const textRecords: NamestoneProfile['text_records'] = {};
  
  if (row.profile_name) textRecords['display.name'] = row.profile_name;
  if (row.description) textRecords.description = row.description;
  if (row.avatar) textRecords.avatar = row.avatar;
  if (row.profile_created) textRecords.created = row.profile_created;

  return {
    name: row.username,
    address: row.ethereumAddress,
    text_records: textRecords
  };
}

async function batchImportProfiles(
  profiles: NamestoneProfile[], 
  domain: string, 
  apiKey: string
): Promise<void> {
  const batches = [];
  
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    batches.push(profiles.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${profiles.length} profiles in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} profiles)...`);

    try {
      const response = await axios.post(NAMESTONE_API_URL, {
        domain,
        names: batch
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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

    // Add delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: yarn dev <csv-file>');
    console.error('Example: yarn dev profiles.csv');
    console.error('Make sure to set NAMESTONE_DOMAIN and NAMESTONE_API_KEY in .env file');
    process.exit(1);
  }

  const [csvFile] = args;
  const domain = process.env.NAMESTONE_DOMAIN;
  const apiKey = process.env.NAMESTONE_API_KEY;

  if (!domain || !apiKey) {
    console.error('Error: NAMESTONE_DOMAIN and NAMESTONE_API_KEY must be set in .env file');
    process.exit(1);
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
    
    await batchImportProfiles(profiles, domain, apiKey);
    
    console.log('🎉 Import completed successfully!');
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}