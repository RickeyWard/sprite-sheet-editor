import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SpriteList } from './components/SpriteList';
import { AnimationManager } from './components/AnimationManager';
import { SpritesheetPreview } from './components/SpritesheetPreview';
import { CanvasSettings } from './components/CanvasSettings';
import { AnimationPreview } from './components/AnimationPreview';
import { PackingSettings } from './components/PackingSettings';
import { SpriteStripSlicer } from './components/SpriteStripSlicer';
import { createSpriteFrameFromFile, loadImageFromFile, downloadCanvas } from './utils/imageLoader';
import { packSprites } from './utils/spritePacker';
import { detectPotentialSpriteStrip } from './utils/spriteStripSlicer';
import { decodeSpritesheetJSON, handleImageWithJSON } from './utils/jsonDecoder';
import { analyzeFrames } from './utils/frameAnalyzer';
import type { SpriteFrame, Animation, PackedSheet, PackingOptions } from './types';
import './App.css';

function App() {
  const [frames, setFrames] = useState<SpriteFrame[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
  const [packedSheet, setPackedSheet] = useState<PackedSheet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [maxWidth, setMaxWidth] = useState(512);
  const [maxHeight, setMaxHeight] = useState(512);
  const [packingOptions, setPackingOptions] = useState<PackingOptions>({
    spacing: 0,
    trimWhitespace: false,
    forcePowerOf2: false,
    allowRotation: false,
    layout: 'compact'
  });
  const [pendingSpriteStrip, setPendingSpriteStrip] = useState<{
    image: HTMLImageElement;
    file: File;
  } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [manualSliceFrame, setManualSliceFrame] = useState<SpriteFrame | null>(null);

  // Pack sprites whenever frames, animations, or canvas settings change
  useEffect(() => {
    const packSpritesAsync = async () => {
      if (frames.length > 0) {
        const packed = await packSprites(frames, animations, maxWidth, maxHeight, packingOptions);
        setPackedSheet(packed);
      } else {
        setPackedSheet(null);
      }
    };
    
    packSpritesAsync();
  }, [frames, animations, maxWidth, maxHeight, packingOptions]);

  const handleFilesAdded = async (files: File[]) => {
    setIsLoading(true);
    try {
      const regularFiles: File[] = [];
      const spriteStripFiles: File[] = [];
      const jsonFiles: File[] = [];
      const imageFiles: File[] = [];
      
      // Separate files by type
      for (const file of files) {
        if (file.type === 'application/json') {
          jsonFiles.push(file);
        } else if (file.type.startsWith('image/png') || 
                   file.name.toLowerCase().endsWith('.ktx2') || 
                   file.type === 'image/ktx2') {
          imageFiles.push(file);
        }
      }
      
      // Handle JSON files with base64 images
      for (const jsonFile of jsonFiles) {
        try {
          const decodedData = await decodeSpritesheetJSON(jsonFile);
          if (decodedData.frames.length > 0) {
            setFrames(prev => [...prev, ...decodedData.frames]);
          }
          if (decodedData.animations.length > 0) {
            setAnimations(prev => [...prev, ...decodedData.animations]);
          }
        } catch (error) {
          console.error('Error decoding JSON file:', error);
          
          // Check if there's a matching image file for this JSON
          const baseName = jsonFile.name.replace(/\.[^/.]+$/, '');
          const matchingImage = imageFiles.find(img => {
            const imgBaseName = img.name.replace(/\.[^/.]+$/, '');
            return imgBaseName === baseName;
          });
          
          if (matchingImage) {
            try {
              const combinedData = await handleImageWithJSON(matchingImage, jsonFile);
              if (combinedData.frames.length > 0) {
                setFrames(prev => [...prev, ...combinedData.frames]);
              }
              if (combinedData.animations.length > 0) {
                setAnimations(prev => [...prev, ...combinedData.animations]);
              }
              // Remove the processed image from the imageFiles array
              const imageIndex = imageFiles.indexOf(matchingImage);
              if (imageIndex > -1) {
                imageFiles.splice(imageIndex, 1);
              }
            } catch (combinedError) {
              console.error('Error processing image+JSON combination:', combinedError);
              alert(`Error processing ${jsonFile.name} with ${matchingImage.name}. Please check the file formats.`);
            }
          } else {
            alert(`Error processing ${jsonFile.name}. Please check it contains valid base64 image data or provide a matching image file (with the same base name).`);
          }
        }
      }
      
      // Process remaining image files
      for (const file of imageFiles) {
        const image = await loadImageFromFile(file);
        
        // Check if this might be a sprite strip
        if (detectPotentialSpriteStrip(image)) {
          spriteStripFiles.push(file);
        } else {
          regularFiles.push(file);
        }
      }
      
      // Process all regular files first
      if (regularFiles.length > 0) {
        const newFrames = await Promise.all(
          regularFiles.map(file => createSpriteFrameFromFile(file))
        );
        setFrames(prev => [...prev, ...newFrames]);
      }
      
      // Handle sprite strips one at a time
      if (spriteStripFiles.length > 0) {
        const firstSpriteStrip = spriteStripFiles[0];
        const remainingSpriteStrips = spriteStripFiles.slice(1);
        
        // Set remaining sprite strips to be processed later
        setPendingFiles(remainingSpriteStrips);
        
        // Show dialog for the first sprite strip
        const image = await loadImageFromFile(firstSpriteStrip);
        setPendingSpriteStrip({ image, file: firstSpriteStrip });
      }
      
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Error loading some files. Please check they are valid PNG images or JSON files.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFrameSelect = (frameId: string, selected: boolean) => {
    setSelectedFrames(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(frameId);
      } else {
        newSet.delete(frameId);
      }
      return newSet;
    });
  };

  const handleFrameRemove = (frameId: string) => {
    setFrames(prev => prev.filter(f => f.id !== frameId));
    setSelectedFrames(prev => {
      const newSet = new Set(prev);
      newSet.delete(frameId);
      return newSet;
    });
    // Remove frame from animations
    setAnimations(prev => prev.map(anim => ({
      ...anim,
      frameIds: anim.frameIds.filter(id => id !== frameId)
    })).filter(anim => anim.frameIds.length > 0));
  };

  const handleFrameRename = (frameId: string, newName: string) => {
    setFrames(prev => prev.map(frame => 
      frame.id === frameId ? { ...frame, name: newName } : frame
    ));
  };

  const handleFrameSlice = (frameId: string) => {
    const frame = frames.find(f => f.id === frameId);
    if (frame) {
      setManualSliceFrame(frame);
    }
  };

  const handleAnimationCreate = (name: string, frameIds: string[]) => {
    const newAnimation: Animation = {
      id: crypto.randomUUID(),
      name,
      frameIds
    };
    setAnimations(prev => [...prev, newAnimation]);
  };

  const handleAnimationUpdate = (animationId: string, name: string, frameIds: string[]) => {
    setAnimations(prev => prev.map(anim => 
      anim.id === animationId ? { ...anim, name, frameIds } : anim
    ));
  };

  const handleAnimationDelete = (animationId: string) => {
    setAnimations(prev => prev.filter(anim => anim.id !== animationId));
  };

  const handleSelectAll = () => {
    setSelectedFrames(new Set(frames.map(f => f.id)));
  };

  const handleSelectNone = () => {
    setSelectedFrames(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedFrames.size === 0) return;
    
    // Remove selected frames
    setFrames(prev => prev.filter(f => !selectedFrames.has(f.id)));
    
    // Remove selected frames from animations
    setAnimations(prev => prev.map(anim => ({
      ...anim,
      frameIds: anim.frameIds.filter(id => !selectedFrames.has(id))
    })).filter(anim => anim.frameIds.length > 0));
    
    // Clear selection
    setSelectedFrames(new Set());
  };

  const handleDownloadSelected = () => {
    if (selectedFrames.size === 0) return;
    
    const selectedFrameObjects = frames.filter(frame => selectedFrames.has(frame.id));
    
    selectedFrameObjects.forEach((frame, index) => {
      // Create a canvas for this frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas size to frame size
      canvas.width = frame.width;
      canvas.height = frame.height;
      
      // Draw the frame
      ctx.drawImage(frame.image, 0, 0);
      
      // Download with a slight delay to avoid overwhelming the browser
      setTimeout(() => {
        downloadCanvas(canvas, `${frame.name}.png`);
      }, index * 100); // 100ms delay between downloads
    });
  };

  const handleRemoveEmptyOrSolidFrames = () => {
    if (frames.length === 0) return;
    
    const analysis = analyzeFrames(frames);
    
    if (analysis.emptyOrSolid.length === 0) {
      alert('No transparent or solid color frames found to remove.');
      return;
    }
    
    const message = `Found ${analysis.emptyOrSolid.length} frames to remove:\n` +
      `- ${analysis.transparent.length} completely transparent frames\n` +
      `- ${analysis.solidColor.length} solid color frames\n\n` +
      `Do you want to remove these frames?`;
    
    if (confirm(message)) {
      const framesToRemoveIds = new Set(analysis.emptyOrSolid.map(frame => frame.id));
      
      // Remove frames
      setFrames(prev => prev.filter(f => !framesToRemoveIds.has(f.id)));
      
      // Remove from selection
      setSelectedFrames(prev => {
        const newSet = new Set(prev);
        framesToRemoveIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      // Remove from animations
      setAnimations(prev => prev.map(anim => ({
        ...anim,
        frameIds: anim.frameIds.filter(id => !framesToRemoveIds.has(id))
      })).filter(anim => anim.frameIds.length > 0));
      
      alert(`Removed ${analysis.emptyOrSolid.length} frames.`);
    }
  };

  const processNextPendingFile = async () => {
    if (pendingFiles.length > 0) {
      const nextFile = pendingFiles[0];
      const remainingFiles = pendingFiles.slice(1);
      
      setPendingFiles(remainingFiles);
      
      try {
        const image = await loadImageFromFile(nextFile);
        if (detectPotentialSpriteStrip(image)) {
          setPendingSpriteStrip({ image, file: nextFile });
        } else {
          // Process as regular frame and continue
          const frame = await createSpriteFrameFromFile(nextFile);
          setFrames(prev => [...prev, frame]);
          await processNextPendingFile();
        }
      } catch (error) {
        console.error('Error processing pending file:', error);
        await processNextPendingFile(); // Continue with next file
      }
    }
  };

  const handleSpriteStripSlice = async (slicedFrames: SpriteFrame[], createAnimation?: { name: string }) => {
    setFrames(prev => [...prev, ...slicedFrames]);
    
    // Create animation if requested
    if (createAnimation && slicedFrames.length > 0) {
      const newAnimation = {
        id: crypto.randomUUID(),
        name: createAnimation.name,
        frameIds: slicedFrames.map(frame => frame.id)
      };
      setAnimations(prev => [...prev, newAnimation]);
    }
    
    setPendingSpriteStrip(null);
    
    // Process next pending sprite strip if any
    await processNextPendingFile();
  };

  const handleSpriteStripCancel = async () => {
    setPendingSpriteStrip(null);
    // Process next pending sprite strip if any
    await processNextPendingFile();
  };

  const handleSpriteStripKeepOriginal = async () => {
    if (pendingSpriteStrip) {
      const frame = await createSpriteFrameFromFile(pendingSpriteStrip.file);
      setFrames(prev => [...prev, frame]);
      setPendingSpriteStrip(null);
      // Process next pending sprite strip if any
      await processNextPendingFile();
    }
  };

  const handleManualSlice = async (slicedFrames: SpriteFrame[], createAnimation?: { name: string }) => {
    if (manualSliceFrame) {
      // Remove the original frame
      setFrames(prev => prev.filter(f => f.id !== manualSliceFrame.id));
      
      // Remove the original frame from any animations
      setAnimations(prev => prev.map(anim => ({
        ...anim,
        frameIds: anim.frameIds.filter(id => id !== manualSliceFrame.id)
      })).filter(anim => anim.frameIds.length > 0));
      
      // Add the new sliced frames
      setFrames(prev => [...prev, ...slicedFrames]);
      
      // Create animation if requested
      if (createAnimation && slicedFrames.length > 0) {
        const newAnimation = {
          id: crypto.randomUUID(),
          name: createAnimation.name,
          frameIds: slicedFrames.map(frame => frame.id)
        };
        setAnimations(prev => [...prev, newAnimation]);
      }
      
      setManualSliceFrame(null);
    }
  };

  const handleManualSliceCancel = () => {
    setManualSliceFrame(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎮 Spritesheet Editor</h1>
        <p>Create and export spritesheets for PixiJS and other game engines</p>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <section className="canvas-settings-section">
            <CanvasSettings
              maxWidth={maxWidth}
              maxHeight={maxHeight}
              onMaxWidthChange={setMaxWidth}
              onMaxHeightChange={setMaxHeight}
            />
          </section>

          <section className="packing-settings-section">
            <PackingSettings
              options={packingOptions}
              onOptionsChange={setPackingOptions}
            />
          </section>

          <section className="upload-section">
            <FileUpload onFilesAdded={handleFilesAdded} />
            {isLoading && <div className="loading">Loading images...</div>}
          </section>

          {frames.length > 0 && (
            <section className="selection-controls">
              <button onClick={handleSelectAll} className="select-btn">
                Select All
              </button>
              <button onClick={handleSelectNone} className="select-btn">
                Select None
              </button>
              <button 
                onClick={handleDeleteSelected} 
                className="delete-selected-btn"
                disabled={selectedFrames.size === 0}
              >
                🗑️ Delete Selected
              </button>
              <button 
                onClick={handleDownloadSelected} 
                className="download-selected-btn"
                disabled={selectedFrames.size === 0}
              >
                📥 Download Selected
              </button>
              <button 
                onClick={handleRemoveEmptyOrSolidFrames} 
                className="cleanup-btn"
                disabled={frames.length === 0}
                title="Remove frames that are completely transparent or solid single color"
              >
                🧹 Clean Empty/Solid
              </button>
              <span className="selection-count">
                {selectedFrames.size} of {frames.length} selected
              </span>
            </section>
          )}

          <section className="frames-section">
            <SpriteList
              frames={frames}
              selectedFrames={selectedFrames}
              onFrameSelect={handleFrameSelect}
              onFrameRemove={handleFrameRemove}
              onFrameRename={handleFrameRename}
              onFrameSlice={handleFrameSlice}
            />
          </section>

          <section className="animations-section">
            <AnimationManager
              animations={animations}
              frames={frames}
              selectedFrames={selectedFrames}
              onAnimationCreate={handleAnimationCreate}
              onAnimationUpdate={handleAnimationUpdate}
              onAnimationDelete={handleAnimationDelete}
            />
          </section>
        </div>

        <div className="right-panel">
          <SpritesheetPreview packedSheet={packedSheet} frames={frames} />
          
          <section className="animation-preview-section">
            <AnimationPreview
              animations={animations}
              frames={frames}
              packedSheet={packedSheet}
            />
          </section>
        </div>
      </main>

      {pendingSpriteStrip && (
        <SpriteStripSlicer
          image={pendingSpriteStrip.image}
          baseName={pendingSpriteStrip.file.name.replace(/\.[^/.]+$/, '')}
          onSlice={handleSpriteStripSlice}
          onCancel={handleSpriteStripCancel}
          onKeepOriginal={handleSpriteStripKeepOriginal}
        />
      )}

      {manualSliceFrame && (
        <SpriteStripSlicer
          image={manualSliceFrame.image}
          baseName={manualSliceFrame.name}
          onSlice={handleManualSlice}
          onCancel={handleManualSliceCancel}
          onKeepOriginal={handleManualSliceCancel}
        />
      )}
    </div>
  );
}

export default App;
