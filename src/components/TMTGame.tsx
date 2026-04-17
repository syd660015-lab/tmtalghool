import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TMTPoint, TMTType } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Timer, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface TMTGameProps {
  type: TMTType;
  level?: number;
  onComplete: (time: number, errors: number) => void;
  onCancel: () => void;
}

export const TMTGame: React.FC<TMTGameProps> = ({ type, level, onComplete, onCancel }) => {
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
    const padding = 40;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

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
      let r, c, cellKey;
      do {
        r = Math.floor(Math.random() * gridSize);
        c = Math.floor(Math.random() * gridSize);
        cellKey = `${r}-${c}`;
      } while (usedCells.has(cellKey));
      
      usedCells.add(cellKey);

      newPoints.push({
        id: index,
        label: item.label,
        type: item.type,
        order: item.order,
        x: padding + c * cellWidth + Math.random() * (cellWidth - 30) + 15,
        y: padding + r * cellHeight + Math.random() * (cellHeight - 30) + 15,
      });
    });

    setPoints(newPoints);
    setCurrentIndex(0);
    setErrors(0);
    setElapsedTime(0);
    setStatus('idle');
  };

  useEffect(() => {
    generatePoints();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [type, level]);

  const startTest = () => {
    setStatus('running');
    setStartTime(Date.now());
    timerRef.current = window.setInterval(() => {
      setElapsedTime((prev) => prev + 0.1);
    }, 100);
  };

  const handlePointClick = (point: TMTPoint) => {
    if (status !== 'running') return;

    if (point.order === currentIndex) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setLastErrorPoint(null);

      if (nextIndex === points.length) {
        finishTest();
      }
    } else if (point.order > currentIndex) {
      setErrors((prev) => prev + 1);
      setLastErrorPoint(point.id);
      setTimeout(() => setLastErrorPoint(null), 500);
    }
  };

  const finishTest = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStatus('finished');
    onComplete(elapsedTime, errors);
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
        className="flex-1 relative bg-white overflow-hidden cursor-crosshair border-0 rounded-none"
      >
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

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
