import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { callLLM } from '$lib/server/llm.js';

const uploadDir = path.join(process.cwd(), 'data/uploads');
const dataDir = path.join(process.cwd(), 'data');
const tagsFilePath = path.join(dataDir, 'file-tags.json');

type FileTagMap = Record<string, string[]>;

interface FileMetadata {
  originalFilename: string;
  sourceMhtFile?: string;
  uploadedAt: number;
  extraction?: {
    summary: string;
    keyPoints: string[];
    categories: string[];
    extractedAt: number;
  };
}

interface ExtractionResult {
  summary: string;
  keyPoints: string[];
  categories: string[];
}

// File tags helper functions
async function ensureTagsDataFile(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(tagsFilePath)) {
    await writeFile(tagsFilePath, JSON.stringify({}, null, 2));
  }
}

async function getFileTagMap(): Promise<FileTagMap> {
  await ensureTagsDataFile();
  try {
    const raw = await readFile(tagsFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as FileTagMap;
    }
    return {};
  } catch {
    return {};
  }
}

async function saveFileTagMap(map: FileTagMap): Promise<void> {
  await ensureTagsDataFile();
  await writeFile(tagsFilePath, JSON.stringify(map, null, 2));
}

async function addTagsToFile(filename: string, newTags: string[]): Promise<void> {
  const map = await getFileTagMap();
  const existingTags = map[filename] || [];
  
  // Merge existing tags with new categories, avoiding duplicates
  const allTags = [...existingTags, ...newTags];
  const uniqueTags = Array.from(new Set(allTags.map(t => t.trim()).filter(Boolean)));
  
  map[filename] = uniqueTags;
  await saveFileTagMap(map);
}

// POST /api/extract - Extract content from a specific PDF file
export async function POST(event: RequestEvent) {
  try {
    const { filename } = await event.request.json();
    
    if (!filename) {
      return json({ message: 'Filename is required.' }, { status: 400 });
    }

    // Validate filename and ensure it's a PDF
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return json({ message: 'Only PDF files can be processed for extraction.' }, { status: 400 });
    }

    const filePath = path.join(uploadDir, filename);
    const metaPath = path.join(uploadDir, `${filename}.meta.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return json({ message: 'File not found.' }, { status: 404 });
    }

    // Check if extraction already exists
    let metadata: FileMetadata;
    try {
      const metaContent = await readFile(metaPath, 'utf-8');
      metadata = JSON.parse(metaContent);
      
      if (metadata.extraction) {
        return json({
          message: 'Extraction already exists.',
          extraction: metadata.extraction
        });
      }
    } catch {
      // Meta file doesn't exist or is invalid, create default metadata
      metadata = {
        originalFilename: filename,
        uploadedAt: Date.now()
      };
    }

    // Read PDF file and convert to base64 for LLM processing
    const fileBuffer = await readFile(filePath);
    const fileBase64 = fileBuffer.toString('base64');

    // Prepare file part for LLM
    const fileParts = [{
      mimeType: 'application/pdf',
      dataBase64: fileBase64
    }];

    // Extract content using LLM
    const extractionPrompt = `Please analyze this PDF document and extract the following information in JSON format:

{
  "summary": "A concise 2-3 sentence summary of the main content and purpose of this document",
  "keyPoints": ["List of 3-7 key points or main topics covered in the document"],
  "categories": ["List of 2-5 relevant categories or tags that describe the document type, subject area, or domain"]
}

Allowed categories:
- "AI Knowledge Management"
- "AI Agents"
- "AI Automation"
- "AI Tools"
- "Psychology"
- "Leadership"
- "Communication"
- "Teamwork"
- "Decision Making"
- "Problem Solving"
- "Creativity"
- "Innovation"
- "Organisation"
- "Productivity"
- "Research"
- "Strategy"
- "Marketing"
- "Sales"
- "Customer Support"

Guidelines:
- Summary should be informative but brief
- Key points should capture the most important information or topics
- Categories should be general enough to group similar documents together
- Return only valid JSON, no additional text or explanation`;

    const llmResponse = await callLLM(
      '', // No specific pool context needed
      [], // No chat history needed
      extractionPrompt,
      undefined, // Use default LLM config
      fileParts
    );

    // Parse the LLM response
    let extraction: ExtractionResult;
    try {
      // Extract JSON from the response (LLM might include some text before/after JSON)
      const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      extraction = JSON.parse(jsonMatch[0]);
      
      // Validate the extracted data
      if (!extraction.summary || !Array.isArray(extraction.keyPoints) || !Array.isArray(extraction.categories)) {
        throw new Error('Invalid extraction format');
      }
    } catch (parseError) {
      console.error('Failed to parse LLM extraction response:', parseError);
      console.error('LLM Response:', llmResponse.content);
      return json({ 
        message: 'Failed to parse extraction results from AI response.',
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 500 });
    }

    // Update metadata with extraction
    metadata.extraction = {
      ...extraction,
      extractedAt: Date.now()
    };

    // Save updated metadata
    await writeFile(metaPath, JSON.stringify(metadata, null, 2));

    // Add extracted categories as file tags
    try {
      await addTagsToFile(filename, extraction.categories);
    } catch (tagError) {
      console.warn('Failed to add categories as tags:', tagError);
      // Don't fail the extraction if tagging fails
    }

    return json({
      message: 'Extraction completed successfully.',
      extraction: metadata.extraction
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return json({ 
      message: 'An error occurred during extraction.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/extract - Get extraction status for all PDF files
export async function GET() {
  try {
    if (!fs.existsSync(uploadDir)) {
      return json([]);
    }

    const files = await fs.promises.readdir(uploadDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    const fileStatuses = await Promise.all(
      pdfFiles.map(async (filename) => {
        const metaPath = path.join(uploadDir, `${filename}.meta.json`);
        let hasExtraction = false;
        let extraction = null;
        
        try {
          const metaContent = await readFile(metaPath, 'utf-8');
          const metadata: FileMetadata = JSON.parse(metaContent);
          hasExtraction = !!metadata.extraction;
          extraction = metadata.extraction || null;
        } catch {
          // Meta file doesn't exist or is invalid
          hasExtraction = false;
        }
        
        return {
          filename,
          hasExtraction,
          extraction
        };
      })
    );

    return json(fileStatuses);
  } catch (error) {
    console.error('Error getting extraction status:', error);
    return json({ message: 'Error reading extraction status.' }, { status: 500 });
  }
}
