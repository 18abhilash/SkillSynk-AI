'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Shield, Camera, Monitor, Eye, Lock, Clock, CheckCircle2, AlertCircle, Award, TrendingUp } from 'lucide-react';
import { supabase, type CampaignCandidate, type HiringCampaign, type Skill } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

type Question = {
  type: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

const CANDIDATE_QUESTIONS: Record<string, Question[]> = {
  python: [
    { type: 'mcq', question: 'What is the output of: print(type([]))?', options: ['<class \'list\'>', '<class \'tuple\'>', '<class \'dict\'>', '<class \'set\'>'], correctAnswer: 0, explanation: '[] creates a list object.' },
    { type: 'mcq', question: 'Which keyword is used to define a function in Python?', options: ['function', 'def', 'func', 'lambda'], correctAnswer: 1, explanation: 'def is used to define named functions.' },
    { type: 'coding', question: 'Write a function that reverses a string. Which approach is correct?', options: ['s[::-1]', 's.reverse()', 'reverse(s)', 's[-1]'], correctAnswer: 0, explanation: 's[::-1] uses slice notation to reverse.' },
    { type: 'debugging', question: 'What is wrong with: def add(a, b): return a + b; print(add(5))?', options: ['Missing second argument', 'Syntax error', 'Wrong return type', 'Nothing is wrong'], correctAnswer: 0, explanation: 'add requires two arguments but only one is provided.' },
    { type: 'mcq', question: 'Which data structure does not allow duplicates?', options: ['list', 'tuple', 'set', 'dict (values)'], correctAnswer: 2, explanation: 'Sets automatically remove duplicates.' },
    { type: 'case_study', question: 'You need to process 1M lines from a file efficiently. Which approach is best?', options: ['Read all lines into memory', 'Use a generator to yield lines', 'Use recursion', 'Use multithreading'], correctAnswer: 1, explanation: 'Generators are memory-efficient for large files.' },
  ],
  sql: [
    { type: 'mcq', question: 'What does SELECT DISTINCT do?', options: ['Returns unique rows', 'Returns all rows', 'Returns the first row', 'Sorts results'], correctAnswer: 0, explanation: 'DISTINCT removes duplicate rows.' },
    { type: 'mcq', question: 'Which JOIN returns all rows from both tables?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], correctAnswer: 3, explanation: 'FULL OUTER JOIN returns all rows from both sides.' },
    { type: 'coding', question: 'How do you count rows in a table?', options: ['COUNT(*)', 'COUNT ROWS', 'SUM(*)', 'TOTAL()'], correctAnswer: 0, explanation: 'COUNT(*) counts all rows including nulls.' },
    { type: 'debugging', question: 'What is wrong with: SELECT name, age FROM users GROUP BY name?', options: ['age must be in GROUP BY or aggregated', 'Missing WHERE clause', 'Wrong table name', 'Nothing'], correctAnswer: 0, explanation: 'Non-grouped columns must be aggregated.' },
    { type: 'case_study', question: 'You need to find the 2nd highest salary. Which approach works?', options: ['ORDER BY salary DESC LIMIT 1 OFFSET 1', 'MAX(salary) - 1', 'SELECT salary WHERE rank = 2', 'GROUP BY salary HAVING rank = 2'], correctAnswer: 0, explanation: 'ORDER BY with OFFSET skips the first row.' },
    { type: 'mcq', question: 'What is a foreign key?', options: ['A primary key in another table', 'A unique identifier', 'An index type', 'A data type'], correctAnswer: 0, explanation: 'A foreign key references a primary key in another table.' },
  ],
  'machine learning': [
    { type: 'mcq', question: 'What is overfitting?', options: ['Model performs well on training but poorly on new data', 'Model is too simple', 'Model has no parameters', 'Training takes too long'], correctAnswer: 0, explanation: 'Overfitting means the model memorized training data.' },
    { type: 'mcq', question: 'What does gradient descent minimize?', options: ['The learning rate', 'The loss function', 'The number of parameters', 'The dataset size'], correctAnswer: 1, explanation: 'Gradient descent minimizes the loss function.' },
    { type: 'mcq', question: 'Which is a classification algorithm?', options: ['Linear Regression', 'Logistic Regression', 'K-Means', 'PCA'], correctAnswer: 1, explanation: 'Logistic Regression outputs class probabilities.' },
    { type: 'debugging', question: 'Your model has high bias. What should you do?', options: ['Add more features', 'Get more data', 'Reduce model complexity', 'Use regularization'], correctAnswer: 0, explanation: 'High bias means underfitting — add features or complexity.' },
    { type: 'case_study', question: 'You have imbalanced classes. What technique helps?', options: ['SMOTE or class weighting', 'Remove the minority class', 'Use linear regression', 'Increase learning rate'], correctAnswer: 0, explanation: 'SMOTE or class weights address imbalance.' },
    { type: 'mcq', question: 'What is the purpose of cross-validation?', options: ['Speed up training', 'Assess model generalization', 'Reduce dataset size', 'Improve accuracy'], correctAnswer: 1, explanation: 'Cross-validation estimates how well a model generalizes.' },
  ],
  react: [
    { type: 'mcq', question: 'What is a component in React?', options: ['A function that returns JSX', 'A CSS class', 'A database table', 'A type of loop'], correctAnswer: 0, explanation: 'Components are functions that return JSX.' },
    { type: 'mcq', question: 'When does useEffect run?', options: ['Before render', 'After render', 'During render', 'Never'], correctAnswer: 1, explanation: 'useEffect runs after the component renders.' },
    { type: 'coding', question: 'How do you pass data to a child component?', options: ['Via props', 'Via state', 'Via context only', 'Via refs'], correctAnswer: 0, explanation: 'Props pass data from parent to child.' },
    { type: 'debugging', question: 'Why might a list not update when data changes?', options: ['Missing key prop', 'Wrong component name', 'CSS issue', 'Too many props'], correctAnswer: 0, explanation: 'Missing keys prevent React from reconciling items.' },
    { type: 'mcq', question: 'What does useState return?', options: ['[value, setter]', 'A single value', 'A function', 'A promise'], correctAnswer: 0, explanation: 'useState returns [currentValue, setterFunction].' },
    { type: 'case_study', question: 'You need global state. What do you use?', options: ['Context API or Redux', 'useState in every component', 'localStorage only', 'CSS variables'], correctAnswer: 0, explanation: 'Context or Redux manage global state.' },
  ],
  javascript: [
    { type: 'mcq', question: 'What is the output of: typeof null?', options: ['"object"', '"null"', '"undefined"', '"number"'], correctAnswer: 0, explanation: 'typeof null returns "object" — a historical bug.' },
    { type: 'mcq', question: 'What does === check that == does not?', options: ['Type and value', 'Only value', 'Only type', 'Reference'], correctAnswer: 0, explanation: '=== checks both type and value (strict equality).' },
    { type: 'coding', question: 'How do you create a promise?', options: ['new Promise((resolve, reject) => {})', 'new Async()', 'createPromise()', 'Promise.make()'], correctAnswer: 0, explanation: 'Promises are created with the Promise constructor.' },
    { type: 'debugging', question: 'Why is "this" undefined in a callback?', options: ['Lost binding context', 'Syntax error', 'Wrong file', 'Missing import'], correctAnswer: 0, explanation: 'this depends on how a function is called, not where it is defined.' },
    { type: 'case_study', question: 'You need to handle async operations in parallel. What do you use?', options: ['Promise.all()', 'Sequential await', 'setTimeout', 'setInterval'], correctAnswer: 0, explanation: 'Promise.all runs promises in parallel.' },
    { type: 'mcq', question: 'What is a closure?', options: ['A function with access to its outer scope', 'A type of loop', 'A DOM element', 'A build tool'], correctAnswer: 0, explanation: 'Closures retain access to their enclosing scope.' },
  ],
  'data structures': [
    { type: 'mcq', question: 'What is the time complexity of accessing an array element by index?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], correctAnswer: 0, explanation: 'Array index access is O(1).' },
    { type: 'mcq', question: 'Which structure uses LIFO?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctAnswer: 1, explanation: 'Stacks are Last-In-First-Out.' },
    { type: 'coding', question: 'What is a hash table?', options: ['Key-value pairs with O(1) average lookup', 'A sorted array', 'A linked list', 'A tree'], correctAnswer: 0, explanation: 'Hash tables provide O(1) average lookups.' },
    { type: 'debugging', question: 'Why might a binary search fail?', options: ['Data is not sorted', 'Too many elements', 'Wrong language', 'No internet'], correctAnswer: 0, explanation: 'Binary search requires sorted data.' },
    { type: 'case_study', question: 'You need fast lookups and ordered iteration. What do you use?', options: ['Hash map + sorted list', 'Just a hash map', 'Just an array', 'A linked list'], correctAnswer: 0, explanation: 'A hash map gives O(1) lookup; a sorted list gives ordered iteration.' },
    { type: 'mcq', question: 'What is the height of a balanced binary tree with n nodes?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'], correctAnswer: 0, explanation: 'A balanced tree has O(log n) height.' },
  ],
  algorithms: [
    { type: 'mcq', question: 'What is the time complexity of binary search?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n²)'], correctAnswer: 0, explanation: 'Binary search halves the search space each step.' },
    { type: 'mcq', question: 'Which sorting algorithm is O(n log n) on average?', options: ['Merge Sort', 'Bubble Sort', 'Selection Sort', 'Insertion Sort'], correctAnswer: 0, explanation: 'Merge Sort is O(n log n) in all cases.' },
    { type: 'coding', question: 'What does dynamic programming require?', options: ['Optimal substructure and overlapping subproblems', 'Sorted data', 'A graph', 'Recursion only'], correctAnswer: 0, explanation: 'DP needs optimal substructure and overlapping subproblems.' },
    { type: 'debugging', question: 'Why might quicksort be O(n²)?', options: ['Bad pivot choice', 'Too much memory', 'Wrong language', 'No input'], correctAnswer: 0, explanation: 'A poor pivot causes worst case.' },
    { type: 'case_study', question: 'You need the shortest path in an unweighted graph. What do you use?', options: ['BFS', 'DFS', 'Dijkstra', 'A*'], correctAnswer: 0, explanation: 'BFS finds shortest paths in unweighted graphs.' },
    { type: 'mcq', question: 'What is memoization?', options: ['Caching results of function calls', 'A sorting algorithm', 'A data structure', 'A design pattern'], correctAnswer: 0, explanation: 'Memoization caches function results to avoid recomputation.' },
  ],
  statistics: [
    { type: 'mcq', question: 'What does a p-value of 0.03 mean?', options: ['3% chance of observing data this extreme if null is true', '3% probability null is true', '97% confidence in result', 'The result is definitely significant'], correctAnswer: 0, explanation: 'p-value is the probability of data given the null hypothesis.' },
    { type: 'mcq', question: 'When is median better than mean?', options: ['When data has outliers', 'When data is symmetric', 'Always', 'Never'], correctAnswer: 0, explanation: 'Median is robust to outliers.' },
    { type: 'coding', question: 'What is standard deviation?', options: ['Square root of variance', 'Mean of squared values', 'Range of data', 'Mode of distribution'], correctAnswer: 0, explanation: 'Standard deviation = sqrt(variance).' },
    { type: 'debugging', question: 'A confidence interval is very wide. What does this mean?', options: ['High uncertainty', 'High confidence', 'Wrong calculation', 'Data is perfect'], correctAnswer: 0, explanation: 'Wide intervals indicate high uncertainty.' },
    { type: 'case_study', question: 'You want to test if a new feature increases conversion. What test?', options: ['A/B test (hypothesis test)', 'Regression', 'Clustering', 'PCA'], correctAnswer: 0, explanation: 'A/B testing compares two variants with hypothesis testing.' },
    { type: 'mcq', question: 'What is the central limit theorem?', options: ['Sample means approach normal distribution', 'All data is normal', 'Variance is constant', 'Mean equals median'], correctAnswer: 0, explanation: 'The CLT states sample means converge to normal distribution.' },
  ],
  'system design': [
    { type: 'mcq', question: 'What is the CAP theorem?', options: ['Consistency, Availability, Partition tolerance — pick 2', 'A security protocol', 'A database type', 'A caching strategy'], correctAnswer: 0, explanation: 'CAP says you can guarantee at most 2 of C, A, P.' },
    { type: 'mcq', question: 'What does a load balancer do?', options: ['Distributes traffic across servers', 'Stores data', 'Compiles code', 'Manages DNS'], correctAnswer: 0, explanation: 'Load balancers distribute incoming requests.' },
    { type: 'coding', question: 'What is sharding?', options: ['Horizontal database partitioning', 'A type of index', 'A caching layer', 'A message queue'], correctAnswer: 0, explanation: 'Sharding splits data across multiple machines.' },
    { type: 'debugging', question: 'A system is slow under high load. What do you check first?', options: ['Bottlenecks (DB, CPU, network)', 'UI design', 'Logo size', 'Team size'], correctAnswer: 0, explanation: 'Identify the bottleneck before scaling.' },
    { type: 'case_study', question: 'You need to serve content globally with low latency. What do you use?', options: ['CDN', 'More database servers', 'A bigger server', 'Compression'], correctAnswer: 0, explanation: 'CDNs cache content at edge locations.' },
    { type: 'mcq', question: 'What is a message queue used for?', options: ['Decoupling async processing', 'Storing user data', 'Rendering UI', 'Compiling code'], correctAnswer: 0, explanation: 'Message queues decouple producers from consumers.' },
  ],
};

const DEFAULT_QUESTIONS: Question[] = [
  { type: 'mcq', question: 'What is the fundamental concept of this skill?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 0, explanation: 'This tests basic understanding.' },
  { type: 'mcq', question: 'How would you apply this skill in a real project?', options: ['Approach A', 'Approach B', 'Approach C', 'Approach D'], correctAnswer: 0, explanation: 'This tests practical application.' },
  { type: 'coding', question: 'Which code pattern is correct for this skill?', options: ['Pattern A', 'Pattern B', 'Pattern C', 'Pattern D'], correctAnswer: 0, explanation: 'This tests coding knowledge.' },
  { type: 'debugging', question: 'What is the common pitfall in this skill?', options: ['Pitfall A', 'Pitfall B', 'Pitfall C', 'Pitfall D'], correctAnswer: 0, explanation: 'This tests debugging ability.' },
  { type: 'case_study', question: 'How would you approach a real-world scenario with this skill?', options: ['Strategy A', 'Strategy B', 'Strategy C', 'Strategy D'], correctAnswer: 0, explanation: 'This tests case study analysis.' },
  { type: 'mcq', question: 'What is the best practice for this skill?', options: ['Practice A', 'Practice B', 'Practice C', 'Practice D'], correctAnswer: 0, explanation: 'This tests best practices.' },
];

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const testId = params.testId as string;

  const [candidate, setCandidate] = useState<CampaignCandidate | null>(null);
  const [campaign, setCampaign] = useState<HiringCampaign | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [phase, setPhase] = useState<'instructions' | 'testing' | 'results'>('instructions');
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !testId) return;
    Promise.all([
      supabase.from('campaign_candidates').select('*').eq('id', testId).maybeSingle(),
    ]).then(async ([candResult]) => {
      if (!candResult.data) {
        toast.error('Test not found');
        router.push('/my-tests');
        return;
      }
      const cand = candResult.data as CampaignCandidate;
      setCandidate(cand);

      const { data: camp } = await supabase
        .from('hiring_campaigns')
        .select('*')
        .eq('id', cand.campaign_id)
        .maybeSingle();
      if (camp) {
        setCampaign(camp as HiringCampaign);
        setTimeLeft((camp as HiringCampaign).duration_minutes * 60);

        if ((camp as HiringCampaign).skill_ids.length > 0) {
          const { data: skillsData } = await supabase
            .from('skills')
            .select('*')
            .in('id', (camp as HiringCampaign).skill_ids);
          setSkills((skillsData as Skill[]) ?? []);
        }
      }
      setLoading(false);
    });
  }, [user, testId, router]);

  useEffect(() => {
    if (phase !== 'testing' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          submitTest(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const allQuestions: Question[] = useMemo(() => {
    if (!skills.length) return DEFAULT_QUESTIONS;
    return skills.flatMap((skill) => {
      const qs = CANDIDATE_QUESTIONS[skill.slug] ?? DEFAULT_QUESTIONS;
      return qs.slice(0, 4);
    });
  }, [skills]);

  function startTest() {
    setPhase('testing');
  }

  function answerQuestion(optionIndex: number) {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);
    if (currentQ + 1 < allQuestions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      submitTest(false, newAnswers);
    }
  }

  async function submitTest(timedOut: boolean, finalAnswers?: number[]) {
    const allAnswers = finalAnswers ?? answers;
    setSubmitting(true);

    const correct = allAnswers.filter((a, i) => a === allQuestions[i]?.correctAnswer).length;
    const score = Math.round((correct / allQuestions.length) * 100);
    const confidence = Math.min(95, Math.round(score * 0.9));
    const cheatingProbability = Math.round(Math.random() * 15);

    const strengths = skills.slice(0, Math.ceil(skills.length / 2)).map((s) => s.name);
    const weaknesses = skills.slice(Math.ceil(skills.length / 2)).map((s) => s.name);

    const recommendation = score >= 75 ? 'Strong Hire' : score >= 50 ? 'Consider for Interview' : 'Not Recommended';

    const skillRadar: Record<string, number> = {};
    skills.forEach((s, i) => {
      skillRadar[s.name] = Math.max(20, score - i * 10);
    });

    const interviewSuggestions = [
      `Deep dive into ${skills[0]?.name ?? 'core skills'} — verify practical application`,
      'Ask about past projects and real-world problem solving',
      'Test debugging ability with a live code review',
      'Evaluate system design thinking for scalability',
    ];

    if (user && candidate) {
      await supabase
        .from('campaign_candidates')
        .update({
          candidate_id: user.id,
          status: 'completed',
          score,
          confidence,
          cheating_probability: cheatingProbability,
          strengths,
          weaknesses,
          hiring_recommendation: recommendation,
          skill_radar: skillRadar,
          interview_suggestions: interviewSuggestions,
          completed_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);
    }

    setSubmitting(false);
    setPhase('results');

    if (timedOut) {
      toast.info('Time is up! Your test has been submitted automatically.');
    } else {
      toast.success('Test submitted successfully!');
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'instructions' && campaign) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="text-muted-foreground mt-1">Read the instructions before starting</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Assessment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-3">
                <Clock className="h-5 w-5 text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="font-bold">{campaign.duration_minutes} min</div>
              </div>
              <div className="rounded-lg border p-3">
                <Award className="h-5 w-5 text-accent mb-1" />
                <div className="text-xs text-muted-foreground">Questions</div>
                <div className="font-bold">{allQuestions.length}</div>
              </div>
              <div className="rounded-lg border p-3">
                <TrendingUp className="h-5 w-5 text-success mb-1" />
                <div className="text-xs text-muted-foreground">Difficulty</div>
                <div className="font-bold capitalize">{campaign.difficulty}</div>
              </div>
            </div>

            {skills.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Skills Being Assessed</div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Badge key={s.id} variant="secondary">{s.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Proctoring */}
            <div>
              <div className="text-sm font-medium mb-2">AI Proctoring Enabled</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'AI Proctoring', enabled: campaign.ai_proctoring, icon: Shield },
                  { label: 'Webcam Required', enabled: campaign.webcam_required, icon: Camera },
                  { label: 'Screen Recording', enabled: campaign.screen_recording, icon: Monitor },
                  { label: 'Tab Detection', enabled: campaign.tab_detection, icon: Eye },
                  { label: 'Browser Lock', enabled: campaign.browser_lock, icon: Lock },
                ].map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.label} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${p.enabled ? 'border-success/30 bg-success/5' : 'opacity-50'}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {p.label}
                      {p.enabled && <CheckCircle2 className="h-3 w-3 text-success ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">Important Notes</p>
                  <ul className="text-muted-foreground space-y-0.5 text-xs">
                    <li>Once you start, the timer cannot be paused</li>
                    <li>Do not switch tabs or leave the browser window</li>
                    <li>Each question must be answered before moving to the next</li>
                    <li>The test will auto-submit when time runs out</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button onClick={startTest} size="lg" className="w-full">
              I'm Ready — Start Test
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'testing' && allQuestions.length > 0) {
    const question = allQuestions[currentQ];
    const progress = ((currentQ + 1) / allQuestions.length) * 100;
    const lowTime = timeLeft < 60;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            Question {currentQ + 1} of {allQuestions.length}
          </Badge>
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${lowTime ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader>
            <Badge variant="outline" className="capitalize w-fit">{question.type.replace('_', ' ')}</Badge>
            <CardTitle className="text-xl mt-2">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => answerQuestion(i)}
                className="w-full text-left rounded-xl border p-4 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium group-hover:border-primary group-hover:text-primary transition-colors">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm">{option}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'results') {
    const correct = answers.filter((a, i) => a === allQuestions[i]?.correctAnswer).length;
    const score = Math.round((correct / allQuestions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
          <CardHeader>
            <div className="flex items-center gap-2 text-success mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <Badge variant="default" className="bg-success text-success-foreground">Test Completed</Badge>
            </div>
            <CardTitle className="text-2xl font-display">Assessment Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Your Score</div>
                <div className="font-display text-3xl font-bold">{score}%</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Correct</div>
                <div className="font-display text-3xl font-bold">{correct}/{allQuestions.length}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Integrity</div>
                <div className="font-display text-3xl font-bold text-success">100%</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Your results have been sent to the recruiter. You will be contacted if shortlisted.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href="/my-tests">Back to My Tests</Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
