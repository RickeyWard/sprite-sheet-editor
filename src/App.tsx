import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SpriteList } from './components/SpriteList';
import { AnimationManager } from './components/AnimationManager';
import { SpritesheetPreview } from './components/SpritesheetPreview';
import { CanvasSettings } from './components/CanvasSettings';
import { AnimationPreview } from './components/AnimationPreview';
import { PackingSettings } from './components/PackingSettings';
import { createSpriteFrameFromFile } from './utils/imageLoader';
import { packSprites } from './utils/spritePacker';
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
      const newFrames = await Promise.all(
        files.map(file => createSpriteFrameFromFile(file))
      );
      setFrames(prev => [...prev, ...newFrames]);
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
    </div>
  );
}

export default App;
