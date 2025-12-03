import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, AlertTriangle, Code } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  onError?: (error: any) => void;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#e0e7ff',
        primaryTextColor: '#1e1b4b',
        primaryBorderColor: '#4338ca',
        lineColor: '#64748b',
        secondaryColor: '#f3e8ff',
        tertiaryColor: '#fff',
      },
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      setRenderError(null);
      if (!code || !containerRef.current) return;

      try {
        const id = `mermaid-${Date.now()}`;
        // Mermaid expects the element to be in the DOM to calculate dimensions sometimes, 
        // but render returns an SVG string we can inject.
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
      } catch (error: any) {
        console.error("Mermaid Render Error:", error);
        setSvgContent('');
        setRenderError(error.message || "Failed to render diagram");
        if (onError) onError(error);
      }
    };

    renderDiagram();
  }, [code, onError]);

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 p-12">
        <p>No diagram data available.</p>
      </div>
    );
  }

  if (renderError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-red-50 rounded-xl border border-red-100 overflow-y-auto">
         <div className="bg-red-100 p-3 rounded-full text-red-500 mb-4">
           <AlertTriangle size={32} />
         </div>
         <h3 className="text-lg font-semibold text-red-800 mb-2">Diagram Rendering Failed</h3>
         <p className="text-red-600 mb-6 max-w-md text-sm">
           The generated diagram code contains syntax errors. This sometimes happens with complex layouts or specific data structures.
         </p>
         
         <div className="w-full max-w-lg bg-white rounded-lg border border-red-200 overflow-hidden text-left shadow-sm">
           <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex justify-between items-center">
             <span className="text-xs font-semibold text-red-700 flex items-center gap-2">
               <Code size={14} /> Raw Mermaid Code
             </span>
           </div>
           <pre className="p-4 text-xs font-mono overflow-auto max-h-48 text-slate-600 whitespace-pre-wrap">
             {code}
           </pre>
         </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
       <div className="absolute top-4 right-4 z-10 flex gap-2">
         {/* Controls provided by the wrapper normally */}
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
           <>
            <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/80 backdrop-blur p-1 rounded-lg shadow border border-slate-200">
               <button onClick={() => zoomIn()} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom In">
                 <ZoomIn size={18} />
               </button>
               <button onClick={() => zoomOut()} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out">
                 <ZoomOut size={18} />
               </button>
               <button onClick={() => resetTransform()} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Fit to Screen">
                 <Maximize size={18} />
               </button>
            </div>
            
            <TransformComponent
              wrapperClass="w-full h-full"
              contentClass="w-full h-full flex items-center justify-center"
            >
              <div 
                ref={containerRef}
                className="mermaid-container w-full h-full flex items-center justify-center p-8"
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{ minHeight: '400px' }} // Ensure visibility
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default MermaidDiagram;