# Directory Structure
_Includes files where the actual content might be omitted. This way the LLM can still use the file structure to understand the project._
```
.
├── .env.example
├── .eslintrc.json
├── .stylelintrc.json
├── CONVENTIONS.md
├── docker-compose.yml
├── Dockerfile
├── eslint.config.js
├── IDEA.md
├── package-lock.json
├── package.json
├── pre_plugin_eslint.sh
├── pre_plugin_svelte.sh
├── precommit.sh
├── PROMPT_MOVE.md
├── README.md
├── run.sh
├── src
│   ├── app.d.ts
│   ├── app.html
│   ├── lib
│   │   ├── ai_interact.ts
│   │   ├── constants.ts
│   │   ├── stores
│   │   │   └── passwordStore.ts
│   │   └── TextCorrection.svelte
│   └── routes
│       ├── +page.svelte
│       ├── correct
│       │   └── +server.ts
│       └── favicon.ico
│           └── +server.ts
├── static
│   ├── favicon.png
│   ├── global.css
│   └── script.js
├── stylelint.config.js
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── wrangler.toml
```

# File Contents

## File: `.env.example`
```
VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
VITE_USER_PWD=set some password
VITE_INPUT_PREFILL="Hello ho are you my friend It has been quite some time we saw each other."
VITE_LLM_DIRECTION_LIST="answer like a cowboy|answer like a comedian|answer like a 5 year old|formal academic tone|friendly and casual|professional business style|poetic and flowery"```

## File: `.eslintrc.json`
```
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "no-console": "warn",
    "eqeqeq": "error"
  }
} ```

## File: `.stylelintrc.json`
```
{
    "extends": "stylelint-config-standard"
}```

## File: `CONVENTIONS.md`
```
# Engineering Conventions

## Current Conventions for the specific state of this project 
The idea here is to create a Proof of Concept for a simple mini application.

So there is no need for a complex structure.
There is no need for databases and things that might be interesting later when this stays and grows.```

## File: `docker-compose.yml`
```
services:
  voice-correct-sk:
    build:
      context: .
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    ports:
      - "5173:5173"
```

## File: `Dockerfile`
```
FROM node:20-slim

WORKDIR /app

COPY package*.json ./

COPY src /app/src
COPY static /app/static
COPY *.config.js /app/
RUN npm ci
RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
```

## File: `eslint.config.js`
```
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Node globals
        process: 'readonly',
        __dirname: 'readonly',
        // Markdown
        showdown: 'readonly',
        // ES2022 globals
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly'
      }
    },
    rules: {
      // Error prevention
      'no-undef': 'error',
      //   "no-unused-vars": "warn", // false positives when used in html and js is separate files
      
      // Style consistency 
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
    //   "no-console": "warn" // i am ok with console.log
    }
  }
]; ```

## File: `IDEA.md`
```
# Voice Correction POC

## Main thoughts

I would like to create a POC based on the following description. I need an HTML page that has two text areas.
In the first text area, the user can type text, and then this text is regularly sent to a backend service, and getting a response that is then put into the second text area. The overall idea is to have a kind of a live text correction, and if the text, for example, is spoken into the first text area by the user's Android voice-to-text feature, I would like to have a corrected version of punctuations and stuff that usually goes wrong in the second text area. And the backend basically takes the text, sends it to an LLM provider service like Google Gemini, and asks it to correct the text, and returns the corrected text via the API to the HTML page.

## Detailed ideas for the POC

Let's start with an extremely simple approach. Please create the HTML page and a very simple Python endpoint. Also provide me with pyproject.tomr with Python 3.11 and all the necessary libraries in the most up-to-date recent versions.
ChatGPT said:
ChatGPT
Great! Here's a simple setup to get you started. Below is the HTML page, a simple Python backend using FastAPI, and a pyproject.toml file to manage the project dependencies.

HTML Page (index.html)
This page contains two text areas and uses JavaScript to send text from the first area to the backend every 2 seconds.

html
Copy code
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Text Correction</title>
</head>
<body>
    <h1>Live Text Correction</h1>
    <div>
        <label for="inputText">Input Text:</label><br>
        <textarea id="inputText" rows="10" cols="50"></textarea>
    </div>
    <br>
    <div>
        <label for="correctedText">Corrected Text:</label><br>
        <textarea id="correctedText" rows="10" cols="50" readonly></textarea>
    </div>

    <script>
        const inputTextArea = document.getElementById('inputText');
        const correctedTextArea = document.getElementById('correctedText');

        function sendTextForCorrection() {
            const text = inputTextArea.value;

            fetch('http://127.0.0.1:8000/correct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text }),
            })
            .then(response => response.json())
            .then(data => {
                correctedTextArea.value = data.corrected_text;
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }

        setInterval(sendTextForCorrection, 2000);  // Send text every 2 seconds
    </script>
</body>
</html>
Simple Python Backend (main.py)
This is a basic FastAPI app with an endpoint that accepts the text, and for now, just returns the same text back as the "corrected" version. You can later replace this with a call to an LLM service like Google Gemini.

python
Copy code
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str

class TextResponse(BaseModel):
    corrected_text: str

@app.post("/correct", response_model=TextResponse)
def correct_text(request: TextRequest):
    # Simulate correction (in future, replace this with actual LLM API call)
    corrected_text = request.text  # For now, just return the same text
    return TextResponse(corrected_text=corrected_text)

pyproject.toml
toml
Copy code
[tool.poetry]
name = "live-text-correction"
version = "0.1.0"
description = "A live text correction app"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"
python = "^3.11"

[tool.poetry.dependencies]
fastapi = "^0.100.0"
uvicorn = "^0.23.0"
pydantic = "^2.1.1"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"```

## File: `package-lock.json`
```
Content omitted due to reason: OMIT_CONTENT_PATTERN: package-lock.json
```

## File: `package.json`
```
{
  "name": "live-text-correction",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest",
    "p": "sh precommit.sh",
    "pdev": "npm run p && npm run dev",
    "pprev": "npm run p && npm run preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-cloudflare": "5.*",
    "@sveltejs/kit": "2.*",
    "@sveltejs/vite-plugin-svelte": "5.*",
    "@types/node": "22.*",
    "svelte": "5.*",
    "svelte-check": "4.*",
    "svelte-preprocess": "6.*",
    "typescript": "5.*",
    "vite": "6.*",
    "vitest": "2.*",
    "wrangler": "3.*"
  },
  "type": "module",
  "dependencies": {
    "@google/generative-ai": "0.*",
    "eslint-plugin-unused-imports": "^4.1.4"
  }
}
```

## File: `pre_plugin_eslint.sh`
```
#!/bin/bash

set -euo pipefail

# Check if eslint is installed globally
if ! (npm list -g --depth=0 | grep -q "eslint" > /dev/null); then
    echo
    echo "Installing 'eslint' globally"
    echo
    npm install -g eslint
fi

# Check if eslint-plugin-unused-imports is installed locally
if ! (npm list --depth=0 | grep -q "eslint-plugin-unused-imports" > /dev/null 2>&1); then
    echo
    echo "Installing 'eslint-plugin-unused-imports' locally"
    echo
    npm install eslint-plugin-unused-imports
fi

PLUGIN_NAME="ESLint"
echo
FILE_FILTER_COMMAND="find ./ -maxdepth 1 -name '*.js'"
FILE_FILTER_FILES=$(eval "$FILE_FILTER_COMMAND")
FILE_FILTER_FILE_COUNT=$(wc -l <<< "$FILE_FILTER_FILES" | awk '{print $1}')
echo "Running Plugin $PLUGIN_NAME on $FILE_FILTER_FILE_COUNT files ..."
echo
if [ -n "$FILE_FILTER_FILES" ]; then
    eslint --fix $FILE_FILTER_FILES
    ESLINT_STATUS=$?
    if [ $ESLINT_STATUS -ne 0 ]; then
        echo "$PLUGIN_NAME check failed."
        exit 1
    fi
else
    echo "No files to lint with $PLUGIN_NAME."
fi

exit 0
```

## File: `pre_plugin_svelte.sh`
```
#!/bin/bash

set -euo pipefail

# Run checks
echo "Running npm build and npm run check in parallel..."
npm run build & BUILD_PID=$!
npm run check & CHECK_PID=$!
npm install & INSTALL_PID=$!

# Wait for both processes to finish
wait $BUILD_PID
BUILD_STATUS=$?
wait $CHECK_PID
CHECK_STATUS=$?
wait $INSTALL_PID
INSTALL_STATUS=$?

# Check the exit status of npm build
if [ $BUILD_STATUS -ne 0 ]; then
    echo "npm build failed. Aborting."
    exit 1
fi

# Check the exit status of npm run check
if [ $CHECK_STATUS -ne 0 ]; then
    echo "npm run check failed. Aborting."
    exit 1
fi

if [ $INSTALL_STATUS -ne 0 ]; then
    echo "npm install failed. Aborting."
    exit 1
fi

echo "Pre-commit checks passed successfully."
exit 0
```

## File: `precommit.sh`
```
#!/bin/bash

# Function to install the pre-commit hook
install_hook() {
    HOOK_DIR=".git/hooks"
    HOOK_PATH="$HOOK_DIR/pre-commit"

    # Create hooks directory if it doesn't exist
    mkdir -p "$HOOK_DIR"

    # Create the pre-commit hook
    cat > "$HOOK_PATH" << EOL
#!/bin/bash
$(dirname "\$0")/precommit.sh
EOL

    # Make the hook executable
    chmod +x "$HOOK_PATH"

    echo "Pre-commit hook installed successfully."
}

# Function to uninstall the pre-commit hook
uninstall_hook() {
    HOOK_PATH=".git/hooks/pre-commit"
    rm -f "$HOOK_PATH"
    echo "Pre-commit hook uninstalled successfully."
}

# Check if the script is called with 'install' parameter
if [ "$1" = "install" ]; then
    install_hook
    exit 0
fi

# Check if the script is called with 'uninstall' parameter
if [ "$1" = "uninstall" ]; then
    uninstall_hook
    exit 0
fi

get_plugin_core_name() {
    echo "$(basename "$1" | sed 's/pre_plugin_\(.*\)\.sh/\1/')"
}

# Function to run a plugin and capture its output and status
run_plugin() {
    plugin="$1"
    # Ensure tmp_dir exists (should be created before calling this)
    if [ -z "$tmp_dir" ] || [ ! -d "$tmp_dir" ]; then
        printf "Error: tmp_dir is not set or does not exist.\n" >&2
        return 1 # Or exit, depending on desired behavior
    fi

    plugin_core_name=$(get_plugin_core_name "$plugin")
    printf " Starting plugin: %s" "$plugin_core_name" >&2

    # Check if plugin exists and is executable
    if [ ! -f "$plugin" ]; then
        printf "\nError: Plugin file %s does not exist\n" "$plugin" >&2
        return 1 # Indicate failure, but don't exit the main script
    fi

    if [ ! -x "$plugin" ]; then
        printf "\nError: Plugin file %s is not executable\n" "$plugin" >&2
        return 1 # Indicate failure
    fi

    printf "\n" >&2

    # Create temporary files INSIDE the main tmp_dir for easier cleanup
    # Metadata file (stores status, name, output file path)
    local result_meta_file
    result_meta_file=$(mktemp "$tmp_dir/result.XXXXXX")
    # Output file (stores raw stdout/stderr)
    local result_output_file="$result_meta_file.out"

    # Run the plugin and capture output
    # Use /bin/sh explicitly if needed, or just run directly if PATH is reliable
    "$plugin" > "$result_output_file" 2>&1
    local status=$? # Capture status immediately

    # Store metadata
    printf "name='%s'\n" "$plugin" > "$result_meta_file"
    # Store the PATH to the output file, not the content
    printf "output_file='%s'\n" "$result_output_file" >> "$result_meta_file"
    printf "status='%s'\n" "$status" >> "$result_meta_file"

    # Append the path to the metadata file to the central results list
    # This replaces the previous behavior of printing it to stdout
    printf "%s\n" "$result_meta_file" >> "$tmp_dir/results.txt"

    # Don't return status here, it's stored in the file
    # The caller should check the status read from the file later
}

# Function to render the output of a plugin
render_plugin_output() {
    result_meta_file="$1"
    # Default values in case sourcing fails or file is incomplete
    name=""
    output_file=""
    status=""

    # Check if meta file exists before sourcing
    if [ -f "$result_meta_file" ]; then
        # Source the temporary file to get the values
        # This is now safe as it only contains simple assignments
        . "$result_meta_file"
    else
        printf "\n\nError: Result metadata file not found: %s\n" "$result_meta_file" >&2
        return
    fi

    local plugin_core_name
    plugin_core_name=$(get_plugin_core_name "$name")
    printf "\n\nPlugin finished with exit code %s: %s" "$status" "$plugin_core_name"
    printf "\n=================================\n"

    # Check if output file exists before catting
    if [ -f "$output_file" ]; then
        # Use cat to print the output, indented
        # Using printf ensures consistent handling of special chars like %
        # Using sed ensures indentation
        printf "%s" "$(cat "$output_file")" | sed 's/^/  /'
        printf "\n" # Ensure a newline after the output
    else
        printf "  Error: Output file not found: %s\n" "$output_file" >&2
    fi
}

# Function to generate the summary table in Markdown format
generate_summary_table() {
    echo ""
    echo "## Plugin Summary"
    echo ""
    
    # Print table header with borders
    printf "+----------------------+----------+\n"
    printf "| %-20s | %-8s |\n" "Plugin" "Status"
    printf "+----------------------+----------+\n"
    
    # Read results meta file paths
    while IFS= read -r result_meta_file; do
        [ ! -f "$result_meta_file" ] && continue

        # Initialize variables for safety
        name=""
        status=""
        output_file=""

        # Source the meta file (safe now)
        . "$result_meta_file"

        # Determine status text
        local status_text="Success"
        # Check status first (more reliable than parsing output)
        # Ensure status is treated as a number
        if ! [[ "$status" =~ ^[0-9]+$ ]]; then
             status_text="Unknown" # Status wasn't a number
        elif [ "$status" -ne 0 ]; then
             status_text="Failed"
        # Only check output file content if status was 0 and file exists
        elif [ -f "$output_file" ] && grep -q "No files to lint" "$output_file"; then
             status_text="No files"
        elif [ ! -f "$output_file" ]; then
             status_text="No output" # Output file missing, even if status is 0
        fi

        local name_core_plugin
        name_core_plugin=$(get_plugin_core_name "$name")
        printf "| %-20s | %-8s |\n" "$name_core_plugin" "$status_text"
    done < "$tmp_dir/results.txt"

    # Print table footer
    printf "+----------------------+----------+\n"
}

# Run checks
echo "Running checks..."

# Initialize array for plugin results
declare -a plugin_results

# Create a temporary directory for results
tmp_dir=$(mktemp -d)
touch "$tmp_dir/results.txt" # Ensure results file exists
# Export tmp_dir so background processes can access it
export tmp_dir
trap 'rm -rf "$tmp_dir"' EXIT

# Store list of plugins in a temporary file
chmod +x *.sh
find . -maxdepth 1 -type f -name "pre_plugin_*.sh" -print0 > "$tmp_dir/plugins.txt"

echo

# Process each plugin in parallel
counter=0

# Convert null-separated values to newline-separated in a temporary file
tr '\0' '\n' < "$tmp_dir/plugins.txt" > "$tmp_dir/plugins_nl.txt"

# Read from the newline-separated file
while read -r plugin; do
    counter=$((counter+1))
    # Run plugin in the background
    run_plugin "$plugin" &
done < "$tmp_dir/plugins_nl.txt"

# Wait for all background plugin processes to complete
wait

# Read results into array (now reading from the file populated by the plugins)
while IFS= read -r result_file; do
    plugin_results+=("$result_file")
done < "$tmp_dir/results.txt"

# Wait for all plugins to finish and render output
for result_file in "${plugin_results[@]}"; do
    render_plugin_output "$result_file"
done

# Generate summary table
generate_summary_table

# Check if any plugin failed
check_plugin_failures() {
    local failed=0
    local status

    for result_meta_file in "${plugin_results[@]}"; do
        # Reset status for each loop iteration
        status=""
        if [ -f "$result_meta_file" ]; then
             . "$result_meta_file"
             # Check if status is non-zero (and numeric)
             if [[ "$status" =~ ^[0-9]+$ ]] && [ "$status" -ne 0 ]; then
                 failed=1
             fi
        else
             : # Do nothing, or log error
        fi
    done
    return $failed
}

echo
if ! check_plugin_failures; then
    echo "Pre-commit checks failed."
    exit 1
fi

# Trap handles cleanup of tmp_dir and its contents

echo "Pre-commit checks passed successfully."
exit 0
```

## File: `PROMPT_MOVE.md`
```
this project is currently implemented in python as backend.

I need this very same functionality to be implemented as sveltekit application

use every file you need from template static and main.py and IDEA.md

make a full recreate

MANUAL: I updated the versions in package.json to "*"```

## File: `README.md`
```
# Voice Correction POC

## Project Overview

This project is a Proof of Concept (POC) for a Voice Correction application. It aims to provide real-time text correction, particularly useful for improving the output of voice-to-text features on devices like Android smartphones.

## Features

- Web-based interface with two text areas:
  - Input area for user text (can be populated by voice-to-text)
  - Output area displaying corrected text
- Live text correction with regular updates
- Integration with Google's Generative AI for text correction

## Technical Stack

- Frontend: SvelteKit
- Backend: SvelteKit server-side rendering
- LLM Integration: Google Generative AI

## Project Structure

- `src/routes/+page.svelte`: Main web interface
- `src/routes/+page.server.js`: Server-side logic for text correction
- `src/lib/TextCorrection.svelte`: Reusable component for text correction
- `static/global.css`: Global styles
- `package.json`: Project dependencies and configuration

## Setup and Installation

1. Ensure you have Node.js installed
2. Clone this repository
3. Run `npm install` to set up the project dependencies
4. Set up your Google Generative AI API key (instructions below)

## Usage

1. Set your Google Generative AI API key as an environment variable:
   ```
   export GOOGLE_AI_API_KEY=your_api_key_here
   ```
2. Start the development server:
   ```
   npm run dev
   ```
3. Open a web browser and navigate to `http://localhost:5173`

## Current Status

This project is a functional Proof of Concept. The basic structure is in place, and it's integrated with the Google Generative AI for text correction.

## Future Enhancements

- Improved error handling and user feedback
- Performance optimizations for real-time corrections
- Additional features leveraging Google's Generative AI capabilities

## Contributing

This is a POC project. For major changes, please open an issue first to discuss what you would like to change.

## License

[License information to be added]
```

## File: `run.sh`
```
#!/bin/bash

npm run dev -- --open
```

## File: `src/app.d.ts`
```
/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'marked';

export {};
```

## File: `src/app.html`
```
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link href="https://eu-static.ai4you.app/bootstrap-5.3.3/bootstrap.min.css" rel="stylesheet">
		<link href="https://eu-static.ai4you.app/bootstrap-icons-1.11.3/font/bootstrap-icons.css" rel="stylesheet">
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
		<script src="https://eu-static.ai4you.app/bootstrap-5.3.3/bootstrap.bundle.min.js"></script>
	</body>
</html>
```

## File: `src/lib/ai_interact.ts`
```
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY, AI_RETRY_MAX_ATTEMPTS } from "./constants";


export async function ask_ai(prompt: string, model_name: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: model_name });
  
  return make_call_to_ai_with_retry(model, prompt);
}

async function make_call_to_ai_with_retry(model: any, prompt: string): Promise<string> {
    let attempts = 0;
    
    while (true) {
        try {
            const result = await model.generateContent(prompt);
            const correctedText = result.response.text();
            return correctedText;
        } catch (error) {
            attempts++;
            if (attempts === AI_RETRY_MAX_ATTEMPTS) {
                console.error(`Failed to generate content after ${AI_RETRY_MAX_ATTEMPTS} attempts:`, error);
                throw error;
            }
            console.error(`Current attempt: ${attempts} of ${AI_RETRY_MAX_ATTEMPTS} failed to generate content:`, error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}```

## File: `src/lib/constants.ts`
```
export const GEMINI_API_KEY: string = import.meta.env.VITE_GEMINI_API_KEY;
export const AI_RETRY_MAX_ATTEMPTS: number = 5;
export const INPUT_PREFILL: string = import.meta.env.VITE_INPUT_PREFILL || '';
export const LLM_DIRECTION_LIST: string = import.meta.env.VITE_LLM_DIRECTION_LIST || '';
```

## File: `src/lib/stores/passwordStore.ts`
```
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const storedPassword = browser ? localStorage.getItem('sitePassword') : null;
export const password = writable(storedPassword || '');

password.subscribe((value) => {
  if (browser) {
    localStorage.setItem('sitePassword', value);
  }
});```

## File: `src/lib/TextCorrection.svelte`
```
<script lang="ts">
  import { INPUT_PREFILL, LLM_DIRECTION_LIST } from "./constants";
  import { password } from '$lib/stores/passwordStore';
  let inputText = INPUT_PREFILL;
  let correctedText = '';
  let error = '';
  let isLoading = false;
  let llmDirection = '';
  const llmDirectionList = LLM_DIRECTION_LIST.split('|');
  let previousHash = ''; // Holds the hash from the previous input fields

  let formAction: ReturnType<typeof setTimeout> | undefined;

  $: {
    clearTimeout(formAction);
    if (inputText.trim() !== '') {
      formAction = setTimeout(handleSubmit, 500);
    } else {
      correctedText = '';
    }
  }

  function handleBlur(event: FocusEvent) {
    if (event.target instanceof HTMLInputElement) {
      if (event.target.id === 'password' || event.target.id === 'llmDirection') {
        handleSubmit();
      }
    }
  }

  function getPassword() {
    return $password ? $password.trim() : '';
  }

  async function handleSubmit() {
    isLoading = true;
    const formData = new FormData();
    formData.append('text', inputText);
    formData.append('password', getPassword());
    formData.append('llmDirection', llmDirection);
    if (inputText.trim() === '') {
      correctedText = '';
      isLoading = false;
      return;
    }

    const currentHash = `${inputText.trim()}|${getPassword()}|${llmDirection.trim()}`;
    
    if (currentHash === previousHash) {
      isLoading = false;
      return;
    }

    previousHash = currentHash;
    try {
      const response = await fetch('/correct', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        correctedText = result.correctedText;
        error = '';
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'An error occurred during text correction';
    } finally {
      isLoading = false;
    }
  }
</script>
<div class="card shadow-sm">
  <div class="card-body">
    <!-- Password Section -->
    <div class="mb-4">
      <div class="row align-items-center">
        <div class="col-auto">
          <i class="bi bi-shield-lock text-primary fs-5"></i>
        </div>
        <div class="col">
          <label for="password" class="form-label fw-semibold mb-1">Authentication</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            class="form-control" 
            placeholder="Enter your password"
            bind:value={$password} 
            on:blur={handleBlur}
          >
        </div>
      </div>
    </div>

    <!-- Input Text Section -->
    <div class="mb-4">
      <div class="d-flex align-items-center mb-2">
        <i class="bi bi-pencil-square text-success fs-5 me-2"></i>
        <label for="inputText" class="form-label fw-semibold mb-0">Input Text</label>
      </div>
      <textarea 
        id="inputText" 
        name="text" 
        rows="8" 
        class="form-control" 
        placeholder="Type or paste your text here for correction..."
        bind:value={inputText}
      ></textarea>
      <div class="form-text">
        <small class="text-muted">
          <i class="bi bi-info-circle me-1"></i>
          Text will be automatically corrected as you type
        </small>
      </div>
    </div>

    <!-- Style Direction Section -->
    <div class="mb-4">
      <div class="d-flex align-items-center mb-2">
        <i class="bi bi-palette text-warning fs-5 me-2"></i>
        <label for="llmDirection" class="form-label fw-semibold mb-0">Style Direction</label>
        <span class="badge bg-light text-muted ms-2">Optional</span>
      </div>
      <input 
        type="text" 
        id="llmDirection" 
        name="llmDirection" 
        class="form-control mb-2" 
        placeholder="e.g., formal tone, casual style, professional writing"
        bind:value={llmDirection} 
        on:blur={handleBlur}
      >
      <select 
        class="form-select"
        on:change={(e) => {
          if (e.target instanceof HTMLSelectElement && e.target.value !== 'default') {
            llmDirection = e.target.value;
            e.target.value = 'default';
            handleSubmit();
          }
        }}
      >
        <option value="default">Choose from templates...</option>
        {#each llmDirectionList as direction}
          <option value={direction}>{direction}</option>
        {/each}
      </select>
    </div>

    <!-- Output Text Section -->
    <div class="mb-3">
      <div class="d-flex align-items-center mb-2">
        <i class="bi bi-check-circle text-primary fs-5 me-2"></i>
        <label for="correctedText" class="form-label fw-semibold mb-0">Corrected Text</label>
        {#if isLoading}
          <div class="spinner-border spinner-border-sm text-primary ms-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        {/if}
      </div>
      <textarea 
        id="correctedText" 
        rows="8" 
        class="form-control" 
        readonly 
        value={correctedText}
        placeholder="Corrected text will appear here..."
      ></textarea>
      {#if correctedText}
        <div class="d-flex justify-content-end mt-2">
          <button 
            class="btn btn-outline-primary btn-sm"
            on:click={() => navigator.clipboard.writeText(correctedText)}
          >
            <i class="bi bi-clipboard me-1"></i>
            Copy to Clipboard
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if error}
  <div class="alert alert-danger mt-3" role="alert">
    <i class="bi bi-exclamation-triangle me-2"></i>
    {error}
  </div>
{/if}

<style>
  /* Custom styles for enhanced appearance */
  .card {
    border: none;
    border-radius: 12px;
  }
  
  .form-control, .form-select {
    border-radius: 8px;
    border: 1px solid #e0e6ed;
    transition: all 0.2s ease;
  }
  
  .form-control:focus, .form-select:focus {
    border-color: #0d6efd;
    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.1);
  }
  
  .btn {
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .alert {
    border-radius: 8px;
    border: none;
  }
</style>
```

## File: `src/routes/+page.svelte`
```
<script lang="ts">
  import TextCorrection from '$lib/TextCorrection.svelte';
</script>

<div class="container-fluid bg-light min-vh-100">
  <div class="row justify-content-center">
    <div class="col-12 col-lg-10 col-xl-8">
      <div class="text-center py-4">
        <h1 class="display-4 fw-bold text-primary mb-2">Voice Correction</h1>
        <p class="lead text-muted">Enhance your text with AI-powered corrections</p>
      </div>
      <TextCorrection />
    </div>
  </div>
</div>
```

## File: `src/routes/correct/+server.ts`
```
import { ask_ai } from '$lib/ai_interact';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GEMINI_API_KEY } from '$lib/constants';

const USER_PWD = import.meta.env.VITE_USER_PWD;

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.formData();
  const text = data.get('text');
  const password = data.get('password');
  const llmDirection = data.get('llmDirection');

  const checkResult = await perform_checks(text, password);
  if (!checkResult.success) {
    return json(checkResult, { status: checkResult.status });
  }
  return correct_text(text, llmDirection);
};

const correct_text = async (text: FormDataEntryValue | null, llmDirection: FormDataEntryValue | null) => {
  try {

    let prompt = ``;
    
    prompt += `Correct the following user input, focusing on punctuation and grammar and only return the corrected text also if the input is incomplete:\n`;
    prompt += `User input: "${text}"\n\n`;

    if (llmDirection && typeof llmDirection === 'string' && llmDirection.trim() !== '') {
      prompt += `Please use the following direction to influence the tone or style of the corrected text, without mentioning or acting out the direction itself:\n`;
      prompt += `"${llmDirection}"\n`;
      prompt += `Apply this direction subtly to modify the tone of the corrected text, but do not alter the original meaning or content.\n\n`;
    }

    console.log(prompt);

    const correctedText = await ask_ai(prompt, "gemini-2.0-flash")
      .then(text => cleanCorrectedTextResult(text));

    return json({ success: true, correctedText });
  } catch (error) {
    console.error('Error occurred during text correction:', error);
    return json({ success: false, error: 'An error occurred during text correction' }, { status: 500 });
  }
};

const cleanCorrectedTextResult = (text: string) => {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
    cleanedText = cleanedText.slice(1, -1);
  }
  return cleanedText;
};

const perform_checks = async (text: FormDataEntryValue | null, password: FormDataEntryValue | null) => {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return { success: false, error: 'Configuration is not correct.', status: 500 };
  }
  // Check password
  if (password !== USER_PWD) {
    console.error('Password is incorrect');
    // Add a delay to prevent brute force attacks
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay
    return { success: false, error: 'You are not authorized to use this service.', status: 401 };
  }

  if (typeof text !== 'string') {
    console.error('Invalid input - text is not a string');
    return { success: false, error: 'Invalid input - text is not a string', status: 400 };
  }

  return { success: true };
};```

## File: `src/routes/favicon.ico/+server.ts`
```
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
    throw redirect(301, '/favicon.png');
};
```

## File: `static/favicon.png`
```
Content omitted due to reason: OMIT_CONTENT_PATTERN: *.png
```

## File: `static/global.css`
```
body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #333;
}

textarea {
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

label {
    font-weight: bold;
}
```

## File: `static/script.js`
```
// This file is no longer needed in the SvelteKit version
```

## File: `stylelint.config.js`
```
/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-standard',
  rules: {
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'declaration-block-no-shorthand-property-overrides': true,
    'font-family-no-duplicate-names': true,
    'font-family-no-missing-generic-family-keyword': true,
    'function-calc-no-unspaced-operator': true,
    'function-linear-gradient-no-nonstandard-direction': true,
    'string-no-newline': true,
    'unit-no-unknown': true,
    'property-no-unknown': true,
    'declaration-block-no-duplicate-custom-properties': true,
    'no-duplicate-selectors': true,
    'no-empty-source': true,
    'no-invalid-double-slash-comments': true,
    'no-invalid-position-at-import-rule': true,
    'alpha-value-notation': 'percentage',
    'color-function-notation': 'modern',
    'length-zero-no-unit': true
  },
  ignoreFiles: ['node_modules/**/*'],
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  reportDescriptionlessDisables: true
};```

## File: `svelte.config.js`
```
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),
	
  kit: {
    adapter: adapter()
  }
};

export default config;
```

## File: `tsconfig.json`
```
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler"
	}
	// Path aliases are handled by https://kit.svelte.dev/docs/configuration#alias
	// except $lib which is handled by https://kit.svelte.dev/docs/configuration#files
	//
	// If you want to overwrite includes/excludes, make sure to copy over the relevant includes/excludes
	// from the referenced tsconfig.json - TypeScript does not merge them in
}
```

## File: `vite.config.ts`
```
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
});
```

## File: `wrangler.toml`
```
name = "voice-correct"
pages_build_output_dir = ".svelte-kit/cloudflare"
compatibility_date = "2025-01-01"

[vars]
VITE_INPUT_PREFILL="Hello ho are you my friend It has been quite some time we saw each other."
VITE_LLM_DIRECTION_LIST="answer like a cowboy|answer like a comedian|answer like a 5 year old|formal academic tone|friendly and casual|professional business style|poetic and flowery"
# secret - VITE_GEMINI_API_KEY = "---secret---"
# secret - VITE_USER_PWD = "---secret---"```
