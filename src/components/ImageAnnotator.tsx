import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricImage, Line, PencilBrush } from 'fabric';
import { Pencil, Move, Spline as LineIcon, Undo, Eraser } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Tool = 'select' | 'draw' | 'line' | 'eraser';

interface ImageAnnotatorProps {
  imageUrl: string;
  onSave: (annotationData: object) => void;
}

export function ImageAnnotator({ imageUrl, onSave }: ImageAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const historyRef = useRef<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize canvas
  useEffect(() => {
    if (!containerRef.current) return;
    
    fabricCanvasRef.current?.dispose();
    containerRef.current.innerHTML = '';

    const canvasEl = document.createElement('canvas');
    canvasEl.width = 800;
    canvasEl.height = 600;
    containerRef.current.appendChild(canvasEl);

    const canvas = new Canvas(canvasEl, {
      backgroundColor: '#f5f5f5',
    });
    fabricCanvasRef.current = canvas;
    
    setIsLoading(true);
    
    // Load and setup the image
    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then(fabricImage => {
      const scale = Math.min(
        canvas.width! / fabricImage.width!,
        canvas.height! / fabricImage.height!
      );
      
      fabricImage.set({
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false
      });
      
      canvas.add(fabricImage);
      canvas.moveObjectTo(fabricImage, 0);
      canvas.renderAll();
      
      // Save initial state after image is loaded
      const initialState = canvas.toJSON();
      historyRef.current = [initialState];
    }).catch(error => {
      console.error("Failed to load image:", error);
      setIsLoading(false);
    });
    
    // Setup event listeners for history tracking
    const saveToHistory = () => {
      const currentState = canvas.toJSON();
      historyRef.current.push(currentState);
    };

    canvas.on('object:added', saveToHistory);
    canvas.on('object:modified', saveToHistory);
    canvas.on('object:removed', saveToHistory);
    
    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      historyRef.current = [];
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [imageUrl]);
  
  // Handle tool selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    canvas.isDrawingMode = selectedTool === 'draw' || selectedTool === 'eraser';
    canvas.selection = selectedTool === 'select';

    if (canvas.isDrawingMode) {
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      
      if (selectedTool === 'eraser') {
        canvas.freeDrawingBrush.color = '#f5f5f5';
        canvas.freeDrawingBrush.width = 20;
      } else {
        canvas.freeDrawingBrush.color = '#ff0000';
        canvas.freeDrawingBrush.width = 2;
      }
    }
  }, [selectedTool]);
  
  // Add line
  const addLine = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;
    
    const line = new Line(
      [centerX - 50, centerY - 50, centerX + 50, centerY + 50],
      {
        fill: 'transparent',
        stroke: '#ff0000',
        strokeWidth: 2
      }
    );
    
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    setSelectedTool('select');
  }, []);
  
  // Undo functionality
  const undo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    
    historyRef.current.pop(); // Remove current state
    const previousState = historyRef.current[historyRef.current.length - 1];
    
    // Clear the canvas and load the previous state
    canvas.clear();
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      setIsLoading(false);
    });
  }, []);
  
  // Save annotation
  const handleSave = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 });
    const blob = await (await fetch(dataUrl)).blob();

    const match = imageUrl.match(/\/survey_images\/(.+)$/);
    if (!match) {
      console.error("Couldn't parse file path from imageUrl:", imageUrl);
      return;
    }
    const filePath = `annotations/${match[1]}`;

    const { error: uploadError } = await supabase
      .storage
      .from('survey_images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      return;
    }

    const { data: urlData, error: urlError } = supabase
      .storage
      .from('survey_images')
      .getPublicUrl(filePath);

    if (urlError) {
      console.error('Could not get public URL:', urlError);
      return;
    }
    const publicUrl = urlData.publicUrl;
    onSave(publicUrl);
  }, [imageUrl, onSave]);
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 mb-4">
        <button
          className={`p-2 rounded ${selectedTool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedTool('select')}
          title="Select"
        >
          <Move className="w-6 h-6" />
        </button>
        <button
          className={`p-2 rounded ${selectedTool === 'draw' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedTool('draw')}
          title="Draw"
        >
          <Pencil className="w-6 h-6" />
        </button>
        <button
          className={`p-2 rounded ${selectedTool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedTool('eraser')}
          title="Eraser"
        >
          <Eraser className="w-6 h-6" />
        </button>
        <button
          className="p-2 rounded bg-gray-200"
          onClick={addLine}
          title="Add Line"
        >
          <LineIcon className="w-6 h-6" />
        </button>
        <button
          className={`p-2 rounded ${historyRef.current.length <= 1 ? 'bg-gray-200 opacity-50' : 'bg-gray-200'}`}
          onClick={undo}
          disabled={historyRef.current.length <= 1}
          title="Undo"
        >
          <Undo className="w-6 h-6" />
        </button>
      </div>
      
      <div ref={canvasWrapperRef} className="border border-gray-300 relative" style={{ width: '800px', height: '600px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
            <div className="text-lg">Loading image...</div>
          </div>
        )}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      <button
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        onClick={handleSave}
        disabled={isLoading}
      >
        Save Annotation
      </button>
    </div>
  );
}