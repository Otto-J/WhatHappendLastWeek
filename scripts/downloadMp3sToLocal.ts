import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { ReadableStream } from 'stream/web'; // For type compatibility with fetch response body

const RESULTS_DIR = path.resolve(process.cwd(), 'results');
const MEDIA_DIR = path.resolve(process.cwd(), 'media'); // Download target directory
const MAX_CONCURRENT_DOWNLOADS = 5;

interface PodcastItem {
  itemTitle: string;
  media: string | null;
  // Other fields are not strictly necessary for this script's purpose
}

interface FeedData {
  feedTitle: string;
  data: PodcastItem[];
}

interface WeeklyJson {
  results: FeedData[];
}

// --- Utility Functions ---
function sanitizeFilename(feedTitle: string, itemTitle: string): string {
  // Remove or replace characters that are problematic for filenames
  let sanitized = `${feedTitle}_-_${itemTitle}`
    .replace(/[^\w\s.-]/gi, '_') // Replace non-alphanumeric (excluding whitespace, dot, hyphen) with underscore
    .replace(/\s+/g, '_'); // Replace spaces with underscores
  // Ensure it's not too long
  return sanitized.substring(0, 200) + '.mp3'; // Append .mp3 extension
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

async function downloadFileToLocal(url: string, filePath: string, attempt = 1): Promise<boolean> {
  const maxAttempts = 3;
  try {
    console.log(`Downloading: ${url} to ${filePath} (Attempt ${attempt})`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error(`No response body for ${url}`);
    }

    const nodeReadable = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    const fileStream = await fs.open(filePath, 'w');
    for await (const chunk of nodeReadable) {
      await fileStream.write(chunk);
    }
    await fileStream.close();
    console.log(`Successfully downloaded ${url} to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url} to ${filePath}:`, error);
    // Clean up partially downloaded file
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      // console.warn(`Could not clean up ${filePath}: ${cleanupError}`);
    }
    if (attempt < maxAttempts) {
      console.log(`Retrying download for ${url} in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return downloadFileToLocal(url, filePath, attempt + 1);
    }
    return false;
  }
}

// --- Main Logic ---
async function main() {
  console.log('Starting MP3 download to local media/ directory...');

  try {
    await fs.mkdir(MEDIA_DIR, { recursive: true }); // Ensure media directory exists
    console.log(`Media directory ensured at: ${MEDIA_DIR}`);
  } catch (error) {
    console.error(`Could not create media directory ${MEDIA_DIR}:`, error);
    process.exit(1);
  }

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

  const downloadTasks: { url: string; filePath: string }[] = [];

  jsonData.results.forEach(feed => {
    feed.data.forEach(item => {
      if (item.media && item.media.toLowerCase().endsWith('.mp3')) { // Basic check for MP3
        const filename = sanitizeFilename(feed.feedTitle, item.itemTitle);
        const fullFilePath = path.join(MEDIA_DIR, filename);
        downloadTasks.push({
          url: item.media,
          filePath: fullFilePath,
        });
      }
    });
  });

  if (downloadTasks.length === 0) {
    console.log('No MP3 files found in the JSON data to download.');
    return;
  }

  console.log(`Found ${downloadTasks.length} MP3 files to download.`);
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < downloadTasks.length; i += MAX_CONCURRENT_DOWNLOADS) {
    const chunk = downloadTasks.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
    await Promise.all(chunk.map(async (task) => {
      const success = await downloadFileToLocal(task.url, task.filePath);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }));
  }

  console.log('--- Download Summary ---');
  console.log(`Successfully downloaded: ${successCount} MP3s to ${MEDIA_DIR}`);
  console.log(`Failed to download: ${failureCount} MP3s`);
  if (failureCount > 0) {
    console.log('Check logs above for specific errors on failed items.');
  }
  console.log('Local MP3 download process complete.');
}

main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});
