export enum DiagramType {
  MINDMAP = 'mindmap',
  FLOWCHART = 'flowchart',
  SEQUENCE = 'sequence',
  TIMELINE = 'timeline',
  ORGCHART = 'orgchart',
  GANTT = 'gantt'
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface GeneratedContent {
  diagramCode: string;
  summary: string;
  diagramType: DiagramType;
}

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // Base64 string
}