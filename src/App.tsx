import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, setDoc, doc } from 'firebase/firestore';
import { TMTType, TestResult, UserProfile } from './types';
import { TMTGame } from './components/TMTGame';
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
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [view, setView] = useState<'home' | 'game' | 'training' | 'history'>('home');
  const [activeTest, setActiveTest] = useState<{ type: TMTType; level?: number } | null>(null);
  const [analysis, setAnalysis] = useState<{ interpretation: string; recommendations: string[] } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trainingType, setTrainingType] = useState<'standard' | 'arabic'>('standard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        syncUser(u);
        fetchResults(u.uid);
      } else {
        setResults([]);
      }
    });
    return unsubscribe;
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
    if (!user || !activeTest) return;

    const result: TestResult = {
      uid: user.uid,
      testType: activeTest.type,
      level: activeTest.level,
      timeInSeconds: Number(time.toFixed(1)),
      errors,
      timestamp: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'results'), result);
      toast.success('تم حفظ النتيجة');
      
      // AI Analysis
      setIsAnalyzing(true);
      const aiResponse = await analyzeTMTResult(activeTest.type, time, errors, activeTest.level);
      setAnalysis(aiResponse);
      setIsAnalyzing(false);
      
      setView('history');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'results');
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
          </nav>
        </div>
        <div className="flex gap-5">
          <div className="flex flex-col items-end">
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
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 mb-1">تصميم وبرمجة وإعداد</p>
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
                  <div className="flex gap-4">
                    <Button variant="outline" size="lg" className="px-8 py-6 border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 group" onClick={() => startTest('TMT-B-AR')}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">أ</div>
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
                  onCancel={() => setView('home')}
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
                                {lvl === 1 ? 'توصيل من 1 إلى 10' : 
                                 lvl === 2 ? 'توصيل من 1 إلى 20 بتركيز عالٍ' :
                                 lvl === 3 ? 'التناوب بين الأرقام والحروف ABCD' :
                                 lvl === 4 ? 'تغيير القواعد والمسارات' : 'تحدي المتاهات المعقدة'}
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
                                {lvl === 1 ? 'توصيل من 1 إلى أ' : 
                                 lvl === 2 ? 'تسلسل تصاعدي حتى حرف ج' :
                                 lvl === 3 ? 'مناورة سريعة حتى حرف خ' :
                                 lvl === 4 ? 'تركيز معقد حتى حرف ذ' : 'إتقان كامل للمسار العربي'}
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
                className="p-6 flex flex-col h-full"
              >
                {analysis && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 shrink-0">
                    <h3 className="text-primary font-bold flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5" />
                      تحليل الأداء الذكي
                    </h3>
                    <p className="text-sm text-slate-800 mb-4 leading-relaxed">{analysis.interpretation}</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.recommendations.map((rec, i) => (
                        <Badge key={i} variant="secondary" className="bg-white border-blue-200 text-blue-700">{rec}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">سجل النتائج الأخير</h3>
                  <Button variant="ghost" size="sm" onClick={() => setView('home')}>العودة</Button>
                </div>

                <ScrollArea className="flex-1 -mx-2 px-2">
                  <div className="space-y-3">
                    {results.map((res, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background/50">
                        <div className="flex items-center gap-3">
                          <Badge className={cn(
                            res.testType === 'TMT-A' ? "bg-blue-500" :
                            res.testType === 'TMT-B' ? "bg-purple-500" : 
                            res.testType === 'TMT-B-AR' ? "bg-emerald-500" : 
                            res.testType === 'TMT-B-AR-TRAINING' ? "bg-teal-500" : "bg-orange-500"
                          )}>
                            {res.testType === 'TMT-A' ? 'A' : res.testType === 'TMT-B' ? 'B' : res.testType === 'TMT-B-AR' ? 'AR' : res.testType === 'TMT-B-AR-TRAINING' ? 'ت-ع' : 'T'}
                          </Badge>
                          <div>
                            <div className="text-sm font-bold">
                              {res.testType === 'TRAINING' ? `تدريب - مستوى ${res.level}` : 
                               res.testType === 'TMT-B-AR-TRAINING' ? `تدريب عربي - مستوى ${res.level}` :
                               res.testType === 'TMT-B-AR' ? 'الجزء (ب) - مسار عربي' : res.testType}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{res.timestamp?.toDate().toLocaleDateString('ar-EG')}</div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase">الزمن</div>
                            <div className="text-sm font-bold">{res.timeInSeconds}s</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase">الأخطاء</div>
                            <div className="text-sm font-bold text-destructive">{res.errors}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
