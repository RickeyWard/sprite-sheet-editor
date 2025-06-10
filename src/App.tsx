import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SpriteList } from './components/SpriteList';
import { AnimationManager } from './components/AnimationManager';
import { SpritesheetPreview } from './components/SpritesheetPreview';
import { CanvasSettings } from './components/CanvasSettings';
import { AnimationPreview } from './components/AnimationPreview';
import { PackingSettings } from './components/PackingSettings';
import { SpriteStripSlicer } from './components/SpriteStripSlicer';
import { createSpriteFrameFromFile, loadImageFromFile } from './utils/imageLoader';
import { packSprites } from './utils/spritePacker';
import { detectPotentialSpriteStrip } from './utils/spriteStripSlicer';
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
    spacing: 2,
    trimWhitespace: false,
    forcePowerOf2: true,
    padding: 1,
    allowRotation: false
  });
  const [pendingSpriteStrip, setPendingSpriteStrip] = useState<{
    image: HTMLImageElement;
    file: File;
  } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

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
      
      // Separate regular files from potential sprite strips
      for (const file of files) {
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
      alert('Error loading some files. Please check they are valid PNG images.');
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎮 Spritesheet Editor</h1>
        <p>Create and export spritesheets for PixiJS and other game engines</p>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <section className="upload-section">
            <FileUpload onFilesAdded={handleFilesAdded} />
            {isLoading && <div className="loading">Loading images...</div>}
          </section>

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

          {frames.length > 0 && (
            <section className="selection-controls">
              <button onClick={handleSelectAll} className="select-btn">
                Select All
              </button>
              <button onClick={handleSelectNone} className="select-btn">
                Select None
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
          <SpritesheetPreview packedSheet={packedSheet} />
          
          <section className="animation-preview-section">
            <AnimationPreview
              animations={animations}
              frames={frames}
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
    </div>
  );
}

export default App;
