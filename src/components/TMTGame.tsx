import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { TMTPoint, TMTType } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Timer, AlertCircle, RefreshCcw, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface TMTGameProps {
  type: TMTType;
  level?: number;
  settings: {
    soundEnabled: boolean;
    volume: number;
    visualFeedback: boolean;
  };
  onComplete: (time: number, errors: number) => void;
  onCancel: () => void;
}

export const TMTGame: React.FC<TMTGameProps> = ({ type, level, settings, onComplete, onCancel }) => {
  const [points, setPoints] = useState<TMTPoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [errors, setErrors] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [lastErrorPoint, setLastErrorPoint] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const generatePoints = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width < 200 || height < 200) return; // Wait for reasonable layout size

    const padding = 50;
    const availableWidth = Math.max(100, width - padding * 2);
    const availableHeight = Math.max(100, height - padding * 2);
    const minDistance = 45; // Minimum distance between points

    let labels: { label: string; type: 'number' | 'letter'; order: number }[] = [];

    if (type === 'TMT-A') {
      for (let i = 1; i <= 25; i++) {
        labels.push({ label: i.toString(), type: 'number', order: i - 1 });
      }
    } else if (type === 'TMT-B') {
      const letters = 'ABCDEFGHIJKL'.split('');
      for (let i = 1; i <= 13; i++) {
        labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
        if (i <= 12) {
          labels.push({ label: letters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      }
    } else if (type === 'TMT-B-AR') {
      const arabicLetters = 'أبتثجحخدذرزس'.split('');
      for (let i = 1; i <= 13; i++) {
        labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
        if (i <= 12) {
          labels.push({ label: arabicLetters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      }
    } else if (type === 'TRAINING') {
      if (level === 1) {
        // Level 1: Simple numbers 1-10
        for (let i = 1; i <= 10; i++) labels.push({ label: i.toString(), type: 'number', order: i - 1 });
      } else if (level === 2) {
        // Level 2: Processing speed 1-20
        for (let i = 1; i <= 20; i++) labels.push({ label: i.toString(), type: 'number', order: i - 1 });
      } else if (level === 3) {
        // Level 3: Mental switching 1-A to 5-E
        const letters = 'ABCDE'.split('');
        for (let i = 1; i <= 5; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          labels.push({ label: letters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else if (level === 4) {
        // Level 4: Flexible thinking 1-A to 8-H
        const letters = 'ABCDEFGH'.split('');
        for (let i = 1; i <= 8; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          labels.push({ label: letters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else if (level === 5) {
        // Level 5: Complex tasks 1-A to 10-J
        const letters = 'ABCDEFGHIJ'.split('');
        for (let i = 1; i <= 10; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          labels.push({ label: letters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else {
        for (let i = 1; i <= 15; i++) labels.push({ label: i.toString(), type: 'number', order: i - 1 });
      }
    } else if (type === 'TMT-B-AR-TRAINING') {
      const arabicLetters = 'أبتثجحخدذرزس'.split('');
      if (level === 1) {
        // Level 1: Simple 1-أ to 3-ت
        for (let i = 1; i <= 3; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          if (i <= 2) labels.push({ label: arabicLetters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else if (level === 2) {
        // Level 2: 1-أ to 5-ج
        for (let i = 1; i <= 5; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          if (i <= 4) labels.push({ label: arabicLetters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else if (level === 3) {
        // Level 3: 1-أ to 7-خ
        for (let i = 1; i <= 7; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          if (i <= 6) labels.push({ label: arabicLetters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else if (level === 4) {
        // Level 4: 1-أ to 9-ذ
        for (let i = 1; i <= 9; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          if (i <= 8) labels.push({ label: arabicLetters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      } else if (level === 5) {
        // Level 5: 1-أ to 11-ز
        for (let i = 1; i <= 11; i++) {
          labels.push({ label: i.toString(), type: 'number', order: (i - 1) * 2 });
          if (i <= 10) labels.push({ label: arabicLetters[i - 1], type: 'letter', order: (i - 1) * 2 + 1 });
        }
      }
    }

    // Sort labels by order
    labels.sort((a, b) => a.order - b.order);

    const newPoints: TMTPoint[] = [];
    const gridSize = Math.ceil(Math.sqrt(labels.length));
    const cellWidth = availableWidth / gridSize;
    const cellHeight = availableHeight / gridSize;

    const usedCells = new Set<string>();

    labels.forEach((item, index) => {
      let r, c, cellKey, x, y;
      let attempts = 0;
      
      do {
        r = Math.floor(Math.random() * gridSize);
        c = Math.floor(Math.random() * gridSize);
        cellKey = `${r}-${c}`;
        attempts++;
        
        // Safety break to prevent infinite loop in extreme layouts
        if (attempts > 100) break;
      } while (usedCells.has(cellKey));
      
      usedCells.add(cellKey);

      // Add a bit of jitter within the cell
      x = padding + c * cellWidth + Math.random() * (cellWidth - minDistance) + minDistance / 2;
      y = padding + r * cellHeight + Math.random() * (cellHeight - minDistance) + minDistance / 2;

      newPoints.push({
        id: index,
        label: item.label,
        type: item.type,
        order: item.order,
        x,
        y,
      });
    });

    setPoints(newPoints);
    setCurrentIndex(0);
    setErrors(0);
    setElapsedTime(0);
    setStatus('idle');
  };

  useEffect(() => {
    // Small timeout to ensure container has dimensions
    const timer = setTimeout(() => {
      generatePoints();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [type, level]);

  const startTest = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStatus('running');
    setStartTime(Date.now());
    timerRef.current = window.setInterval(() => {
      setElapsedTime((prev) => prev + 0.1);
    }, 100);
  };

  const playClickSound = (isCorrect: boolean) => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const vol = settings.volume / 100;

      oscillator.type = 'sine';
      if (isCorrect) {
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.1 * vol, audioCtx.currentTime);
      } else {
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2 * vol, audioCtx.currentTime);
      }

      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio might be blocked by browser policy until user interacts
    }
  };

  const handlePointClick = (point: TMTPoint) => {
    if (status !== 'running') return;

    if (point.order === currentIndex) {
      playClickSound(true);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setLastErrorPoint(null);

      if (nextIndex === points.length) {
        finishTest();
      }
    } else if (point.order > currentIndex) {
      playClickSound(false);
      setErrors((prev) => prev + 1);
      setLastErrorPoint(point.id);
      setTimeout(() => setLastErrorPoint(null), 500);
    }
  };

  const playSuccessSound = () => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const vol = settings.volume / 100;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2 * vol, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio effect failed', e);
    }
  };

  const finishTest = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStatus('finished');
    
    // Success effects
    playSuccessSound();
    if (settings.visualFeedback) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      });
    }
  };

  const lines = useMemo(() => {
    const result = [];
    for (let i = 0; i < currentIndex - 1; i++) {
      const p1 = points.find(p => p.order === i);
      const p2 = points.find(p => p.order === i + 1);
      if (p1 && p2) {
        result.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      }
    }
    return result;
  }, [currentIndex, points]);

  return (
    <div className="flex flex-col h-full w-full gap-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Badge variant="outline" className="text-lg py-1 px-3">
            <Timer className="w-4 h-4 mr-2" />
            {elapsedTime.toFixed(1)}s
          </Badge>
          <Badge variant="destructive" className="text-lg py-1 px-3">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errors} أخطاء
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>إلغاء</Button>
          <Button variant="secondary" onClick={generatePoints}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            إعادة
          </Button>
        </div>
      </div>

      <Card 
        ref={containerRef}
        className="flex-1 relative bg-white overflow-hidden cursor-crosshair border-0 rounded-none shadow-inner"
      >
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCcw className="w-8 h-8 text-primary/20 animate-spin" />
          </div>
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-xl border border-border">
              <h3 className="text-2xl font-bold mb-4 text-primary">جاهز للبدء؟</h3>
              <p className="text-slate-600 mb-6">
                {type === 'TMT-A' ? 'قم بتوصيل الأرقام من 1 إلى 25 بالترتيب.' : 
                 type === 'TMT-B' ? 'قم بالتوصيل بالتناوب بين الأرقام والحروف الإنجليزية (1-A-2-B...)' :
                 type === 'TMT-B-AR' ? 'قم بالتوصيل بالتناوب بين الأرقام والحروف العربية (1-أ-2-ب...)' :
                 type === 'TMT-B-AR-TRAINING' ? 'تدريب على المسار العربي (أرقام وحروف).' :
                 'تدريب على تتبع المسار القياسي.'}
              </p>
              <Button size="lg" onClick={startTest} className="w-full py-6 text-lg">ابدأ الآن</Button>
            </div>
          </div>
        )}

        {status === 'finished' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-md px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-8 max-w-md w-full bg-white rounded-2xl shadow-2xl border border-primary/20 flex flex-col items-center"
            >
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2 text-foreground">اكتمل الاختبار بنجاح!</h3>
              <p className="text-muted-foreground mb-8">
                لقد أنهيت المسار في <span className="font-bold text-primary">{elapsedTime.toFixed(1)} ثانية</span> مع <span className="font-bold text-destructive">{errors} أخطاء</span>.
              </p>
              
              <motion.div
                animate={{ 
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-full"
              >
                <Button 
                  size="lg" 
                  onClick={() => onComplete(elapsedTime, errors)} 
                  className="w-full h-16 text-lg shadow-lg group relative overflow-hidden bg-primary hover:bg-primary/90"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    حفظ وتحليل النتائج
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </motion.div>
                  </span>
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        )}

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
          {lines.map((line, i) => (
            <motion.line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--primary)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          ))}
        </svg>

        {points.map((point) => {
          const isCompleted = point.order < currentIndex;
          const isCurrent = point.order === currentIndex;
          const isError = lastErrorPoint === point.id;
          const isLetter = point.type === 'letter';

          return (
            <motion.button
              key={point.id}
              onClick={() => handlePointClick(point)}
              className={cn(
                "absolute w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm z-[2] border-2",
                isCompleted ? "bg-primary text-white border-primary" : 
                isCurrent ? "bg-white border-primary text-primary scale-110 shadow-md" :
                isError ? "bg-destructive text-white border-destructive animate-shake" :
                isLetter ? "bg-[#fffcf0] border-warning text-warning" : "bg-white border-primary text-primary hover:bg-slate-50"
              )}
              style={{ left: point.x - 18, top: point.y - 18 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {point.label}
            </motion.button>
          );
        })}
      </Card>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 2;
        }
      `}</style>
    </div>
  );
};
