import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DiagramType, GeneratedContent, FileData, Message, Flashcard } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

// Helper to extract code from markdown blocks
const extractCodeBlock = (text: string): string => {
  const codeBlockRegex = /```(?:mermaid)?\n([\s\S]*?)\n```/;
  const match = text.match(codeBlockRegex);
  return match ? match[1].trim() : text.trim();
};

export const generateDiagramAndSummary = async (
  input: string, 
  file: FileData | null, 
  type: DiagramType
): Promise<GeneratedContent> => {
  if (!apiKey) throw new Error("API Key is missing");

  const parts: any[] = [];
  
  if (file) {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  }

  if (input) {
    parts.push({ text: input });
  }

  if (parts.length === 0) {
    throw new Error("No input provided");
  }

  const prompt = `
    Analyze the provided content (text or document) and perform three tasks:
    1. Create a concise summary of the key concepts (max 300 words).
    2. Generate a Mermaid.js diagram code block that visually represents the information.
    3. Create 5-10 study flashcards (Question and Answer pairs) based on the most important facts.
    
    The diagram type must be: ${type}.
    
    SPECIFIC INSTRUCTIONS FOR DIAGRAM TYPE:
    - ${DiagramType.MINDMAP}: Use 'mindmap' syntax. Focus on hierarchy and connections. Root node should be central concept.
    - ${DiagramType.FLOWCHART}: Use 'graph TD' or 'graph LR' syntax. Focus on processes or logical flow.
    - ${DiagramType.SEQUENCE}: Use 'sequenceDiagram' syntax. Focus on interactions over time.
    - ${DiagramType.TIMELINE}: Use 'timeline' syntax. Focus on chronological events.
    - ${DiagramType.ORGCHART}: Use 'graph TD' syntax. Structure it hierarchically (CEO -> Managers -> Staff). Use styling (subgraphs or node shapes) to distinguish levels.
    - ${DiagramType.GANTT}: Use 'gantt' syntax. STRICTLY follow this format:
      dateFormat YYYY-MM-DD
      title [Project Title]
      section [Section Name]
      [Task Name] : [Active Status], [Task ID], [Start Date], [Duration/End Date]
      Ensure dates are realistic and relative to the current year. Avoid invalid syntax like multiple titles.

    Output Format (JSON):
    {
      "summary": "The markdown summary here...",
      "diagramCode": "The mermaid code here...",
      "flashcards": [
        { "front": "Question 1?", "back": "Answer 1" },
        { "front": "Question 2?", "back": "Answer 2" }
      ]
    }
    
    IMPORTANT: Return ONLY valid JSON. Ensure the mermaid code is syntactically correct and escapes characters properly. Do not include markdown formatting outside the JSON string.
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    const text = response.text || "{}";
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // Fallback if model returns code blocks outside JSON
      console.warn("JSON Parse failed, attempting cleanup", text);
      const cleanText = text.replace(/```json\n|\n```/g, '');
      json = JSON.parse(cleanText);
    }

    // Map flashcards with IDs
    const flashcards: Flashcard[] = (json.flashcards || []).map((card: any, index: number) => ({
      id: `fc-${Date.now()}-${index}`,
      front: card.front || "Question",
      back: card.back || "Answer"
    }));

    return {
      summary: json.summary || "Could not generate summary.",
      diagramCode: json.diagramCode || "",
      diagramType: type,
      flashcards: flashcards
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process content with Gemini.");
  }
};

export const askQuestionAboutContent = async (
  history: Message[],
  currentQuestion: string,
  contextText: string | null,
  contextFile: FileData | null
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const parts: any[] = [];
  
  if (contextFile) {
    parts.push({
      inlineData: {
        mimeType: contextFile.mimeType,
        data: contextFile.data
      }
    });
  }
  
  let contextPrompt = "Context from uploaded document/notes:\n";
  if (contextText) contextPrompt += contextText + "\n\n";
  
  contextPrompt += "Chat History:\n";
  history.forEach(msg => {
    contextPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
  });
  
  contextPrompt += `\nUSER QUESTION: ${currentQuestion}\n`;
  contextPrompt += "Answer the user's question based strictly on the provided context. Be helpful and concise.";

  parts.push({ text: contextPrompt });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
  });

  return response.text || "I couldn't generate an answer.";
};