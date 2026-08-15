'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Search, CheckCircle2, TrendingUp, Award, Star, Briefcase, DollarSign, ArrowRight, Loader2, Shield, Code, FileText, Bug, MessageSquare, BookOpen, AlertCircle, Building2, Clock, Target, Users } from 'lucide-react';
import { supabase, type Skill, type SkillAssessment, type HiringCampaign, type Company } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

type Phase = 'browse' | 'assessing' | 'results';

type Question = {
  type: 'mcq' | 'coding' | 'debugging' | 'case_study' | 'scenario';
  question: string;
  options?: string[];
  correctAnswer: number;
  explanation: string;
};

const ASSESSMENT_QUESTIONS: Record<string, Question[]> = {
  python: [
    { type: 'mcq', question: 'What is the output of: print(type([]))?', options: ['<class \'list\'>', '<class \'tuple\'>', '<class \'dict\'>', '<class \'set\'>'], correctAnswer: 0, explanation: '[] creates a list object.' },
    { type: 'mcq', question: 'Which keyword is used to define a function in Python?', options: ['function', 'def', 'func', 'lambda'], correctAnswer: 1, explanation: 'def is used to define named functions.' },
    { type: 'mcq', question: 'What does len("hello") return?', options: ['4', '5', '6', 'Error'], correctAnswer: 1, explanation: 'len returns the number of characters.' },
    { type: 'coding', question: 'Write a function that reverses a string. What is the correct approach?', options: ['s[::-1]', 's.reverse()', 'reverse(s)', 's[-1]'], correctAnswer: 0, explanation: 's[::-1] uses slice notation to reverse.' },
    { type: 'debugging', question: 'What is wrong with: def add(a, b): return a + b; print(add(5))?', options: ['Missing second argument', 'Syntax error', 'Wrong return type', 'Nothing is wrong'], correctAnswer: 0, explanation: 'add requires two arguments but only one is provided.' },
    { type: 'mcq', question: 'Which data structure does not allow duplicates?', options: ['list', 'tuple', 'set', 'dict (values)'], correctAnswer: 2, explanation: 'Sets automatically remove duplicates.' },
    { type: 'case_study', question: 'You need to process 1M lines from a file efficiently. Which approach is best?', options: ['Read all lines into memory', 'Use a generator to yield lines', 'Use recursion', 'Use multithreading'], correctAnswer: 1, explanation: 'Generators are memory-efficient for large files.' },
    { type: 'scenario', question: 'A teammate\'s code has no tests. What do you do first?', options: ['Rewrite everything', 'Add tests for critical paths', 'Report to manager', 'Ignore it'], correctAnswer: 1, explanation: 'Prioritize testing critical functionality first.' },
  ],
  sql: [
    { type: 'mcq', question: 'What does SELECT DISTINCT do?', options: ['Returns unique rows', 'Returns all rows', 'Returns the first row', 'Sorts results'], correctAnswer: 0, explanation: 'DISTINCT removes duplicate rows.' },
    { type: 'mcq', question: 'Which JOIN returns all rows from both tables?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], correctAnswer: 3, explanation: 'FULL OUTER JOIN returns all rows from both sides.' },
    { type: 'coding', question: 'How do you count rows in a table?', options: ['COUNT(*)', 'COUNT ROWS', 'SUM(*)', 'TOTAL()'], correctAnswer: 0, explanation: 'COUNT(*) counts all rows including nulls.' },
    { type: 'mcq', question: 'What does GROUP BY do?', options: ['Sorts data', 'Groups rows for aggregation', 'Filters rows', 'Joins tables'], correctAnswer: 1, explanation: 'GROUP BY groups rows sharing a property for aggregation.' },
    { type: 'debugging', question: 'What is wrong with: SELECT name, age FROM users GROUP BY name?', options: ['age must be in GROUP BY or aggregated', 'Missing WHERE clause', 'Wrong table name', 'Nothing'], correctAnswer: 0, explanation: 'Non-grouped columns must be aggregated.' },
    { type: 'case_study', question: 'You need to find the 2nd highest salary. Which approach works?', options: ['ORDER BY salary DESC LIMIT 1 OFFSET 1', 'MAX(salary) - 1', 'SELECT salary WHERE rank = 2', 'GROUP BY salary HAVING rank = 2'], correctAnswer: 0, explanation: 'ORDER BY with OFFSET skips the first row.' },
    { type: 'scenario', question: 'A query is slow on a 10M row table. What do you check first?', options: ['Add more RAM', 'Check indexes on WHERE/JOIN columns', 'Rewrite in NoSQL', 'Split the table'], correctAnswer: 1, explanation: 'Missing indexes are the most common cause of slow queries.' },
    { type: 'mcq', question: 'What is a foreign key?', options: ['A primary key in another table', 'A unique identifier', 'An index type', 'A data type'], correctAnswer: 0, explanation: 'A foreign key references a primary key in another table.' },
  ],
  'machine learning': [
    { type: 'mcq', question: 'What is overfitting?', options: ['Model performs well on training but poorly on new data', 'Model is too simple', 'Model has no parameters', 'Training takes too long'], correctAnswer: 0, explanation: 'Overfitting means the model memorized training data.' },
    { type: 'mcq', question: 'What does gradient descent minimize?', options: ['The learning rate', 'The loss function', 'The number of parameters', 'The dataset size'], correctAnswer: 1, explanation: 'Gradient descent minimizes the loss function.' },
    { type: 'mcq', question: 'Which is a classification algorithm?', options: ['Linear Regression', 'Logistic Regression', 'K-Means', 'PCA'], correctAnswer: 1, explanation: 'Logistic Regression outputs class probabilities.' },
    { type: 'coding', question: 'How do you split data for training and testing?', options: ['train_test_split()', 'split_data()', 'divide()', 'partition()'], correctAnswer: 0, explanation: 'train_test_split from sklearn splits data.' },
    { type: 'debugging', question: 'Your model has high bias. What should you do?', options: ['Add more features', 'Get more data', 'Reduce model complexity', 'Use regularization'], correctAnswer: 0, explanation: 'High bias means underfitting — add features or complexity.' },
    { type: 'case_study', question: 'You have imbalanced classes. What technique helps?', options: ['SMOTE or class weighting', 'Remove the minority class', 'Use linear regression', 'Increase learning rate'], correctAnswer: 0, explanation: 'SMOTE or class weights address imbalance.' },
    { type: 'scenario', question: 'A model works in training but fails in production. What is likely?', options: ['Data drift', 'Too much training data', 'Wrong IDE', 'Python version mismatch'], correctAnswer: 0, explanation: 'Data drift means production data differs from training.' },
    { type: 'mcq', question: 'What is the purpose of cross-validation?', options: ['Speed up training', 'Assess model generalization', 'Reduce dataset size', 'Improve accuracy'], correctAnswer: 1, explanation: 'Cross-validation estimates how well a model generalizes.' },
  ],
  react: [
    { type: 'mcq', question: 'What is a component in React?', options: ['A function that returns JSX', 'A CSS class', 'A database table', 'A type of loop'], correctAnswer: 0, explanation: 'Components are functions that return JSX.' },
    { type: 'mcq', question: 'When does useEffect run?', options: ['Before render', 'After render', 'During render', 'Never'], correctAnswer: 1, explanation: 'useEffect runs after the component renders.' },
    { type: 'coding', question: 'How do you pass data to a child component?', options: ['Via props', 'Via state', 'Via context only', 'Via refs'], correctAnswer: 0, explanation: 'Props pass data from parent to child.' },
    { type: 'debugging', question: 'Why might a list not update when data changes?', options: ['Missing key prop', 'Wrong component name', 'CSS issue', 'Too many props'], correctAnswer: 0, explanation: 'Missing keys prevent React from reconciling items.' },
    { type: 'mcq', question: 'What does useState return?', options: ['[value, setter]', 'A single value', 'A function', 'A promise'], correctAnswer: 0, explanation: 'useState returns [currentValue, setterFunction].' },
    { type: 'case_study', question: 'You need global state. What do you use?', options: ['Context API or Redux', 'useState in every component', 'localStorage only', 'CSS variables'], correctAnswer: 0, explanation: 'Context or Redux manage global state.' },
    { type: 'scenario', question: 'A component re-renders too often. What do you check?', options: ['useMemo/useCallback for expensive operations', 'CSS styles', 'HTML tags', 'File names'], correctAnswer: 0, explanation: 'Memoization prevents unnecessary re-renders.' },
    { type: 'mcq', question: 'What is a custom hook?', options: ['A reusable function using hooks', 'A type of component', 'A CSS feature', 'A build tool'], correctAnswer: 0, explanation: 'Custom hooks extract reusable stateful logic.' },
  ],
  'data structures': [
    { type: 'mcq', question: 'What is the time complexity of accessing an array element by index?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], correctAnswer: 0, explanation: 'Array index access is O(1).' },
    { type: 'mcq', question: 'Which structure uses LIFO?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctAnswer: 1, explanation: 'Stacks are Last-In-First-Out.' },
    { type: 'coding', question: 'What is a hash table?', options: ['Key-value pairs with O(1) average lookup', 'A sorted array', 'A linked list', 'A tree'], correctAnswer: 0, explanation: 'Hash tables provide O(1) average lookups.' },
    { type: 'debugging', question: 'Why might a binary search fail?', options: ['Data is not sorted', 'Too many elements', 'Wrong language', 'No internet'], correctAnswer: 0, explanation: 'Binary search requires sorted data.' },
    { type: 'case_study', question: 'You need fast lookups and ordered iteration. What do you use?', options: ['Hash map + sorted list', 'Just a hash map', 'Just an array', 'A linked list'], correctAnswer: 0, explanation: 'A hash map gives O(1) lookup; a sorted list gives ordered iteration.' },
    { type: 'scenario', question: 'A recursive solution causes stack overflow. What do you do?', options: ['Convert to iterative or use tail recursion', 'Add more RAM', 'Use a different language', 'Give up'], correctAnswer: 0, explanation: 'Converting to iterative avoids deep call stacks.' },
    { type: 'mcq', question: 'What is the height of a balanced binary tree with n nodes?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'], correctAnswer: 0, explanation: 'A balanced tree has O(log n) height.' },
    { type: 'mcq', question: 'Which is best for implementing a priority queue?', options: ['Heap', 'Array', 'Hash table', 'Stack'], correctAnswer: 0, explanation: 'Heaps provide O(log n) insert and extract-min/max.' },
  ],
  javascript: [
    { type: 'mcq', question: 'What is the output of: typeof null?', options: ['"object"', '"null"', '"undefined"', '"number"'], correctAnswer: 0, explanation: 'typeof null returns "object" — a historical bug.' },
    { type: 'mcq', question: 'What does === check that == does not?', options: ['Type and value', 'Only value', 'Only type', 'Reference'], correctAnswer: 0, explanation: '=== checks both type and value (strict equality).' },
    { type: 'coding', question: 'How do you create a promise?', options: ['new Promise((resolve, reject) => {})', 'new Async()', 'createPromise()', 'Promise.make()'], correctAnswer: 0, explanation: 'Promises are created with the Promise constructor.' },
    { type: 'debugging', question: 'Why is "this" undefined in a callback?', options: ['Lost binding context', 'Syntax error', 'Wrong file', 'Missing import'], correctAnswer: 0, explanation: 'this depends on how a function is called, not where it is defined.' },
    { type: 'case_study', question: 'You need to handle async operations in parallel. What do you use?', options: ['Promise.all()', 'Sequential await', 'setTimeout', 'setInterval'], correctAnswer: 0, explanation: 'Promise.all runs promises in parallel.' },
    { type: 'scenario', question: 'A function returns undefined unexpectedly. What do you check?', options: ['Missing return statement', 'CSS file', 'HTML structure', 'Package version'], correctAnswer: 0, explanation: 'Functions without an explicit return return undefined.' },
    { type: 'mcq', question: 'What is a closure?', options: ['A function with access to its outer scope', 'A type of loop', 'A DOM element', 'A build tool'], correctAnswer: 0, explanation: 'Closures retain access to their enclosing scope.' },
    { type: 'mcq', question: 'What does Array.map() return?', options: ['A new array', 'The original array', 'A boolean', 'A number'], correctAnswer: 0, explanation: 'map returns a new array with transformed elements.' },
  ],
  algorithms: [
    { type: 'mcq', question: 'What is the time complexity of binary search?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n²)'], correctAnswer: 0, explanation: 'Binary search halves the search space each step.' },
    { type: 'mcq', question: 'Which sorting algorithm is O(n log n) on average?', options: ['Merge Sort', 'Bubble Sort', 'Selection Sort', 'Insertion Sort'], correctAnswer: 0, explanation: 'Merge Sort is O(n log n) in all cases.' },
    { type: 'coding', question: 'What does dynamic programming require?', options: ['Optimal substructure and overlapping subproblems', 'Sorted data', 'A graph', 'Recursion only'], correctAnswer: 0, explanation: 'DP needs optimal substructure and overlapping subproblems.' },
    { type: 'debugging', question: 'Why might quicksort be O(n²)?', options: ['Bad pivot choice', 'Too much memory', 'Wrong language', 'No input'], correctAnswer: 0, explanation: 'A poor pivot (e.g., always first element) causes worst case.' },
    { type: 'case_study', question: 'You need the shortest path in an unweighted graph. What do you use?', options: ['BFS', 'DFS', 'Dijkstra', 'A*'], correctAnswer: 0, explanation: 'BFS finds shortest paths in unweighted graphs.' },
    { type: 'scenario', question: 'An algorithm is too slow. What do you check first?', options: ['Time complexity and data structures used', 'CPU speed', 'Monitor size', 'Keyboard layout'], correctAnswer: 0, explanation: 'Algorithmic complexity and data structure choice matter most.' },
    { type: 'mcq', question: 'What is memoization?', options: ['Caching results of function calls', 'A sorting algorithm', 'A data structure', 'A design pattern'], correctAnswer: 0, explanation: 'Memoization caches function results to avoid recomputation.' },
    { type: 'mcq', question: 'Which is NOT a greedy algorithm?', options: ['Dynamic Programming', 'Dijkstra', 'Huffman Coding', 'Kruskal'], correctAnswer: 0, explanation: 'DP considers all options; greedy picks locally optimal.' },
  ],
  statistics: [
    { type: 'mcq', question: 'What does a p-value of 0.03 mean?', options: ['3% chance of observing data this extreme if null is true', '3% probability null is true', '97% confidence in result', 'The result is definitely significant'], correctAnswer: 0, explanation: 'p-value is the probability of data given the null hypothesis.' },
    { type: 'mcq', question: 'When is median better than mean?', options: ['When data has outliers', 'When data is symmetric', 'Always', 'Never'], correctAnswer: 0, explanation: 'Median is robust to outliers.' },
    { type: 'coding', question: 'What is standard deviation?', options: ['Square root of variance', 'Mean of squared values', 'Range of data', 'Mode of distribution'], correctAnswer: 0, explanation: 'Standard deviation = sqrt(variance).' },
    { type: 'debugging', question: 'A confidence interval is very wide. What does this mean?', options: ['High uncertainty', 'High confidence', 'Wrong calculation', 'Data is perfect'], correctAnswer: 0, explanation: 'Wide intervals indicate high uncertainty.' },
    { type: 'case_study', question: 'You want to test if a new feature increases conversion. What test?', options: ['A/B test (hypothesis test)', 'Regression', 'Clustering', 'PCA'], correctAnswer: 0, explanation: 'A/B testing compares two variants with hypothesis testing.' },
    { type: 'scenario', question: 'Your sample size is too small. What happens?', options: ['Low statistical power', 'High accuracy', 'No effect', 'Faster computation'], correctAnswer: 0, explanation: 'Small samples reduce the ability to detect effects.' },
    { type: 'mcq', question: 'What is the central limit theorem?', options: ['Sample means approach normal distribution', 'All data is normal', 'Variance is constant', 'Mean equals median'], correctAnswer: 0, explanation: 'The CLT states sample means converge to normal distribution.' },
    { type: 'mcq', question: 'What is a Type I error?', options: ['False positive (rejecting true null)', 'False negative', 'Correct rejection', 'No error'], correctAnswer: 0, explanation: 'Type I error = false positive.' },
  ],
  'system design': [
    { type: 'mcq', question: 'What is the CAP theorem?', options: ['Consistency, Availability, Partition tolerance — pick 2', 'A security protocol', 'A database type', 'A caching strategy'], correctAnswer: 0, explanation: 'CAP says you can guarantee at most 2 of C, A, P.' },
    { type: 'mcq', question: 'What does a load balancer do?', options: ['Distributes traffic across servers', 'Stores data', 'Compiles code', 'Manages DNS'], correctAnswer: 0, explanation: 'Load balancers distribute incoming requests.' },
    { type: 'coding', question: 'What is sharding?', options: ['Horizontal database partitioning', 'A type of index', 'A caching layer', 'A message queue'], correctAnswer: 0, explanation: 'Sharding splits data across multiple machines.' },
    { type: 'debugging', question: 'A system is slow under high load. What do you check first?', options: ['Bottlenecks (DB, CPU, network)', 'UI design', 'Logo size', 'Team size'], correctAnswer: 0, explanation: 'Identify the bottleneck before scaling.' },
    { type: 'case_study', question: 'You need to serve content globally with low latency. What do you use?', options: ['CDN', 'More database servers', 'A bigger server', 'Compression'], correctAnswer: 0, explanation: 'CDNs cache content at edge locations.' },
    { type: 'scenario', question: 'Your database is overwhelmed by reads. What do you do?', options: ['Add read replicas', 'Add more columns', 'Change the schema', 'Use a different language'], correctAnswer: 0, explanation: 'Read replicas distribute read load.' },
    { type: 'mcq', question: 'What is idempotency?', options: ['Same result no matter how many times called', 'Fast execution', 'Low memory usage', 'Thread safety'], correctAnswer: 0, explanation: 'Idempotent operations produce the same result on repeated calls.' },
    { type: 'mcq', question: 'What is a message queue used for?', options: ['Decoupling async processing', 'Storing user data', 'Rendering UI', 'Compiling code'], correctAnswer: 0, explanation: 'Message queues decouple producers from consumers.' },
  ],
};

const DEFAULT_QUESTIONS: Question[] = [
  { type: 'mcq', question: 'What is the fundamental concept of this skill?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 0, explanation: 'This tests basic understanding.' },
  { type: 'mcq', question: 'How would you apply this skill in a real project?', options: ['Approach A', 'Approach B', 'Approach C', 'Approach D'], correctAnswer: 0, explanation: 'This tests practical application.' },
  { type: 'coding', question: 'Which code pattern is correct for this skill?', options: ['Pattern A', 'Pattern B', 'Pattern C', 'Pattern D'], correctAnswer: 0, explanation: 'This tests coding knowledge.' },
  { type: 'debugging', question: 'What is the common pitfall in this skill?', options: ['Pitfall A', 'Pitfall B', 'Pitfall C', 'Pitfall D'], correctAnswer: 0, explanation: 'This tests debugging ability.' },
  { type: 'case_study', question: 'How would you approach a real-world scenario with this skill?', options: ['Strategy A', 'Strategy B', 'Strategy C', 'Strategy D'], correctAnswer: 0, explanation: 'This tests case study analysis.' },
  { type: 'scenario', question: 'In a team setting, how would you communicate about this skill?', options: ['Approach A', 'Approach B', 'Approach C', 'Approach D'], correctAnswer: 0, explanation: 'This tests communication ability.' },
];

export default function MarketplacePage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState<Phase>('browse');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number;
    confidence: number;
    verified: boolean;
    industryReadiness: string;
    strengths: string[];
    weaknesses: string[];
    recommendedRoles: string[];
    salaryRange: { min: number; max: number; currency: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Array<HiringCampaign & { company: Company }>>([]);
  const [joiningCampaign, setJoiningCampaign] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('skills').select('*').order('name'),
      supabase.from('skill_assessments').select('*').eq('user_id', user.id),
      supabase.from('hiring_campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    ]).then(async ([skillsData, assessmentsData, campaignsData]) => {
      setSkills((skillsData.data as Skill[]) ?? []);
      setAssessments((assessmentsData.data as SkillAssessment[]) ?? []);
      const activeCampaigns = (campaignsData.data as HiringCampaign[]) ?? [];
      if (activeCampaigns.length > 0) {
        const companyIds = Array.from(new Set(activeCampaigns.map((c) => c.company_id)));
        const { data: companiesData } = await supabase.from('companies').select('*').in('id', companyIds);
        const companies = (companiesData as Company[]) ?? [];
        const enriched = activeCampaigns.map((c) => ({
          ...c,
          company: companies.find((co) => co.id === c.company_id) as Company,
        })).filter((c) => c.company);
        setCampaigns(enriched);
      }
      setLoading(false);
    });
  }, [user]);

  async function joinCampaign(campaign: HiringCampaign) {
    if (!user) return;
    setJoiningCampaign(campaign.id);

    // Check if already a candidate
    const { data: existing } = await supabase
      .from('campaign_candidates')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('candidate_email', user.email ?? '')
      .maybeSingle();

    let candidateId: string;

    if (existing) {
      candidateId = existing.id;
    } else {
      const { data: newCandidate, error: joinError } = await supabase.from('campaign_candidates').insert({
        campaign_id: campaign.id,
        candidate_email: user.email ?? '',
        candidate_id: user.id,
        status: 'invited',
      }).select().single();

      if (joinError) {
        toast.error('Failed to join: ' + joinError.message);
        setJoiningCampaign(null);
        return;
      }
      candidateId = newCandidate.id;
    }

    setJoiningCampaign(null);
    toast.success('Test joined! Redirecting to assessment...');
    window.location.href = `/my-tests/${candidateId}`;
  }

  const filteredSkills = skills.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()),
  );

  function startAssessment(skill: Skill) {
    setSelectedSkill(skill);
    setCurrentQ(0);
    setAnswers([]);
    setPhase('assessing');
  }

  function answerQuestion(optionIndex: number) {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    const questions = ASSESSMENT_QUESTIONS[selectedSkill!.slug] ?? DEFAULT_QUESTIONS;

    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      completeAssessment(newAnswers, questions);
    }
  }

  async function completeAssessment(allAnswers: number[], questions: Question[]) {
    const correct = allAnswers.filter((a, i) => a === questions[i].correctAnswer).length;
    const score = Math.round((correct / questions.length) * 100);
    const confidence = Math.min(95, Math.round(score * 0.95));
    const verified = confidence >= 95;

    const industryReadiness = score >= 85 ? 'expert' : score >= 70 ? 'advanced' : score >= 50 ? 'intermediate' : 'beginner';

    const strengths = questions
      .filter((q, i) => allAnswers[i] === q.correctAnswer)
      .map((q) => `${q.type} proficiency`);
    const weaknesses = questions
      .filter((q, i) => allAnswers[i] !== q.correctAnswer)
      .map((q) => `${q.type} — needs improvement`);

    const recommendedRoles = getRecommendedRoles(selectedSkill!.name, score);
    const salaryRange = getSalaryRange(selectedSkill!.name, industryReadiness);

    setAssessmentResult({
      score,
      confidence,
      verified,
      industryReadiness,
      strengths: Array.from(new Set(strengths)),
      weaknesses: Array.from(new Set(weaknesses)),
      recommendedRoles,
      salaryRange,
    });

    if (user && selectedSkill) {
      const { data: existing } = await supabase
        .from('skill_assessments')
        .select('id')
        .eq('user_id', user.id)
        .eq('skill_id', selectedSkill.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('skill_assessments')
          .update({
            score,
            confidence,
            verified,
            industry_readiness: industryReadiness,
            strengths: Array.from(new Set(strengths)),
            weaknesses: Array.from(new Set(weaknesses)),
            recommended_roles: recommendedRoles,
            salary_range: salaryRange,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('skill_assessments').insert({
          user_id: user.id,
          skill_id: selectedSkill.id,
          score,
          confidence,
          verified,
          industry_readiness: industryReadiness,
          strengths: [...new Set(strengths)],
          weaknesses: [...new Set(weaknesses)],
          recommended_roles: recommendedRoles,
          salary_range: salaryRange,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'skill_verified',
        title: verified ? `Skill Verified: ${selectedSkill.name}!` : `Assessment Complete: ${selectedSkill.name}`,
        message: verified
          ? `Your ${selectedSkill.name} skill has been verified with a score of ${score}%.`
          : `You scored ${score}% on ${selectedSkill.name}. Keep practicing!`,
      });
    }

    setPhase('results');
  }

  function getRecommendedRoles(skill: string, score: number): string[] {
    const roles: Record<string, string[]> = {
      Python: ['Backend Developer', 'Data Engineer', 'Automation Engineer', 'ML Engineer'],
      JavaScript: ['Frontend Developer', 'Full Stack Developer', 'Node.js Developer'],
      SQL: ['Data Analyst', 'Database Administrator', 'Backend Developer', 'Data Engineer'],
      'Machine Learning': ['ML Engineer', 'Data Scientist', 'AI Researcher', 'ML Ops Engineer'],
      React: ['Frontend Developer', 'React Developer', 'UI Engineer'],
      'Data Structures': ['Software Engineer', 'Backend Developer', 'Systems Engineer'],
      Algorithms: ['Software Engineer', 'Competitive Programmer', 'Research Engineer'],
      Statistics: ['Data Scientist', 'Statistician', 'Data Analyst', 'Research Analyst'],
      'System Design': ['Staff Engineer', 'Solutions Architect', 'DevOps Engineer', 'Tech Lead'],
    };
    const base = roles[skill] ?? ['Software Engineer', 'Developer'];
    if (score >= 85) return [...base, 'Senior ' + base[0]];
    return base.slice(0, 3);
  }

  function getSalaryRange(skill: string, readiness: string): { min: number; max: number; currency: string } {
    const base: Record<string, [number, number]> = {
      Python: [70000, 180000],
      JavaScript: [65000, 160000],
      SQL: [60000, 140000],
      'Machine Learning': [90000, 220000],
      React: [70000, 170000],
      'Data Structures': [70000, 180000],
      Algorithms: [80000, 200000],
      Statistics: [75000, 180000],
      'System Design': [120000, 300000],
    };
    const [min, max] = base[skill] ?? [60000, 150000];
    const multiplier = readiness === 'expert' ? 1.0 : readiness === 'advanced' ? 0.8 : readiness === 'intermediate' ? 0.6 : 0.4;
    return {
      min: Math.round(min * multiplier),
      max: Math.round(max * multiplier),
      currency: 'USD',
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === 'assessing' && selectedSkill) {
    const questions = ASSESSMENT_QUESTIONS[selectedSkill.slug] ?? DEFAULT_QUESTIONS;
    const question = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{selectedSkill.name} Assessment</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Question {currentQ + 1} of {questions.length} · {question.type.toUpperCase()}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {Math.round(progress)}% complete
          </Badge>
        </div>

        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {question.type === 'mcq' && <FileText className="h-4 w-4 text-primary" />}
              {question.type === 'coding' && <Code className="h-4 w-4 text-accent" />}
              {question.type === 'debugging' && <Bug className="h-4 w-4 text-destructive" />}
              {question.type === 'case_study' && <Briefcase className="h-4 w-4 text-warning" />}
              {question.type === 'scenario' && <MessageSquare className="h-4 w-4 text-success" />}
              <Badge variant="outline" className="capitalize">{question.type.replace('_', ' ')}</Badge>
            </div>
            <CardTitle className="text-xl">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options?.map((option, i) => (
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

  if (phase === 'results' && selectedSkill && assessmentResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="relative overflow-hidden">
          <div className={`absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl ${assessmentResult.verified ? 'bg-success/15' : 'bg-primary/10'}`} />
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {assessmentResult.verified ? (
                <Badge variant="default" className="bg-success text-success-foreground">
                  <Shield className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Needs Improvement
                </Badge>
              )}
            </div>
            <CardTitle className="text-3xl font-display">
              {selectedSkill.name}: {assessmentResult.score}%
            </CardTitle>
            <CardDescription className="text-base">
              Confidence: {assessmentResult.confidence}% · Industry Readiness: {assessmentResult.industryReadiness}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Score</div>
                <div className="font-display text-2xl font-bold">{assessmentResult.score}%</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                <div className="font-display text-2xl font-bold">{assessmentResult.confidence}%</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="font-display text-lg font-bold capitalize">{assessmentResult.verified ? 'Verified' : 'Partial'}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground mb-1">Level</div>
                <div className="font-display text-lg font-bold capitalize">{assessmentResult.industryReadiness}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assessmentResult.strengths.length > 0 ? assessmentResult.strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  {s}
                </div>
              )) : <p className="text-sm text-muted-foreground">No strengths identified.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Bug className="h-5 w-5" />
                Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assessmentResult.weaknesses.length > 0 ? assessmentResult.weaknesses.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  {w}
                </div>
              )) : <p className="text-sm text-success">No weaknesses — excellent!</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Recommended Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {assessmentResult.recommendedRoles.map((role, i) => (
                  <Badge key={i} variant="secondary">{role}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Salary Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold">
                ${assessmentResult.salaryRange.min.toLocaleString()} – ${assessmentResult.salaryRange.max.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{assessmentResult.salaryRange.currency} per year</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setPhase('browse')} className="flex-1">
            Back to Marketplace
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-accent" />
          AI Skill Marketplace
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Degrees don't matter. Skills do. Verify your skills through adaptive assessment and earn public verified badges that recruiters can search.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Your Verified Skills */}
      {assessments.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">Your Skill Assessments</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {assessments.map((sa) => {
              const skill = skills.find((s) => s.id === sa.skill_id);
              if (!skill) return null;
              return (
                <Card key={sa.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <Sparkles className="h-5 w-5 text-accent" />
                      </div>
                      {sa.verified && (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <Shield className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium">{skill.name}</div>
                    <div className="font-display text-2xl font-bold mt-1">{Math.round(Number(sa.score))}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">{sa.industry_readiness}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => startAssessment(skill)}
                    >
                      Re-assess
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Skills */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-3">Available Skills to Verify</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => {
            const existing = assessments.find((a) => a.skill_id === skill.id);
            return (
              <Card key={skill.id} className="group hover:border-accent/50 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <Badge variant="outline">{skill.category}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{skill.name}</CardTitle>
                  <CardDescription className="text-sm">{skill.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {existing ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-display text-xl font-bold">{Math.round(Number(existing.score))}%</span>
                        {existing.verified && (
                          <Badge variant="default" className="ml-2 bg-success text-success-foreground">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => startAssessment(skill)}>
                        Re-assess
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full group/btn" onClick={() => startAssessment(skill)}>
                      Start Assessment
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recruiter Tests */}
      {campaigns.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-success" />
            Open Job Assessments from Recruiters
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Companies are hiring by ability. Take a test and get recruited based on your verified skills.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => {
              const campaignSkills = skills.filter((s) => campaign.skill_ids?.includes(s.id));
              return (
                <Card key={campaign.id} className="group hover:border-success/50 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                        <Building2 className="h-5 w-5 text-success" />
                      </div>
                      <Badge variant="secondary" className="capitalize">{campaign.difficulty}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{campaign.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {campaign.company.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {campaign.job_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{campaign.job_description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{campaign.duration_minutes}m</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{campaign.max_candidates} max</span>
                      {campaign.ai_proctoring && <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-success" />Proctored</span>}
                    </div>
                    {campaignSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {campaignSkills.slice(0, 4).map((s) => (
                          <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
                        ))}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => joinCampaign(campaign)}
                      disabled={joiningCampaign === campaign.id}
                    >
                      {joiningCampaign === campaign.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Take Test
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
