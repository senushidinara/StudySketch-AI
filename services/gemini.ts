import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DiagramType, GeneratedContent, FileData, Message } from '../types';

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
    Analyze the provided content (text or document) and perform two tasks:
    1. Create a concise summary of the key concepts (max 300 words).
    2. specific Generate a Mermaid.js diagram code block that visually represents the information.
    
    The diagram type must be: ${type}.
    
    For ${DiagramType.MINDMAP}: Use 'mindmap' syntax. Focus on hierarchy and connections.
    For ${DiagramType.FLOWCHART}: Use 'graph TD' or 'graph LR' syntax. Focus on processes or logical flow.
    For ${DiagramType.SEQUENCE}: Use 'sequenceDiagram' syntax. Focus on interactions over time.
    For ${DiagramType.TIMELINE}: Use 'timeline' syntax. Focus on chronological events.
    For ${DiagramType.ORGCHART}: Use 'graph TD' syntax. Focus on roles, reporting lines, and hierarchical structure. Use distinct shapes or styles for different levels if possible.
    For ${DiagramType.GANTT}: Use 'gantt' syntax. Focus on tasks, durations, and dependencies. Ensure dates are formatted YYYY-MM-DD.

    Output Format (JSON):
    {
      "summary": "The markdown summary here...",
      "diagramCode": "The mermaid code here..."
    }
    
    IMPORTANT: Return ONLY valid JSON. Ensure the mermaid code is syntactically correct and escapes characters properly.
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster response on simple tasks, or enable if complex
      }
    });

    const text = response.text || "{}";
    const json = JSON.parse(text);

    return {
      summary: json.summary || "Could not generate summary.",
      diagramCode: json.diagramCode || "",
      diagramType: type
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

  // Construct history for context
  // We will treat this as a single-turn generation with context for simplicity in this stateless example,
  // or we can use chat. But since we have file attachments which might need to be re-sent or cached, 
  // keeping it simple by sending context + history in a generateContent call is often more robust for 'document Q&A'.
  
  const parts: any[] = [];
  
  // Add context first
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