import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Layout, 
  GitBranch, 
  Clock, 
  AlignLeft, 
  ChevronRight,
  Sparkles,
  RefreshCcw,
  BookOpen,
  Users,
  CalendarRange
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import FileUpload from './components/FileUpload';
import MermaidDiagram from './components/MermaidDiagram';
import ChatPanel from './components/ChatPanel';
import { generateDiagramAndSummary, askQuestionAboutContent } from './services/gemini';
import { DiagramType, FileData, GeneratedContent, Message, ProcessingState } from './types';

const App: React.FC = () => {
  // State
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedType, setSelectedType] = useState<DiagramType>(DiagramType.MINDMAP);
  
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [content, setContent] = useState<GeneratedContent | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagram' | 'summary'>('diagram');

  // Handlers
  const handleGenerate = async () => {
    if (!inputText && !selectedFile) {
      alert("Please provide text or upload a file.");
      return;
    }

    setProcessingState({ status: 'processing', message: 'Analyzing content & generating diagram...' });
    setChatMessages([]); // Reset chat on new generation? Or keep? Resetting makes sense for new context.
    
    try {
      const result = await generateDiagramAndSummary(inputText, selectedFile, selectedType);
      setContent(result);
      setProcessingState({ status: 'completed' });
    } catch (error) {
      setProcessingState({ status: 'error', message: 'Failed to generate content. Please try again.' });
      console.error(error);
    }
  };

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setIsChatLoading(true);

    try {
      const answer = await askQuestionAboutContent(
        [...chatMessages, newMessage], 
        text, 
        inputText, 
        selectedFile
      );
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: answer,
        timestamp: Date.now()
      };
      
      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Sorry, I encountered an error while processing your request.",
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const diagramTypes = [
    { id: DiagramType.MINDMAP, label: 'Mind Map', icon: BrainCircuit },
    { id: DiagramType.FLOWCHART, label: 'Flowchart', icon: GitBranch },
    { id: DiagramType.SEQUENCE, label: 'Sequence', icon: AlignLeft },
    { id: DiagramType.TIMELINE, label: 'Timeline', icon: Clock },
    { id: DiagramType.ORGCHART, label: 'Org Chart', icon: Users },
    { id: DiagramType.GANTT, label: 'Gantt Chart', icon: CalendarRange },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Left Sidebar / Input Area */}
      <div className="w-full md:w-[400px] bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden z-10 shadow-lg md:shadow-none">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-white">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-900 tracking-tight">MindFlow</h1>
            <p className="text-xs text-slate-500 font-medium">AI Study Companion</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* File Upload Section */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Source Material
            </h2>
            <FileUpload 
              onFileSelect={setSelectedFile} 
              selectedFile={selectedFile} 
            />
          </section>

          {/* Text Input Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Notes / Paste Text
              </h2>
            </div>
            <textarea 
              className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
              placeholder="Paste your lecture notes, summaries, or text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </section>

          {/* Configuration */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Visualization Style
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {diagramTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`
                    flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all
                    ${selectedType === type.id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <type.icon size={16} />
                  {type.label}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={handleGenerate}
            disabled={processingState.status === 'processing'}
            className={`
              w-full py-4 rounded-xl font-semibold text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all
              ${processingState.status === 'processing' 
                ? 'bg-indigo-400 cursor-wait' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            {processingState.status === 'processing' ? (
              <>
                <RefreshCcw className="animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Visualization
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden p-4 bg-white border-b border-slate-200 flex justify-between items-center">
          <span className="font-bold text-slate-900">MindFlow</span>
          <span className="text-xs text-slate-500">Scroll down for output</span>
        </div>

        {processingState.status === 'idle' && !content ? (
           <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-60">
             <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mb-6">
               <Layout size={48} />
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to Visualize</h2>
             <p className="max-w-md text-slate-500">Upload a document or paste your notes on the left to transform them into clear, interactive diagrams.</p>
           </div>
        ) : processingState.status === 'processing' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Analyzing your content</h3>
            <p className="text-slate-500">{processingState.message}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden p-4 gap-4">
             {/* Visualization / Summary Area */}
             <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               {/* Tabs */}
               <div className="flex border-b border-slate-100">
                 <button 
                  onClick={() => setActiveTab('diagram')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'diagram' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                 >
                   <GitBranch size={16} /> Diagram
                 </button>
                 <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                 >
                   <BookOpen size={16} /> Summary
                 </button>
               </div>

               <div className="flex-1 relative overflow-hidden bg-slate-50/50">
                 {activeTab === 'diagram' && content && (
                   <div className="absolute inset-0 p-4">
                      <MermaidDiagram code={content.diagramCode} />
                   </div>
                 )}
                 {activeTab === 'summary' && content && (
                   <div className="absolute inset-0 p-8 overflow-y-auto">
                     <article className="prose prose-slate prose-headings:text-indigo-900 prose-a:text-indigo-600 max-w-none">
                       <ReactMarkdown>{content.summary}</ReactMarkdown>
                     </article>
                   </div>
                 )}
               </div>
             </div>

             {/* Right Side Chat (Collapsible on mobile maybe, but side-by-side on desktop) */}
             <div className="h-[300px] md:h-full md:w-80 lg:w-96 flex-shrink-0">
               <ChatPanel 
                 messages={chatMessages} 
                 onSendMessage={handleSendMessage}
                 isLoading={isChatLoading}
               />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;