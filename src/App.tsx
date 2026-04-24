import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { TMTType, TestResult, UserProfile } from './types';
import { TMTGame } from './components/TMTGame';
import { StatsChart } from './components/StatsChart';
import { analyzeTMTResult } from './lib/gemini';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { 
  Brain, 
  History, 
  Play, 
  GraduationCap, 
  LogOut, 
  User as UserIcon, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Info,
  Trash2,
  HelpCircle,
  UserCircle,
  FileText,
  Settings,
  LineChart as ChartIcon,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [view, setView] = useState<'home' | 'game' | 'training' | 'history' | 'profile' | 'help' | 'settings'>('home');
  const [activeTest, setActiveTest] = useState<{ type: TMTType; level?: number } | null>(null);
  const [analysis, setAnalysis] = useState<{ interpretation: string; recommendations: string[] } | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trainingType, setTrainingType] = useState<'standard' | 'arabic'>('standard');
  const [sidebarSkill, setSidebarSkill] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    aiSensitivity: 'normal' as 'high' | 'normal' | 'low',
    soundEnabled: true,
    volume: 50,
    visualFeedback: true,
    hapticFeedback: true
  });
  const resultsUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('tmt_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('tmt_settings', JSON.stringify(updated));
      return updated;
    });
    toast.success('تم تحديث الإعدادات');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        syncUser(u);
        if (resultsUnsubscribeRef.current) resultsUnsubscribeRef.current();
        resultsUnsubscribeRef.current = fetchResults(u.uid);
      } else {
        setResults([]);
        if (resultsUnsubscribeRef.current) {
          resultsUnsubscribeRef.current();
          resultsUnsubscribeRef.current = null;
        }
      }
    });
    return () => {
      unsubscribe();
      if (resultsUnsubscribeRef.current) resultsUnsubscribeRef.current();
    };
  }, []);

  const syncUser = async (u: User) => {
    try {
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid,
        email: u.email || null,
        displayName: u.displayName || (u.isAnonymous ? 'ضيف' : 'مستخدم'),
        photoURL: u.photoURL || null,
        createdAt: Timestamp.now()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`);
    }
  };

  const fetchResults = (uid: string) => {
    const q = query(
      collection(db, 'results'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setResults(data);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'results');
    });
  };

  const deleteResult = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'results', id));
      toast.success('تم حذف النتيجة');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'results');
    }
  };

  const clearAllData = async () => {
    if (!user || results.length === 0) return;
    if (!confirm('هل أنت متأكد من مسح جميع النتائج؟ لا يمكن التراجع عن هذه الخطوة.')) return;
    
    try {
      const promises = results.map(res => deleteDoc(doc(db, 'results', res.id)));
      await Promise.all(promises);
      toast.success('تم مسح جميع البيانات بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء مسح البيانات');
    }
  };

  const exportData = () => {
    if (results.length === 0) {
      toast.error('لا توجد بيانات لتصديرها');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `tmt_results_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('تم تجهيز الملف للتنزيل');
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (e) {
      toast.error('فشل تسجيل الدخول');
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
      toast.success('تم الدخول كضيف');
    } catch (e) {
      toast.error('فشل الدخول كضيف');
    }
  };

  const handleLogout = () => signOut(auth);

  const saveResult = async (time: number, errors: number) => {
    if (!user || !activeTest || isAnalyzing) return;

    // Start analysis immediately so we can save it with the document
    setIsAnalyzing(true);
    let aiResponse = null;
    try {
      aiResponse = await analyzeTMTResult(activeTest.type, time, errors, activeTest.level, settings.aiSensitivity);
    } catch (e) {
      console.error("AI Analysis failed:", e);
    }

    const result: TestResult = {
      uid: user.uid,
      testType: activeTest.type,
      level: activeTest.level,
      timeInSeconds: Number(time.toFixed(1)),
      errors,
      timestamp: Timestamp.now(),
      analysis: aiResponse || undefined
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), result);
      toast.success('تم حفظ النتيجة وتحليلها');
      setAnalysis(aiResponse);
      setSelectedResultId(docRef.id);
      setIsAnalyzing(false);
      setView('history');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'results');
      setIsAnalyzing(false);
    }
  };

  const startTest = (type: TMTType, level?: number) => {
    setActiveTest({ type, level });
    setAnalysis(null);
    setView('game');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans" dir="rtl">
        <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden rounded-2xl">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="text-center pt-10 pb-6">
            <div className="mx-auto bg-secondary w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3">
              <Brain className="w-12 h-12 text-primary -rotate-3" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">اختبار تتبع المسار</CardTitle>
            <CardDescription className="text-lg mt-2">Trail Making Test (TMT)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center px-8">
            <p className="text-muted-foreground leading-relaxed">
              منصة متقدمة لتقييم الأداء المعرفي، الانتباه، والمرونة الذهنية باستخدام تقنيات الذكاء الاصطناعي.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="font-bold text-primary text-lg">الجزء أ</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold">الانتباه</div>
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="font-bold text-primary text-lg">الجزء ب</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold">المرونة</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-8 pt-0">
            <Button onClick={handleLogin} className="w-full py-7 text-lg rounded-xl shadow-lg shadow-primary/20" size="lg">
              <UserIcon className="ml-2 w-5 h-5" />
              تسجيل الدخول بجوجل
            </Button>
            <Button onClick={handleGuestLogin} variant="outline" className="w-full py-7 text-lg rounded-xl border-2" size="lg">
              الدخول كضيف (تجربة سريعة)
            </Button>
            
            <div className="mt-8 pt-6 border-t border-border w-full text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">تصميم وبرمجة وإعداد</p>
              <h4 className="text-sm font-bold text-foreground">د. أحمد حمدي عاشور الغول</h4>
              <p className="text-[10px] text-primary font-bold">دكتوراه في علم النفس التربوي</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col" dir="rtl">
      <Toaster position="top-center" />
      
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
      {/* Header - Sleek Interface Style */}
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
            <Button 
              variant={view === 'settings' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('settings')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              الإعدادات
            </Button>
            <Button 
              variant={view === 'settings' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('settings')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              الإعدادات
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
        {/* Left Sidebar - Skills & Info */}
        <aside className="bg-white rounded-xl border border-border p-5 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 bg-primary rounded-sm" />
            المهارات المقاسة
          </h2>
          <div 
            className={cn(
              "bg-background p-3 rounded-lg border cursor-pointer transition-all hover:border-primary",
              sidebarSkill === 'A' ? "border-primary bg-primary/5" : "border-border"
            )}
            onClick={() => setSidebarSkill(sidebarSkill === 'A' ? null : 'A')}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[10px] text-muted-foreground font-bold uppercase">الجزء (أ) - TMT-A</h3>
              <Info className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">الانتباه البصري والسرعة</p>
            <AnimatePresence>
              {sidebarSkill === 'A' && (
                <motion.p 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-[10px] text-muted-foreground mt-2 border-t pt-2"
                >
                  لقياس مدى كفاءة المسح البصري والتناسق الحركي. البطء هنا قد يشير إلى الحاجة لتمارين التركيز.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div 
            className={cn(
              "bg-background p-3 rounded-lg border cursor-pointer transition-all hover:border-primary",
              sidebarSkill === 'B' ? "border-primary bg-primary/5" : "border-border"
            )}
            onClick={() => setSidebarSkill(sidebarSkill === 'B' ? null : 'B')}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[10px] text-muted-foreground font-bold uppercase">الجزء (ب) - TMT-B</h3>
              <Info className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">المرونة والذاكرة العاملة</p>
            <AnimatePresence>
              {sidebarSkill === 'B' && (
                <motion.p 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-[10px] text-muted-foreground mt-2 border-t pt-2"
                >
                  لقياس القدرة على تبديل المهام ذهنياً. الفشل في التناوب السريع يشير إلى ضعف في المرونة المعرفية.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div 
            className={cn(
              "bg-primary/5 p-3 rounded-lg border cursor-pointer transition-all hover:border-primary",
              sidebarSkill === 'AR' ? "border-primary bg-primary/10" : "border-primary/20"
            )}
            onClick={() => setSidebarSkill(sidebarSkill === 'AR' ? null : 'AR')}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-[10px] text-primary font-bold uppercase">المسار العربي - AR</h3>
              <Info className="w-3 h-3 text-primary/60" />
            </div>
            <p className="text-sm font-semibold">تتبع الحروف الهجائية</p>
            <AnimatePresence>
              {sidebarSkill === 'AR' && (
                <motion.p 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-[10px] text-primary/80 mt-2 border-t border-primary/10 pt-2"
                >
                  نفس الجزء (ب) ولكن باستخدام الأرقام والحروف العربية، وهو مناسب للبيئة العربية لضمان دقة قياس المرونة الذهنية.
                </motion.p>
              )}
            </AnimatePresence>
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
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 flex flex-col items-center justify-center h-full text-center space-y-8"
              >
                <div className="max-w-md space-y-4">
                  <Brain className="w-20 h-20 text-primary mx-auto opacity-20" />
                  <h2 className="text-3xl font-bold text-foreground">مرحباً بك في منصة التقييم</h2>
                  <p className="text-muted-foreground">اختر نوع الاختبار للبدء في تقييم الوظائف التنفيذية أو ابدأ التدريب المتدرج من الأسفل.</p>
                </div>
                <div className="flex gap-4">
                  <Button size="lg" className="px-8 py-6 text-lg" onClick={() => startTest('TMT-A')}>ابدأ الجزء (أ)</Button>
                  <Button size="lg" variant="secondary" className="px-8 py-6 text-lg" onClick={() => startTest('TMT-B')}>ابدأ الجزء (ب)</Button>
                </div>

                <div className="pt-8 border-t border-border w-full flex flex-col items-center">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">قسم خاص: مسارات الاختبار العربية</h3>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button variant="outline" size="lg" className="px-8 py-6 border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 group" onClick={() => startTest('TMT-A')}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">أ</div>
                        <div className="text-right">
                          <div className="font-bold">الجزء (أ) بالعربية</div>
                          <div className="text-[10px] text-muted-foreground uppercase">أرقام فقط</div>
                        </div>
                      </div>
                    </Button>
                    <Button variant="outline" size="lg" className="px-8 py-6 border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 group" onClick={() => startTest('TMT-B-AR')}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">ب</div>
                        <div className="text-right">
                          <div className="font-bold">الجزء (ب) بالعربية</div>
                          <div className="text-[10px] text-muted-foreground uppercase">أرقام وحروف عربية</div>
                        </div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className={cn(
                        "px-8 py-6 border-2 transition-all",
                        trainingType === 'arabic' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border hover:border-emerald-200"
                      )}
                      onClick={() => setTrainingType(trainingType === 'arabic' ? 'standard' : 'arabic')}
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className={cn("w-6 h-6", trainingType === 'arabic' ? "text-emerald-600" : "text-muted-foreground")} />
                        <div className="text-right">
                          <div className="font-bold">تفعيل تدريب المسار العربي</div>
                          <div className="text-[10px] uppercase">تغيير مستويات التدريب بالأسفل</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'game' && activeTest && (
              <motion.div 
                key="game"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col"
              >
                <TMTGame 
                  type={activeTest.type} 
                  level={activeTest.level}
                  onComplete={saveResult}
                  settings={settings}
                  onCancel={() => {
                    setView('home');
                    setActiveTest(null);
                  }}
                />
              </motion.div>
            )}

            {view === 'training' && (
              <motion.div 
                key="training"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 flex flex-col h-full overflow-y-auto"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">مركز التدريب المتدرج</h2>
                  <p className="text-muted-foreground">قم ببناء مهارات التتبع البصري والمرونة الذهنية خطوة بخطوة.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Standard Training */}
                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2 text-primary">
                      <div className="w-2 h-6 bg-primary rounded-full" />
                      التدريب القياسي (Standard)
                    </h3>
                    <div className="grid gap-3">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <Card key={lvl} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => startTest('TRAINING', lvl)}>
                          <CardHeader className="p-4 space-y-0 flex flex-row items-center justify-between">
                            <div>
                              <div className="text-[10px] font-bold text-primary uppercase">مستوى {lvl}</div>
                              <CardTitle className="text-base">
                                {lvl === 1 ? 'تتبع أرقام بسيطة' : 
                                 lvl === 2 ? 'سرعة المعالجة البصرية' :
                                 lvl === 3 ? 'التناوب العقلي الشامل' :
                                 lvl === 4 ? 'التفكير المرن المتقدم' : 'المهام التنفيذية المركبة'}
                              </CardTitle>
                              <CardDescription>
                                {lvl === 1 ? 'توصيل من 1 إلى 10 - التركيز: المهارة الحركية والمسح البصري الأساسي.' : 
                                 lvl === 2 ? 'توصيل من 1 إلى 20 - التركيز: زيادة سعة الانتباه وسرعة المعالجة.' :
                                 lvl === 3 ? 'التناوب بين الأرقام والحروف - التركيز: المرونة الإدراكية والذاكرة العاملة.' :
                                 lvl === 4 ? 'تغيير القواعد والمسارات - التركيز: كبت الاستجابة والتحكم التنفيذي.' : 'تحدي المتاهات المعقدة - التركيز: التخطيط الاستراتيجي وحل المشكلات.'}
                              </CardDescription>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-[-4px]" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Arabic Training */}
                  <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2 text-emerald-600">
                      <div className="w-2 h-6 bg-emerald-600 rounded-full" />
                      التدريب العربي (Arabic Path)
                    </h3>
                    <div className="grid gap-3">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <Card key={lvl} className="hover:border-emerald-500/50 transition-colors cursor-pointer group border-emerald-100" onClick={() => startTest('TMT-B-AR-TRAINING', lvl)}>
                          <CardHeader className="p-4 space-y-0 flex flex-row items-center justify-between">
                            <div>
                              <div className="text-[10px] font-bold text-emerald-600 uppercase">تدريب عربي {lvl}</div>
                              <CardTitle className="text-base text-emerald-950">
                                {lvl === 1 ? 'بداية المسار الهجائي' : 
                                 lvl === 2 ? 'تكامل الأرقام والحروف' :
                                 lvl === 3 ? 'التناوب الهجائي المركز' :
                                 lvl === 4 ? 'المرونة اللغوية الذهنية' : 'إتقان الإدراك الهجائي'}
                              </CardTitle>
                              <CardDescription>
                                {lvl === 1 ? 'توصيل من 1 إلى أ - التركيز: الربط البصري الأولي بين الأرقام والحروف.' : 
                                 lvl === 2 ? 'تسلسل تصاعدي حتى ج - التركيز: التناوب بين نظامين معرفيين مختلفين.' :
                                 lvl === 3 ? 'مناورة سريعة حتى حرف خ - التركيز: سرعة الاستدعاء والمعالجة الهجائية.' :
                                 lvl === 4 ? 'تركيز معقد حتى حرف ذ - التركيز: الربط المتقدم بين الرموز اللغوية والعددية.' : 'إتقان كامل للمسار - التركيز: الكفاءة التنفيذية القصوى في سياق لغوي.'}
                              </CardDescription>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-[-4px]" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 flex flex-col h-full overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-xl">سجل النتائج والتحليلات</h3>
                    <div className="h-4 w-px bg-border" />
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedResultId(null)}>
                      <ChartIcon className="w-4 h-4" />
                      إحصائيات عامة
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setView('home')}>العودة</Button>
                </div>

                <div className="flex-1 flex gap-6 overflow-hidden">
                  {/* Left Column: List */}
                  <div className="w-1/3 flex flex-col gap-3">
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-4">
                        {results.length === 0 && (
                          <div className="text-center py-10 opacity-50">
                            <History className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-sm">لا توجد نتائج مسجلة حالياً</p>
                          </div>
                        )}
                        {results.map((res) => (
                          <div 
                            key={res.id} 
                            onClick={() => setSelectedResultId(res.id)}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all",
                              selectedResultId === res.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Badge className={cn(
                                res.testType === 'TMT-A' ? "bg-blue-500" :
                                res.testType === 'TMT-B' ? "bg-purple-500" : 
                                res.testType === 'TMT-B-AR' ? "bg-emerald-500" : 
                                res.testType === 'TMT-B-AR-TRAINING' ? "bg-teal-500" : "bg-orange-500"
                              )}>
                                {res.testType === 'TMT-A' ? 'A' : res.testType === 'TMT-B' ? 'B' : res.testType === 'TMT-B-AR' ? 'AR' : res.testType === 'TMT-B-AR-TRAINING' ? 'T' : 'T'}
                              </Badge>
                              <div>
                                <div className="text-xs font-bold leading-tight">
                                  {res.testType === 'TRAINING' ? `مستوى ${res.level}` : 
                                   res.testType === 'TMT-B-AR-TRAINING' ? `تدريب عربي ${res.level}` :
                                   res.testType === 'TMT-B-AR' ? 'الجزء (ب) عربي' : res.testType}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{res.timestamp?.toDate()?.toLocaleDateString('ar-EG')}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="text-xs font-bold">{res.timeInSeconds}s</div>
                              <div className="text-[9px] text-destructive">{res.errors} خطأ</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Right Column: Display Analysis or Chart */}
                  <div className="flex-1 bg-slate-50/50 rounded-2xl border border-border p-6 overflow-y-auto">
                    {selectedResultId ? (
                      <div className="space-y-6">
                        {results.find(r => r.id === selectedResultId)?.analysis ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                التقرير التحليلي للذكاء الاصطناعي
                              </h4>
                              <Button variant="ghost" size="icon" onClick={() => deleteResult(selectedResultId)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm leading-relaxed text-slate-700 text-right" dir="rtl">
                              <p>{results.find(r => r.id === selectedResultId)?.analysis?.interpretation}</p>
                            </div>
                            <div className="space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">التوصيات المقترحة:</h5>
                              <div className="flex flex-wrap gap-2">
                                {results.find(r => r.id === selectedResultId)?.analysis?.recommendations.map((rec, i) => (
                                  <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 py-1.5 px-3">
                                    <CheckCircle2 className="w-3 h-3 ml-2" />
                                    {rec}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Brain className="w-16 h-16 mb-4" />
                            <p>لا يوجد تحليل متوفر لهذه النتيجة.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-lg flex items-center gap-2">
                            <ChartIcon className="w-5 h-5" />
                            لوحة المتابعة الإحصائية
                          </h4>
                        </div>
                        <StatsChart results={results} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 flex flex-col h-full max-w-4xl mx-auto space-y-8 overflow-y-auto"
              >
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-border shadow-sm">
                  <div>
                    <h2 className="text-3xl font-bold">الإعدادات المتقدمة</h2>
                    <p className="text-muted-foreground mt-1 text-sm">خصص تجربة التقييم وتحليل الذكاء الاصطناعي</p>
                  </div>
                  <Button variant="ghost" className="gap-2" onClick={() => setView('home')}>
                    <ChevronLeft className="w-4 h-4 ml-2" />
                    العودة للرئيسية
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pb-10">
                  {/* AI Settings */}
                  <Card className="border-primary/10 shadow-sm">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        حساسية تحليل الذكاء الاصطناعي
                      </CardTitle>
                      <CardDescription>تحكم في مدى صرامة المعايير المستخدمة في التقييم التلقائي للأداء.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                       <div className="flex bg-muted p-1 rounded-xl">
                          {(['low', 'normal', 'high'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => updateSettings({ aiSensitivity: level })}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all",
                                settings.aiSensitivity === level 
                                  ? "bg-white text-primary shadow-sm" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {level === 'low' ? 'منخفضة' : level === 'normal' ? 'متوسطة' : 'عالية'}
                            </button>
                          ))}
                       </div>
                       <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" />
                            تأثير هذا الضبط:
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {settings.aiSensitivity === 'high' && "سيتم استخدام معايير صارمة جداً. التقرير سيركز على أدق التفاصيل في زمن المعالجة وتوزيع الأخطاء."}
                            {settings.aiSensitivity === 'normal' && "توازن بين الدقة والمرونة. المسار الافتراضي لمعظم الفئات العمرية والتشخيصية."}
                            {settings.aiSensitivity === 'low' && "معايير أكثر تسامحاً. مناسبة للفئات العمرية الكبيرة أو حالات الضعف الإدراكي الشديد."}
                          </p>
                       </div>
                    </CardContent>
                  </Card>

                  {/* Audio & Visuals */}
                  <Card className="border-border shadow-sm">
                    <CardHeader className="bg-slate-50 border-b">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        <Settings className="w-5 h-5" />
                        التغذية الراجعة الصوتية والبصرية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold flex items-center gap-2">تفعيل المؤثرات الصوتية</div>
                              <div className="text-xs text-muted-foreground">تشغيل الأصوات عند النقر الصحيح أو الخطأ</div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={settings.soundEnabled} 
                              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                              className="w-10 h-5 bg-muted rounded-full appearance-none checked:bg-primary transition-all relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all"
                            />
                          </div>

                          {settings.soundEnabled && (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span>مستوى الصوت</span>
                                <span>{settings.volume}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={settings.volume} 
                                onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div>
                              <div className="font-bold">المؤثرات البصرية الاحتفالية</div>
                              <div className="text-xs text-muted-foreground">إظهار القصاصات الملونة (Confetti) عند الانتهاء</div>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={settings.visualFeedback} 
                              onChange={(e) => updateSettings({ visualFeedback: e.target.checked })}
                              className="w-10 h-5 bg-muted rounded-full appearance-none checked:bg-emerald-500 transition-all relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all"
                            />
                          </div>
                        </div>
                    </CardContent>
                  </Card>

                  {/* Profile Card Refined */}
                  <Card className="md:col-span-2 border-border shadow-sm overflow-hidden">
                    <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white ring-2 ring-white/20">
                          <UserCircle className="w-10 h-10" />
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{user.displayName || 'مستخدم المنصة'}</div>
                          <div className="text-slate-400 text-sm">{user.email || 'حساب زائر'}</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10" onClick={exportData}>
                          <FileText className="w-4 h-4 ml-2" />
                          تصدير السجل
                        </Button>
                        <Button variant="destructive" onClick={handleLogout}>
                          <LogOut className="w-4 h-4 ml-2" />
                          تسجيل الخروج
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-0">
                      <div className="grid grid-cols-3 divide-x divide-x-reverse border-b">
                        <div className="p-6 text-center">
                          <div className="text-2xl font-bold text-primary">{results.length}</div>
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">إجمالي المحاولات</div>
                        </div>
                        <div className="p-6 text-center">
                          <div className="text-2xl font-bold text-emerald-600">
                             {results.length > 0 ? (results.filter(r => r.errors === 0).length / results.length * 100).toFixed(0) : 0}%
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">نسبة الدقة المثالية</div>
                        </div>
                        <div className="p-6 text-center">
                          <div className="text-2xl font-bold text-amber-600">
                             {results.length > 0 ? (results.reduce((acc, r) => acc + r.errors, 0) / results.length).toFixed(1) : 0}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">متوسط الأخطاء / محاولة</div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 justify-center p-4">
                       <Button variant="ghost" className="text-destructive font-bold text-xs" onClick={clearAllData}>
                          <Trash2 className="w-4 h-4 ml-2" />
                          مسح كافة بيانات السجل نهائياً
                       </Button>
                    </CardFooter>
                  </Card>
                </div>
              </motion.div>
            )}

            {view === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col h-full items-center justify-center text-center max-w-lg mx-auto"
              >
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 ring-4 ring-primary/5">
                  <UserCircle className="w-16 h-16" />
                </div>
                <h2 className="text-2xl font-bold mb-1">{user.displayName || 'مستخدم المنصة'}</h2>
                <p className="text-muted-foreground mb-8">{user.email || 'حساب زائر'}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="p-4 bg-muted rounded-xl border border-border">
                    <div className="text-2xl font-bold text-primary">{results.length}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">إجمالي الاختبارات</div>
                  </div>
                  <div className="p-4 bg-muted rounded-xl border border-border">
                    <div className="text-2xl font-bold text-emerald-600">
                      {results.filter(r => r.errors === 0).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">اختبارات بدون أخطاء</div>
                  </div>
                </div>

                <div className="space-y-3 w-full">
                  <Button variant="outline" className="w-full gap-2 justify-start py-6" onClick={() => setView('history')}>
                    <History className="w-4 h-4" />
                    عرض سجل النتائج الكامل
                  </Button>
                  <Button variant="outline" className="w-full gap-2 justify-start py-6" onClick={() => setView('help')}>
                    <HelpCircle className="w-4 h-4" />
                    دليل الاستخدام والتعليمات
                  </Button>
                  <Button variant="destructive" className="w-full gap-2 py-6 mt-4" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </Button>
                </div>
              </motion.div>
            )}

            {view === 'help' && (
              <motion.div 
                key="help"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8 flex flex-col h-full overflow-y-auto"
              >
                <div className="mb-8 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">تعليمات ودليل المنصة</h2>
                    <p className="text-muted-foreground italic text-sm underline decoration-primary/30 underline-offset-4">كيفية أداء اختبار تتبع المسار (TMT) بشكل صحيح.</p>
                  </div>
                  <Button variant="ghost" onClick={() => setView('home')}>العودة</Button>
                </div>

                <div className="space-y-8 max-w-2xl">
                  <section className="space-y-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      ما هو اختبار تتبع المسار؟
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      يعد اختبار تتبع المسار (Trail Making Test) من أشهر الأدوات النفسية والعصبية لتقييم الوظائف التنفيذية. يتكون المقياس من جزئين أساسيين يقيسان مهارات ذهنية مختلفة تماماً.
                    </p>
                  </section>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-xl space-y-3">
                      <h4 className="font-bold text-blue-700">الجزء (أ) - TMT-A</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        يُطلب من المفحوص توصيل دوائر تحتوي على أرقام (1-25) بترتيب تصاعدي. يقيس هذا الجزء سرعة المعالجة الحركية البصرية والانتباه المستمر.
                      </p>
                    </div>
                    <div className="p-5 border border-purple-100 bg-purple-50/30 rounded-xl space-y-3">
                      <h4 className="font-bold text-purple-700">الجزء (ب) - TMT-B</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        تحدي أكبر حيث يجب التناوب بين الأرقام والحروف (1-أ-2-ب...). يقيس هذا الجزء المرونة المعرفية والقدرة على تقسيم الانتباه وتغيير القواعد الذهنية.
                      </p>
                    </div>
                  </div>

                  <section className="space-y-3 pt-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      نصائح للأداء الأفضل:
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-3 list-none">
                      <li className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>احرص على إنهاء الاختبار بأسرع وقت ممكن وبأقل قدر من الأخطاء.</span>
                      </li>
                      <li className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>في حال الخطأ، سيظهر وميض أحمر، عد للنقطة الصحيحة السابقة وأكمل المسار.</span>
                      </li>
                      <li className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>استخدم التدريبات المتدرجة أولاً إذا كانت هذه تجربتك الأولى مع الاختبار.</span>
                      </li>
                    </ul>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar - Statistical Analysis */}
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

      {/* Footer - Training Levels */}
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
}
