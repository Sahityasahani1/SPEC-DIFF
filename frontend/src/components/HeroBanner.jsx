import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Laptop, Cpu, ShieldCheck } from 'lucide-react';
import Laptop3DCanvas from './Laptop3DCanvas';
import ParticleConstellation3D from './ParticleConstellation3D';

export default function HeroBanner({ onSelectQuickPrompt, onScrollToConfig }) {
  const PROMPTS = [
    {
      emoji: '📱',
      title: 'Flagship Camera Phone',
      data: {
        category: 'smartphone',
        budget: 80000,
        ram: 12,
        ssd: 256,
        priority: 'performance',
        use_case: 'Flagship smartphone with pro-grade camera sensor, 4K video recording, all-day battery, and fluid 120Hz display.'
      }
    },
    {
      emoji: '🎧',
      title: 'Audiophile ANC Travel',
      data: {
        category: 'audio',
        budget: 35000,
        ram: 0,
        ssd: 0,
        priority: 'battery',
        use_case: 'High-end wireless noise-cancelling headphones for long flights, subway commutes, and pristine soundstage clarity.'
      }
    },
    {
      emoji: '💻',
      title: 'CS Student / Docker',
      data: {
        category: 'laptop',
        budget: 65000,
        ram: 16,
        ssd: 512,
        priority: 'value',
        use_case: 'B.Tech CS student coding in Python, VS Code, and Docker. Needs upgradable RAM, good cooling, and comfortable keyboard.'
      }
    },
    {
      emoji: '⌚',
      title: 'GPS Running Smartwatch',
      data: {
        category: 'smartwatch',
        budget: 45000,
        ram: 0,
        ssd: 0,
        priority: 'battery',
        use_case: 'Sports and fitness smartwatch with precise multi-band GPS, heart rate ECG monitoring, and days of battery life.'
      }
    },
    {
      emoji: '🖥️',
      title: '4K Creator Monitor',
      data: {
        category: 'monitor',
        budget: 45000,
        ram: 0,
        ssd: 0,
        priority: 'performance',
        use_case: 'Professional color-accurate monitor for photo and video editing with wide color gamut and USB-C display connectivity.'
      }
    },
    {
      emoji: '📟',
      title: 'iPad / Digital Art',
      data: {
        category: 'tablet',
        budget: 60000,
        ram: 8,
        ssd: 128,
        priority: 'performance',
        use_case: 'Tablet for digital illustration, stylus note-taking, reading PDFs, and portable video editing.'
      }
    }
  ];

  return (
    <div className="w-full pb-10">
      
      {/* Massive Forest Green Hero Container matching Reference Image 2 */}
      <div className="bg-forest-900 text-white rounded-[36px] sm:rounded-[48px] p-8 sm:p-14 md:p-16 relative overflow-hidden shadow-2xl border border-forest-800">
        
        {/* 3D Ambient WebGL Particle Constellation */}
        <ParticleConstellation3D />
        
        {/* Architectural Dot Matrix Motif from Reference Image */}
        <div className="absolute top-12 left-12 sm:left-16 grid grid-cols-6 gap-2 opacity-30 pointer-events-none">
          {[...Array(18)].map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>

        {/* Capsule Louvers Graphic Motif from Reference Image */}
        <div className="absolute top-10 right-10 sm:right-16 flex items-center space-x-1 opacity-70 pointer-events-none">
          <span className="w-2.5 h-8 rounded-full bg-white/40" />
          <span className="w-2.5 h-10 rounded-full bg-white/60" />
          <span className="w-2.5 h-12 rounded-full bg-white/80" />
          <span className="w-2.5 h-14 rounded-full bg-white" />
          <span className="w-2.5 h-12 rounded-full bg-white/80" />
          <span className="w-2.5 h-10 rounded-full bg-white/60" />
          <span className="w-2.5 h-8 rounded-full bg-white/40" />
        </div>

        {/* Vertical Tick-Mark Ruler on Right Margin from Reference */}
        <div className="absolute top-28 right-6 hidden lg:block tick-ruler-dark h-48 opacity-40 pointer-events-none" />

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10 pt-6">
          
          {/* Left Column: Big Typography & Copy */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Top Category Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-mono tracking-widest text-sage-300 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
              <span>NON-NEGOTIABLE HARDWARE RETRIEVAL</span>
            </div>

            {/* Giant Signature Typography: Heavy Sans + Sage Script */}
            <div className="space-y-1">
              <h1 className="font-spartan font-black text-5xl sm:text-7xl md:text-8xl tracking-tight leading-[0.95] uppercase">
                YOUR
              </h1>
              <div className="font-script text-sage-400 text-6xl sm:text-8xl md:text-9xl font-normal leading-none -my-2 sm:-my-4 select-none tracking-wide">
                Performance
              </div>
              <h1 className="font-spartan font-black text-5xl sm:text-7xl md:text-8xl tracking-tight leading-[0.95] uppercase text-white">
                REDEFINED
              </h1>
            </div>

            {/* Editorial Subtitle */}
            <p className="text-sm sm:text-base text-white/70 max-w-xl font-normal leading-relaxed pt-2">
              Thoughtfully selected machines crafted to bring speed, power, and timeless reliability into every workflow. 
              Zero sales bias. Zero chatbot hallucinations.
            </p>

            {/* Action Button: White Luxury Pill Button from Reference */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onScrollToConfig && onScrollToConfig()}
                className="px-7 py-3.5 rounded-full bg-white text-forest-950 hover:bg-sage-400 transition-all font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-black/20 cursor-pointer"
              >
                <span>Explore Collection</span>
                <Laptop className="w-4 h-4 text-forest-900" />
              </motion.button>

              <span className="text-xs font-mono text-white/50 tracking-wider hidden sm:inline">
                40 SKUs Verified for Indian Street Prices
              </span>
            </div>

          </div>

          {/* Right Column: Hardware Telemetry Showcase */}
          <div className="lg:col-span-4 relative flex justify-center">
            
            {/* Visual Card with Image & Floating Translucent Pills */}
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-forest-950/60 border border-white/10 p-6 shadow-2xl">
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-sage-300">
                  <span>#1 BENCHMARK</span>
                  <span>RTX 4060 / OLED</span>
                </div>

                {/* Interactive 3D WebGL Laptop Canvas */}
                <div className="py-2 flex justify-center items-center">
                  <Laptop3DCanvas />
                </div>

                {/* Floating translucent pills overlaid directly */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <span className="img-pill-tag">DDR5 EXPANDABLE</span>
                  <span className="img-pill-tag">OLED 120HZ</span>
                  <span className="img-pill-tag">15H BATTERY</span>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-xs font-mono text-white/60">
                    Mathematically verified hard-constraint filter
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Bottom Banner from Reference: Section Indicator */}
        <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sage-500/20 text-sage-300 border border-sage-500/30 text-[10px] font-bold uppercase tracking-widest">
              COLLECTION
            </span>
            <span className="text-white/60 font-mono hidden sm:inline">
              Filtered for Indian Engineering, Creators & Business
            </span>
          </div>

          <span className="text-white/40 font-mono tracking-widest font-bold">
            / 01
          </span>
        </div>

      </div>

      {/* Quick Launch Scenario Pills in Scandinavian Editorial Style */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 px-4">
        <span className="text-xs font-mono uppercase text-forest-900/60 font-bold mr-2">
          Curated Personas:
        </span>
        {PROMPTS.map((p, i) => (
          <motion.button
            key={i}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => onSelectQuickPrompt(p.data)}
            className="text-xs px-4 py-2 rounded-full bg-white text-forest-900 hover:bg-forest-900 hover:text-white border border-forest-900/15 shadow-sm transition-all flex items-center gap-2 cursor-pointer font-medium"
          >
            <span>{p.emoji}</span>
            <span>{p.title}</span>
          </motion.button>
        ))}
      </div>

    </div>
  );
}
