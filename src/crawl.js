import TwitterPipeline from "./twitter/TwitterPipeline.js";
import TweetProcessor from "./character/GenerateCharacter.js";
import fs from "fs/promises";
import { exit } from "process";
import { isRawTweetsFileExists } from "./twitter/utils.js";
const PROJECTS = [
  // "AIasssss",
  // "evita3400000",
  // "goatofgamblers",
  // "aiagentmeme",
  // "0xRogueAgent",
  // "agentipy",
  // "joinFXN",
  // "financewizardio",
  // "ASYM41b07",
  // "homo_memetus",
  // "aitrd_agent",
  // "PoodonkAI",
  // "my_solana_agent",
  // "TheCoveQuant",
  // "the1aiagent",
  // "dantegpu",
  // "GigaBrainDotSo",
  // "nerobossai",
  // "DruidAi_APP",
  // "AioraAI",
  // "sqrfund_ai"
  // "swarms_corp",
  "KyeGomezB"
];
async function main() {
  const data = await readJsonlFile("projectsWithTwitterInfo.json");
  console.log(`data: ${JSON.stringify(data.projects[0])}`);
  const projects = data.projects
    .map((project) => {
      if (project.VerifiedLink.X) return project?.TwitterInfo?.Username;
    })
    .filter((username) => username);
  console.log(`Processing ${projects.length} projects...`);
  console.log(`Projects: ${JSON.stringify(projects)}`);

  for (const username of PROJECTS) {
    try {
      const pipeline = new TwitterPipeline();
      const date = new Date().toISOString().split("T")[0];
      const pathFile = `characters/${username}.json`;
      if (await isRawTweetsFileExists(pathFile)) {
        console.log(`Raw tweets for ${username} already exist`);
        continue;
      }
      const taskId = `task_${username}_${Date.now()}`; // Unique task ID
      await pipeline.initializeOrganizer(username);
      await pipeline.initializeScraper(username);

      console.log(`Downloading raw tweets for ${username}`);
      await pipeline.run(username, taskId);

      console.log(`Processing tweets for ${username} from ${date}`);
      const tweetProcessor = new TweetProcessor(username, date);
      // Generate character
      await tweetProcessor.processTweets(
        pipeline.messageExamplesCrawler.messageExamples
      );
    } catch (error) {
      console.error(
        `Failed to process tweets for ${username}: ${error.message}`
      );
      continue;
    }
  }

  console.log("All projects processed successfully.");
  exit(0);
}

async function readJsonlFile(path) {
  const existingData = await fs.readFile(path, "utf-8");
  return JSON.parse(existingData);
}

main();
