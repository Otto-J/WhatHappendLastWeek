import { fetchLastWeekPodcast } from '../src/service/lastweek';

async function main() {
  console.log('Starting weekly podcast update...');
  try {
    const result = await fetchLastWeekPodcast();
    if (result.status) {
      console.log(`Successfully updated podcast data: ${result.msg}`);
      if (result.data) {
        console.log(`Week Number: ${result.data.weekNumber}`);
        console.log(`File created/updated: results/${result.data.weekNumber}.json`);
      } else if (result.file) {
        // Case where file already existed
        console.log(`File already existed: results/${result.file}`);
      }
    } else {
      console.error(`Failed to update podcast data: ${result.msg}`);
    }
  } catch (error) {
    console.error('An unexpected error occurred during the weekly update:', error);
    process.exit(1);
  }
}

main();
