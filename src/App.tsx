import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { TMTType, TestResult, UserProfile } from './types';
import { TMTGame } from './components/TMTGame';
import Layout from './components/Layout';
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
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [view, setView] = useState<'home' | 'game' | 'training' | 'history' | 'profile' | 'help'>('home');
  const [activeTest, setActiveTest] = useState<{ type: TMTType; level?: number } | null>(null);
  const [analysis, setAnalysis] = useState<{ interpretation: string; recommendations: string[] } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trainingType, setTrainingType] = useState<'standard' | 'arabic'>('standard');
  const resultsUnsubscribeRef = useRef<(() => void) | null>(null);

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
            <Button onClick={handleGuestLogin} className="w-full py-7 text-lg rounded-xl shadow-lg shadow-primary/20" size="lg">
              <Play className="ml-2 w-5 h-5" />
              ابدأ الاختبار الآن
            </Button>
            
            <Button onClick={handleLogin} variant="outline" className="w-full py-6 text-sm rounded-xl border-2 border-dashed" size="sm">
              <UserIcon className="ml-2 w-4 h-4 text-muted-foreground" />
              تسجيل الدخول بجوجل (لحفظ النتائج دائمًا)
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
    <Layout
      user={user}
      view={view}
      setView={setView}
      results={results}
      isAnalyzing={isAnalyzing}
      trainingType={trainingType}
      setTrainingType={setTrainingType}
      startTest={startTest}
      activeTest={activeTest}
      handleLogout={handleLogout}
    >
      <Toaster position="top-center" />
      
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
                    <div className="flex gap-4 items-center">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase">الزمن</div>
                        <div className="text-sm font-bold">{res.timeInSeconds}s</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase">الأخطاء</div>
                        <div className="text-sm font-bold text-destructive">{res.errors}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => deleteResult(res.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
    </Layout>
  );
}
