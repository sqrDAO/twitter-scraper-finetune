```markdown
# Project Overview

This folder contains a script for generating a character card based on a user's Twitter profile and tweets. The script leverages the OpenAI API to create a JSON object representing the user as a fictional character, which can be used for AI-driven interactions.

## File Descriptions

- **GenerateCharacter.js**: This script is responsible for fetching Twitter data, summarizing it, and using the OpenAI API to generate a character card in JSON format. It reads user profile information, recent tweets, and top tweets from local JSON files and then constructs a detailed prompt for the GPT model to output the character card. The generated character card is then saved to a JSON file.

## Usage Instructions

### GenerateCharacter.js

**Execution:**

```bash
npm run generate-character -- <username> <date>
```

- `<username>`: The Twitter username for which to generate the character card. Defaults to 'degenspartan' if not provided.
- `<date>`: The date in `YYYY-MM-DD` format for which the data was scraped. Defaults to the current date if not provided.

**Example:**

```bash
npm run generate-character -- VitalikButerin 2024-07-20
```

This command will generate a character card for the user `VitalikButerin` using the tweet data from `2024-07-20`.

## Dependencies

- **dotenv**: For loading environment variables from a `.env` file.
- **fs**: Node.js file system module for reading and writing files.
- **path**: Node.js path module for handling file paths.
- **url**: Node.js URL module for handling file URLs.
- **openai**: OpenAI's Node.js library for interacting with the OpenAI API.
- **chalk**: For adding colors to console output.
- **ora**: For creating a command-line spinner during the character generation process.
- **TwitterPipeline.js**: A custom module for fetching Twitter profile information.

## Additional Notes

- The script assumes that the necessary Twitter data (profile, tweets, and stats) are already scraped and available in the `pipeline` directory in JSON format.
- An `.env` file with `OPENAI_API_KEY` is required to use the OpenAI API.
- The output character card is saved in JSON format within the `pipeline/<username>/<date>/character/` directory.
- The script handles termination signals gracefully by logging out of the Twitter scraper to prevent any issues.
- The generated character card is designed to be used as a basis for an AI agent, providing context and specific guidelines for its behavior.
- The script uses `gpt-4o` model by default for character generation.
 
source repo: /app/agent/.repos/sqrDAO/twitter-scraper-finetune
```