import React from 'react';
import { User } from 'firebase/auth';
import { TMTType, TestResult } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Play, 
  GraduationCap, 
  History, 
  HelpCircle, 
  LogOut, 
  User as UserIcon, 
  UserCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: User;
  view: 'home' | 'game' | 'training' | 'history' | 'profile' | 'help';
  setView: (view: any) => void;
  results: TestResult[];
  isAnalyzing: boolean;
  trainingType: 'standard' | 'arabic';
  setTrainingType: (type: 'standard' | 'arabic') => void;
  startTest: (type: TMTType, level?: number) => void;
  activeTest: { type: TMTType; level?: number } | null;
  handleLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  view,
  setView,
  results,
  isAnalyzing,
  trainingType,
  setTrainingType,
  startTest,
  activeTest,
  handleLogout,
  children
}) => {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col" dir="rtl">
      {/* Analysis Loading Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-primary/20 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <h3 className="text-xl font-bold text-primary">جاري تحليل النتائج...</h3>
                <p className="text-sm text-muted-foreground mt-1">يتم الآن فحص الأداء باستخدام الذكاء الاصطناعي</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-[70px] bg-white border-b border-border flex items-center justify-between px-10 shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">T</div>
            <div>
              <h1 className="text-lg font-bold leading-tight">منصة تقييم تتبع المسار (TMT)</h1>
              <p className="text-xs text-muted-foreground">تحليل الأداء المعرفي والوظائف التنفيذية</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button 
              variant={view === 'home' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('home')}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              الرئيسية
            </Button>
            <Button 
              variant={view === 'training' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('training')}
              className="gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              التدريبات
            </Button>
            <Button 
              variant={view === 'history' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('history')}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              السجل والتحليل
            </Button>
            <Button 
              variant={view === 'help' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('help')}
              className="gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              تعليمات
            </Button>
          </nav>
        </div>
        <div className="flex gap-5">
          <div className="flex flex-col items-end cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('profile')}>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">المستخدم:</span>
            <p className="text-sm font-semibold">{user.displayName || (user.isAnonymous ? 'ضيف' : 'مستخدم')}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="self-center">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[280px_1fr_320px] gap-5 p-5 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="bg-white rounded-xl border border-border p-5 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
            المهارات المقاسة
          </h2>
          <div className="bg-background p-3 rounded-lg border border-border">
            <h3 className="text-[10px] text-muted-foreground mb-1 font-bold uppercase">الجزء (أ) - TMT-A</h3>
            <p className="text-sm font-semibold">الانتباه البصري، سرعة المعالجة الحركية</p>
          </div>
          <div className="bg-background p-3 rounded-lg border border-border">
            <h3 className="text-[10px] text-muted-foreground mb-1 font-bold uppercase">الجزء (ب) - TMT-B</h3>
            <p className="text-sm font-semibold">المرونة المعرفية، الذاكرة العاملة</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
            <h3 className="text-[10px] text-primary mb-1 font-bold uppercase">المسار العربي - AR</h3>
            <p className="text-sm font-semibold">تتبع الحروف الهجائية (أ-ب-ت...)</p>
          </div>
          
          <h2 className="text-sm font-bold text-primary flex items-center gap-2 mt-4 mb-2">
            <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
            دلالات الأداء
          </h2>
          <ul className="text-xs text-muted-foreground space-y-2 list-none">
            <li>• <b className="text-foreground">زمن طويل:</b> بطء في المعالجة</li>
            <li>• <b className="text-foreground">أخطاء كثيرة:</b> ضعف في الانتباه</li>
            <li>• <b className="text-foreground">فرق (أ) و (ب):</b> ضعف المرونة</li>
          </ul>

          <div className="mt-auto pt-6 border-t border-border">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-center group transition-all hover:bg-primary/10">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UserIcon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">تصميم وبرمجة وإعداد</p>
              <h4 className="text-sm font-bold text-foreground">د. أحمد حمدي عاشور الغول</h4>
              <p className="text-[10px] text-primary font-bold mt-1">دكتوراه في علم النفس التربوي</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="bg-white rounded-xl border border-border relative flex flex-col overflow-hidden">
          {children}
        </main>

        {/* Right Sidebar */}
        <aside className="bg-white rounded-xl border border-border p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
            نتائج التحليل الإحصائي
          </h2>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 font-normal text-muted-foreground">المسار</th>
                  <th className="text-right py-2 font-normal text-muted-foreground">الزمن</th>
                  <th className="text-right py-2 font-normal text-muted-foreground">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 5).map((res, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 font-medium">
                      {res.testType === 'TMT-B-AR' ? 'الجزء (ب) عربي' : 
                       res.testType === 'TMT-B-AR-TRAINING' ? `تدريب عربي ${res.level}` : res.testType}
                    </td>
                    <td className="py-2">{res.timeInSeconds}ث</td>
                    <td className="py-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        res.errors === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {res.errors === 0 ? 'طبيعي' : 'ضعف بسيط'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-secondary p-4 rounded-xl border border-primary/20 mt-auto">
            <h3 className="text-[10px] text-primary font-bold uppercase mb-1">المؤشر المركب (CTMT Index)</h3>
            <p className="text-3xl font-bold text-primary">
              {results.length > 0 ? (results.reduce((acc, r) => acc + r.timeInSeconds, 0) / results.length).toFixed(1) : '0.0'}
            </p>
            <span className="text-[10px] font-bold text-primary/80">نطاق الأداء: متوسط (طبيعي)</span>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="h-[120px] bg-white border-t border-border px-10 py-4 grid grid-cols-5 gap-5 shrink-0">
        {[1, 2, 3, 4, 5].map((lvl) => (
          <button 
            key={lvl}
            onClick={() => startTest(trainingType === 'arabic' ? 'TMT-B-AR-TRAINING' : 'TRAINING', lvl)}
            className={cn(
              "flex flex-col gap-1 p-3 rounded-lg border text-right transition-all hover:border-primary/50",
              activeTest?.level === lvl && activeTest?.type.includes(trainingType === 'arabic' ? 'AR' : 'TRAINING') ? 
              (trainingType === 'arabic' ? "bg-emerald-50 border-emerald-500" : "bg-secondary border-primary") : "bg-white border-border"
            )}
          >
            <div className={cn("text-[10px] font-bold uppercase", trainingType === 'arabic' ? "text-emerald-600" : "text-primary")}>
              {trainingType === 'arabic' ? 'تدريب عربي' : 'المستوى'} {lvl}
            </div>
            <div className="text-sm font-bold truncate">
              {trainingType === 'arabic' ? (
                lvl === 1 ? 'بداية المسار' : 
                lvl === 2 ? 'تكامل الأرقام' :
                lvl === 3 ? 'التناوب الهجائي' :
                lvl === 4 ? 'المرونة اللغوية' : 'الإدراك المركب'
              ) : (
                lvl === 1 ? 'تتبع أرقام بسيطة' : 
                lvl === 2 ? 'سرعة المعالجة' :
                lvl === 3 ? 'التناوب العقلي' :
                lvl === 4 ? 'التفكير المرن' : 'المهام المركبة'
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {trainingType === 'arabic' ? (
                lvl === 1 ? 'من 1 إلى أ' : 
                lvl === 2 ? 'وصولاً إلى ج' :
                lvl === 3 ? 'وصولاً إلى خ' :
                lvl === 4 ? 'وصولاً إلى ذ' : 'إتقان المسار العربي'
              ) : (
                lvl === 1 ? 'توصيل من 1 إلى 10' : 
                lvl === 2 ? 'كسر الرقم القياسي' :
                lvl === 3 ? 'أرقام مع حروف' :
                lvl === 4 ? 'تغيير القواعد' : 'متاهات متقدمة'
              )}
            </div>
          </button>
        ))}
      </footer>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 md:hidden z-50">
        <Button 
          variant="ghost" 
          className={cn("flex flex-col gap-1 h-auto py-2", view === 'home' && "text-primary")} 
          onClick={() => setView('home')}
        >
          <Play className="w-5 h-5" />
          <span className="text-[10px]">الرئيسية</span>
        </Button>
        <Button 
          variant="ghost" 
          className={cn("flex flex-col gap-1 h-auto py-2", view === 'training' && "text-primary")} 
          onClick={() => setView('training')}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px]">التدريب</span>
        </Button>
        <Button 
          variant="ghost" 
          className={cn("flex flex-col gap-1 h-auto py-2", view === 'history' && "text-primary")} 
          onClick={() => setView('history')}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">السجل</span>
        </Button>
      </div>
    </div>
  );
};

export default Layout;
