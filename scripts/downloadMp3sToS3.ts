import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { ReadableStream } from 'stream/web'; // For type compatibility with fetch response body

// --- Configuration ---
// These will be populated by environment variables in the GitHub Action
const s3Config = {
  endpoint: process.env.S3_ENDPOINT_URL, // For S3-compatible services
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  bucketName: process.env.S3_BUCKET_NAME || '',
  pathPrefix: process.env.S3_PATH_PREFIX || 'podcasts/', // Default to 'podcasts/'
};

const RESULTS_DIR = path.resolve(process.cwd(), 'results');
const MAX_CONCURRENT_DOWNLOADS_UPLOADS = 3; // Limit concurrency to avoid overwhelming resources

interface PodcastItem {
  itemTitle: string;
  media: string | null;
  showNotes?: string;
  itemLink?: string;
}

interface FeedData {
  feedTitle: string;
  updateStatus: number;
  data: PodcastItem[];
}

interface WeeklyJson {
  weekNumber: number;
  results: FeedData[];
}

// --- Utility Functions ---
function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are problematic for filenames or S3 keys
  let sanitized = filename
    .replace(/[^\w\s.-]/gi, '_') // Replace non-alphanumeric (excluding whitespace, dot, hyphen) with underscore
    .replace(/\s+/g, '_'); // Replace spaces with underscores
  // Ensure it's not too long (S3 keys have a limit, though filenames usually shorter)
  return sanitized.substring(0, 200); // Truncate if very long
}

async function getLatestJsonFile(): Promise<string | null> {
  try {
    const files = await fs.readdir(RESULTS_DIR);
    const jsonFiles = files
      .filter((file) => file.endsWith('.json') && /^\d+\.json$/.test(file))
      .map((file) => ({
        name: file,
        week: parseInt(file.replace('.json', ''), 10),
      }))
      .sort((a, b) => b.week - a.week); // Sort descending by week number

    if (jsonFiles.length > 0) {
      return path.join(RESULTS_DIR, jsonFiles[0].name);
    }
    console.log('No JSON files found in results directory.');
    return null;
  } catch (error) {
    console.error('Error reading results directory:', error);
    return null;
  }
}

async function downloadFile(url: string, attempt = 1): Promise<Buffer | null> {
  const maxAttempts = 3;
  try {
    console.log(`Downloading: ${url} (Attempt ${attempt})`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error(`No response body for ${url}`);
    }
    // Convert Web API ReadableStream to Node.js Readable, then to Buffer
    const nodeReadable = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    const chunks: Buffer[] = [];
    for await (const chunk of nodeReadable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    if (attempt < maxAttempts) {
      console.log(`Retrying download for ${url} in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return downloadFile(url, attempt + 1);
    }
    return null;
  }
}

async function uploadToS3(s3Client: S3Client, buffer: Buffer, feedTitle: string, itemTitle: string): Promise<string | null> {
  const baseFilename = sanitizeFilename(`${feedTitle}_-_${itemTitle}.mp3`);
  // Ensure pathPrefix ends with a slash if it's not empty
  let keyPrefix = s3Config.pathPrefix;
  if (keyPrefix && !keyPrefix.endsWith('/')) {
    keyPrefix += '/';
  }
  const s3Key = `${keyPrefix}${baseFilename}`;

  try {
    console.log(`Uploading ${s3Key} to S3 bucket ${s3Config.bucketName}...`);
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: 'audio/mpeg', // Assuming MP3
    });
    await s3Client.send(command);
    console.log(`Successfully uploaded ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error uploading ${s3Key} to S3:`, error);
    return null;
  }
}

// --- Main Logic ---
async function main() {
  console.log('Starting MP3 download and S3 upload process...');

  // Validate S3 configuration
  if (!s3Config.credentials.accessKeyId || !s3Config.credentials.secretAccessKey || !s3Config.bucketName || !s3Config.endpoint) {
    console.error('S3 configuration (access key, secret key, bucket name, or endpoint URL) is missing. Please set environment variables: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_ENDPOINT_URL.');
    process.exit(1);
  }

  const s3Client = new S3Client({
    endpoint: s3Config.endpoint,
    region: s3Config.region,
    credentials: s3Config.credentials,
  });

  const latestJsonPath = await getLatestJsonFile();
  if (!latestJsonPath) {
    console.log('No JSON file to process. Exiting.');
    return;
  }

  console.log(`Processing JSON file: ${latestJsonPath}`);
  let jsonData: WeeklyJson;
  try {
    const fileContent = await fs.readFile(latestJsonPath, 'utf-8');
    jsonData = JSON.parse(fileContent) as WeeklyJson;
  } catch (error) {
    console.error(`Error reading or parsing JSON file ${latestJsonPath}:`, error);
    return;
  }

  const mp3Tasks: { url: string; feedTitle: string; itemTitle: string }[] = [];

  jsonData.results.forEach(feed => {
    feed.data.forEach(item => {
      if (item.media && item.media.endsWith('.mp3')) { // Basic check for MP3
        mp3Tasks.push({
          url: item.media,
          feedTitle: feed.feedTitle,
          itemTitle: item.itemTitle,
        });
      }
    });
  });

  if (mp3Tasks.length === 0) {
    console.log('No MP3 files found in the JSON data.');
    return;
  }

  console.log(`Found ${mp3Tasks.length} MP3 files to process.`);
  let successCount = 0;
  let failureCount = 0;

  // Process tasks with concurrency limit
  for (let i = 0; i < mp3Tasks.length; i += MAX_CONCURRENT_DOWNLOADS_UPLOADS) {
    const chunk = mp3Tasks.slice(i, i + MAX_CONCURRENT_DOWNLOADS_UPLOADS);
    await Promise.all(chunk.map(async (task) => {
      const buffer = await downloadFile(task.url);
      if (buffer) {
        const s3Key = await uploadToS3(s3Client, buffer, task.feedTitle, task.itemTitle);
        if (s3Key) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        failureCount++;
      }
    }));
  }

  console.log('--- Process Summary ---');
  console.log(`Successfully downloaded and uploaded: ${successCount} MP3s`);
  console.log(`Failed to process: ${failureCount} MP3s`);
  if (failureCount > 0) {
    console.log('Check logs above for specific errors on failed items.');
  }
  console.log('MP3 processing complete.');
}

main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});
