'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Send, Loader2, ArrowRight, Target, TrendingUp, BookOpen, CheckCircle2, AlertCircle, Sparkles, RotateCcw, Lightbulb, Network, HelpCircle, TrendingDown, Minus, Trophy } from 'lucide-react';
import { createDiagnosisState, selectNextQuestion, evaluateAnswer, computeRootCause, generateLearningPlan, getMCQQuestions, isDonKnow, adjustDifficulty, type DiagnosisState, type MCQQuestion } from '@/lib/diagnosis-engine';
import { supabase, type DiagnosisSession } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

type Phase = 'topic' | 'mcq' | 'diagnosing' | 'results';

type PreviousAttempt = {
  id: string;
  knowledge_score: number;
  skill_score: number;
  confidence: number;
  question_count: number;
  created_at: string;
  root_cause: string | null;
};

export default function DiagnosisPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('topic');
  const [topic, setTopic] = useState('');
  const [state, setState] = useState<DiagnosisState | null>(null);
  const [answer, setAnswer] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<{ concept: string; question: string; hint: string; level: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<DiagnosisSession | null>(null);
  const [learningPlan, setLearningPlan] = useState<ReturnType<typeof generateLearningPlan> | null>(null);
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number | 'dontknow'>>({});
  const [previousAttempts, setPreviousAttempts] = useState<PreviousAttempt[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.messages]);

  async function startDiagnosis() {
    if (!topic.trim() || !user) return;
    const trimmedTopic = topic.trim();

    const { data: previousSessions } = await supabase
      .from('diagnosis_sessions')
      .select('id, knowledge_score, skill_score, confidence, question_count, created_at, root_cause')
      .eq('user_id', user.id)
      .eq('topic', trimmedTopic)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    const prevAttempts = (previousAttempts as PreviousAttempt[]) ?? [];
    setPreviousAttempts(prevAttempts);

    const attemptNumber = prevAttempts.length + 1;
    const previousSessionId = prevAttempts.length > 0 ? prevAttempts[prevAttempts.length - 1].id : null;

    const { data, error } = await supabase
      .from('diagnosis_sessions')
      .insert({
        user_id: user.id,
        topic: trimmedTopic,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to start session: ' + error.message);
      return;
    }

    setSessionId(data.id);
    const newState = createDiagnosisState(trimmedTopic, attemptNumber, previousSessionId);
    setState(newState);

    const questions = getMCQQuestions(trimmedTopic);
    setMcqQuestions(questions);
    setMcqAnswers({});

    const introMessage = `Let's diagnose your understanding of ${trimmedTopic}. First, I'll ask you ${questions.length} multiple-choice questions to get a baseline, then we'll dive deeper with adaptive questions.\n\n**Question 1 of ${questions.length} (MCQ Phase)**\n\n${questions[0].question}`;
    newState.messages.push({ role: 'ai', content: introMessage, concept: questions[0].concept });
    setState({ ...newState });

    await supabase.from('diagnosis_messages').insert({
      session_id: data.id,
      role: 'ai',
      content: introMessage,
    });

    setPhase('mcq');
  }

  async function submitMcqAnswer(questionId: string, selectedIndex: number | 'dontknow') {
    if (!state || !sessionId || !user) return;

    const question = mcqQuestions.find((q) => q.id === questionId);
    if (!question) return;

    const newAnswers = { ...mcqAnswers, [questionId]: selectedIndex };
    setMcqAnswers(newAnswers);

    const isCorrect = selectedIndex !== 'dontknow' && selectedIndex === question.correctIndex;
    const score = selectedIndex === 'dontknow' ? 0 : isCorrect ? 100 : 0;
    const userResponse = selectedIndex === 'dontknow' ? "I don't know" : question.options[selectedIndex as number];

    const newState = { ...state };
    newState.messages.push({ role: 'user', content: userResponse, concept: question.concept });
    newState.testedConcepts.add(question.concept);
    newState.conceptScores.set(question.concept, score);
    newState.mcqCount += 1;

    if (score >= 50) {
      newState.strongConcepts.push(question.concept);
    } else {
      newState.weakConcepts.push(question.concept);
    }

    newState.mcqScore = ((newState.mcqScore * (newState.mcqCount - 1)) + score) / newState.mcqCount;

    await supabase.from('diagnosis_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: userResponse,
    });

    const mcqIndex = newState.mcqIndex;
    const nextIndex = mcqIndex + 1;

    if (nextIndex < mcqQuestions.length) {
      newState.mcqIndex = nextIndex;
      const nextQ = mcqQuestions[nextIndex];
      const feedback = selectedIndex === 'dontknow'
        ? `Noted — that's a gap I'll explore further.`
        : isCorrect
          ? `Correct! Let's continue.`
          : `Not quite — I'll dig into this concept more in the next phase.`;
      const aiMessage = `${feedback}\n\n**Question ${nextIndex + 1} of ${mcqQuestions.length} (MCQ Phase)**\n\n${nextQ.question}`;
      newState.messages.push({ role: 'ai', content: aiMessage, concept: nextQ.concept });
      newState.questionCount = newState.mcqCount;
      setState({ ...newState });

      await supabase.from('diagnosis_messages').insert({
        session_id: sessionId,
        role: 'ai',
        content: aiMessage,
      });

      await supabase
        .from('diagnosis_sessions')
        .update({ mcq_score: newState.mcqScore, mcq_count: newState.mcqCount, question_count: newState.mcqCount })
        .eq('id', sessionId);
    } else {
      newState.mcqIndex = nextIndex;
      newState.questionCount = newState.mcqCount;
      newState.phase = 'conversational';

      const mcqPercent = Math.round(newState.mcqScore);
      const transitionMessage = `MCQ phase complete! You scored ${mcqPercent}% on the baseline questions.\n\nNow I'll ask adaptive questions that get harder as you demonstrate understanding. Answer in your own words — and if you don't know something, just say so or click "Don't Know".\n\nLet's begin the adaptive diagnosis.`;
      newState.messages.push({ role: 'ai', content: transitionMessage });
      setState({ ...newState });

      await supabase.from('diagnosis_messages').insert({
        session_id: sessionId,
        role: 'ai',
        content: transitionMessage,
      });

      await supabase
        .from('diagnosis_sessions')
        .update({ mcq_score: newState.mcqScore, mcq_count: newState.mcqCount, question_count: newState.mcqCount })
        .eq('id', sessionId);

      const nextQ = selectNextQuestion(newState, newState.topic);
      if (nextQ) {
        const qMessage = `${nextQ.question}`;
        newState.messages.push({ role: 'ai', content: qMessage, concept: nextQ.concept });
        newState.questionCount += 1;
        setState({ ...newState });
        setCurrentQuestion({ concept: nextQ.concept, question: nextQ.question, hint: nextQ.hint, level: nextQ.level });

        await supabase.from('diagnosis_messages').insert({
          session_id: sessionId,
          role: 'ai',
          content: qMessage,
        });
      }

      setPhase('diagnosing');
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || !state || !currentQuestion || !sessionId || !user) return;

    const userAnswer = answer.trim();
    const newState = { ...state };
    newState.messages.push({ role: 'user', content: userAnswer, concept: currentQuestion.concept });
    setState(newState);
    setAnswer('');
    setAiThinking(true);

    await supabase.from('diagnosis_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: userAnswer,
    });

    setTimeout(async () => {
      const evaluation = evaluateAnswer(userAnswer, currentQuestion.concept, currentQuestion.hint);

      newState.testedConcepts.add(currentQuestion.concept);
      newState.conceptScores.set(currentQuestion.concept, evaluation.score);
      newState.confidence = Math.min(newState.confidence + evaluation.confidenceDelta, 100);

      if (evaluation.score >= 50) {
        if (!newState.strongConcepts.includes(currentQuestion.concept)) {
          newState.strongConcepts.push(currentQuestion.concept);
        }
      } else {
        if (!newState.weakConcepts.includes(currentQuestion.concept)) {
          newState.weakConcepts.push(currentQuestion.concept);
        }
      }

      newState.difficultyLevel = adjustDifficulty(newState);

      const nextQ = selectNextQuestion(newState, state.topic);
      const shouldComplete = newState.confidence >= 90 || newState.questionCount >= 15 || !nextQ;

      if (shouldComplete) {
        const rootCause = computeRootCause(newState, state.topic);
        newState.rootCause = rootCause;
        newState.status = 'completed';

        const knowledgeScore = Math.round(
          (Array.from(newState.conceptScores.values()).reduce((a, b) => a + b, 0) / newState.conceptScores.size) || 0,
        );
        const skillScore = Math.round(knowledgeScore * 0.8 + newState.confidence * 0.2);
        newState.knowledgeScore = knowledgeScore;
        newState.skillScore = skillScore;

        const completionMessage = `I've completed my diagnosis. Here's what I found:\n\n**Root Cause:** ${rootCause ?? 'Strong foundational understanding'}\n**Confidence:** ${Math.round(newState.confidence)}%\n**Knowledge Score:** ${knowledgeScore}%\n**Skill Score:** ${skillScore}%\n\n**Strong concepts:** ${newState.strongConcepts.join(', ') || 'None yet'}\n**Weak concepts:** ${newState.weakConcepts.join(', ') || 'None — excellent!'}\n\nI've generated a personalized learning plan for you. Let's close those gaps.`;

        newState.messages.push({ role: 'ai', content: completionMessage });
        setState({ ...newState });

        const plan = generateLearningPlan(state.topic, rootCause, newState.weakConcepts);
        setLearningPlan(plan);

        const { data: updatedSession } = await supabase
          .from('diagnosis_sessions')
          .update({
            root_cause: rootCause,
            confidence: newState.confidence,
            status: 'completed',
            weak_concepts: newState.weakConcepts,
            strong_concepts: newState.strongConcepts,
            knowledge_score: knowledgeScore,
            skill_score: skillScore,
            question_count: newState.questionCount,
            mcq_score: newState.mcqScore,
            mcq_count: newState.mcqCount,
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (updatedSession) setSavedSession(updatedSession as DiagnosisSession);

        await supabase.from('diagnosis_messages').insert({
          session_id: sessionId,
          role: 'ai',
          content: completionMessage,
        });

        await supabase.from('learning_plans').insert({
          user_id: user.id,
          title: `Learning Plan: ${state.topic}`,
          source_type: 'diagnosis',
          source_id: sessionId,
          root_cause: rootCause,
          estimated_days: plan.estimatedDays,
          daily_plan: plan.dailyPlan,
          weekly_plan: plan.weeklyPlan,
          projects: plan.projects,
          videos: plan.videos,
          books: plan.books,
          practice_problems: plan.practiceProblems,
          progress: 0,
          status: 'active',
        });

        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'diagnosis_complete',
          title: 'Diagnosis Complete!',
          message: `Root cause found: ${rootCause ?? 'Strong understanding'}. A learning plan has been generated.`,
        });

        setPhase('results');
        setAiThinking(false);
      } else {
        const aiResponse = `${evaluation.feedback}\n\n${nextQ.question}`;
        newState.messages.push({ role: 'ai', content: aiResponse, concept: nextQ.concept });
        newState.questionCount += 1;
        setState({ ...newState });
        setCurrentQuestion({ concept: nextQ.concept, question: nextQ.question, hint: nextQ.hint, level: nextQ.level });

        await supabase.from('diagnosis_messages').insert({
          session_id: sessionId,
          role: 'ai',
          content: aiResponse,
        });

        await supabase
          .from('diagnosis_sessions')
          .update({
            confidence: newState.confidence,
            question_count: newState.questionCount,
            weak_concepts: newState.weakConcepts,
            strong_concepts: newState.strongConcepts,
          })
          .eq('id', sessionId);

        setAiThinking(false);
      }
    }, 800);
  }

  function handleDontKnow() {
    if (phase === 'mcq' && mcqQuestions.length > 0 && state) {
      const currentQ = mcqQuestions[state.mcqIndex];
      if (currentQ) {
        submitMcqAnswer(currentQ.id, 'dontknow');
      }
    } else if (phase === 'diagnosing') {
      setAnswer("I don't know");
      setTimeout(() => submitAnswer(), 100);
    }
  }

  function resetDiagnosis() {
    setPhase('topic');
    setTopic('');
    setState(null);
    setCurrentQuestion(null);
    setSessionId(null);
    setSavedSession(null);
    setLearningPlan(null);
    setAnswer('');
    setMcqQuestions([]);
    setMcqAnswers({});
    setPreviousAttempts([]);
  }

  const currentMcq = phase === 'mcq' && state ? mcqQuestions[state.mcqIndex] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          AI Knowledge Gap Diagnosis
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          The AI doesn't answer questions — it asks them. Like an expert teacher, it traces every gap back to its root cause through adaptive Socratic questioning.
        </p>
      </div>

      {/* Phase: Topic Selection */}
      {phase === 'topic' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>What would you like to diagnose?</CardTitle>
            <CardDescription>
              Tell me a topic you struggle with. I'll start with 5 MCQs, then ask adaptive questions to find exactly where the gap is.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="e.g., Machine Learning, Data Structures, Python, SQL, React..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startDiagnosis()}
                className="h-12 text-base"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['Machine Learning', 'Data Structures', 'Python', 'SQL', 'React', 'Statistics', 'System Design', 'Algorithms'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopic(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
            <Button onClick={startDiagnosis} disabled={!topic.trim()} className="w-full h-11" size="lg">
              Start Diagnosis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase: MCQ */}
      {phase === 'mcq' && state && currentMcq && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Brain className="h-4 w-4" />
                    </div>
                    MCQ Phase: {state.topic}
                  </CardTitle>
                  <Badge variant="secondary">
                    MCQ {state.mcqIndex + 1} / {mcqQuestions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {state.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}
                    >
                      {msg.concept && msg.role === 'ai' && (
                        <Badge variant="outline" className="mb-2 text-xs">
                          <Target className="mr-1 h-3 w-3" />
                          {msg.concept}
                        </Badge>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="border-t p-4">
                <div className="space-y-3">
                  <div className="font-medium text-sm">{currentMcq.question}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {currentMcq.options.map((option, i) => {
                      const isSelected = mcqAnswers[currentMcq.id] === i;
                      return (
                        <button
                          key={i}
                          onClick={() => submitMcqAnswer(currentMcq.id, i)}
                          className={`text-left rounded-lg border p-3 text-sm transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleDontKnow}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Don&apos;t Know
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  MCQ Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Answered</span>
                    <span className="font-bold">{state.mcqCount} / {mcqQuestions.length}</span>
                  </div>
                  <Progress value={(state.mcqCount / mcqQuestions.length) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">MCQ Score</div>
                    <div className="font-display text-2xl font-bold">{Math.round(state.mcqScore)}%</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Concepts</div>
                    <div className="font-display text-2xl font-bold">{state.testedConcepts.size}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={resetDiagnosis}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Diagnosing */}
      {phase === 'diagnosing' && state && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2">
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Brain className="h-4 w-4" />
                    </div>
                    Diagnosing: {state.topic}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {state.difficultyLevel}
                    </Badge>
                    <Badge variant="secondary">
                      Q{state.questionCount}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {state.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}
                    >
                      {msg.concept && msg.role === 'ai' && (
                        <Badge variant="outline" className="mb-2 text-xs">
                          <Target className="mr-1 h-3 w-3" />
                          {msg.concept}
                        </Badge>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {aiThinking && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">AI is analyzing your answer...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your answer in your own words..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAnswer();
                      }
                    }}
                    disabled={aiThinking}
                    className="flex-1"
                  />
                  <Button onClick={handleDontKnow} disabled={aiThinking} variant="outline" size="default">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Don&apos;t Know
                  </Button>
                  <Button onClick={submitAnswer} disabled={!answer.trim() || aiThinking} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {currentQuestion && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Hint: {currentQuestion.hint}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {currentQuestion.level}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Live Stats Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Diagnosis Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-bold">{Math.round(state.confidence)}%</span>
                  </div>
                  <Progress value={state.confidence} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Target: 90% to complete
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Questions</div>
                    <div className="font-display text-2xl font-bold">{state.questionCount}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Tested</div>
                    <div className="font-display text-2xl font-bold">{state.testedConcepts.size}</div>
                  </div>
                </div>
                {state.mcqScore > 0 && (
                  <div className="rounded-lg border p-3 bg-accent/5">
                    <div className="text-xs text-muted-foreground">MCQ Baseline</div>
                    <div className="font-display text-2xl font-bold">{Math.round(state.mcqScore)}%</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Network className="h-4 w-4 text-accent" />
                  Concepts Tested
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from(state.testedConcepts).map((concept) => {
                  const score = state.conceptScores.get(concept) ?? 0;
                  return (
                    <div key={concept} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{concept}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-16">
                          <Progress value={score} className="h-1.5" />
                        </div>
                        <span className={`text-xs font-medium ${score >= 50 ? 'text-success' : 'text-destructive'}`}>
                          {Math.round(score)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {state.testedConcepts.size === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No concepts tested yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={resetDiagnosis}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Phase: Results */}
      {phase === 'results' && state && (
        <div className="space-y-6">
          {/* Previous Attempts Comparison */}
          {previousAttempts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  Progress Comparison
                </CardTitle>
                <CardDescription>
                  This is attempt #{state.attemptNumber} for {state.topic}. See how you&apos;ve improved over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {previousAttempts.map((prev, i) => {
                    const currentKnowledge = state.knowledgeScore;
                    const currentSkill = state.skillScore;
                    const currentConfidence = Math.round(state.confidence);
                    const knowledgeDiff = currentKnowledge - prev.knowledge_score;
                    const skillDiff = currentSkill - prev.skill_score;
                    const confidenceDiff = currentConfidence - prev.confidence;

                    return (
                      <div key={prev.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={i === previousAttempts.length - 1 ? 'default' : 'secondary'}>
                              Attempt #{i + 1}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(prev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {i === previousAttempts.length - 1 && (
                            <Badge variant="outline" className="text-xs">
                              Previous
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <ComparisonMetric label="Knowledge" previous={Math.round(prev.knowledge_score)} current={currentKnowledge} diff={Math.round(knowledgeDiff)} />
                          <ComparisonMetric label="Skill" previous={Math.round(prev.skill_score)} current={currentSkill} diff={Math.round(skillDiff)} />
                          <ComparisonMetric label="Confidence" previous={Math.round(prev.confidence)} current={currentConfidence} diff={Math.round(confidenceDiff)} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-lg border-2 border-primary p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Attempt #{state.attemptNumber}</Badge>
                        <span className="text-xs text-muted-foreground">Current</span>
                      </div>
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <CurrentMetric label="Knowledge" value={state.knowledgeScore} />
                      <CurrentMetric label="Skill" value={state.skillScore} />
                      <CurrentMetric label="Confidence" value={Math.round(state.confidence)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Header */}
          <Card className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
            <CardHeader>
              <div className="flex items-center gap-2 text-success mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <Badge variant="default" className="bg-success text-success-foreground">Diagnosis Complete</Badge>
              </div>
              <CardTitle className="text-2xl font-display">
                Root Cause: {state.rootCause ?? 'Strong Understanding'}
              </CardTitle>
              <CardDescription className="text-base">
                After {state.questionCount} questions ({state.mcqCount} MCQ + {state.questionCount - state.mcqCount} adaptive), I&apos;ve traced the gap to its source.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">Confidence</span>
                  </div>
                  <div className="font-display text-3xl font-bold">{Math.round(state.confidence)}%</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-accent mb-1">
                    <Brain className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">Knowledge Score</span>
                  </div>
                  <div className="font-display text-3xl font-bold">{state.knowledgeScore}%</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">Skill Score</span>
                  </div>
                  <div className="font-display text-3xl font-bold">{state.skillScore}%</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-warning mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">Questions</span>
                  </div>
                  <div className="font-display text-3xl font-bold">{state.questionCount}</div>
                </div>
              </div>
              {state.mcqScore > 0 && (
                <div className="mt-4 rounded-lg bg-accent/5 border p-3 text-sm">
                  <span className="text-muted-foreground">MCQ Baseline Score: </span>
                  <span className="font-bold">{Math.round(state.mcqScore)}%</span>
                  <span className="text-muted-foreground"> ({state.mcqCount} questions)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strong vs Weak Concepts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  Strong Concepts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.strongConcepts.length > 0 ? (
                  <div className="space-y-2">
                    {state.strongConcepts.map((c) => {
                      const score = state.conceptScores.get(c) ?? 0;
                      return (
                        <div key={c} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-sm">{c}</span>
                          <Badge variant="default" className="bg-success text-success-foreground">{Math.round(score)}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No strong concepts identified yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Weak Concepts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.weakConcepts.length > 0 ? (
                  <div className="space-y-2">
                    {state.weakConcepts.map((c) => {
                      const score = state.conceptScores.get(c) ?? 0;
                      return (
                        <div key={c} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-sm">{c}</span>
                          <Badge variant="destructive">{Math.round(score)}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-success">No weak concepts — excellent understanding!</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Learning Plan */}
          {learningPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Your Personalized Learning Plan
                </CardTitle>
                <CardDescription>
                  Estimated {learningPlan.estimatedDays} days to close the gaps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Daily Plan */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">Daily Plan (First 7 Days)</h4>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {learningPlan.dailyPlan.map((day) => (
                      <div key={day.day} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {day.day}
                          </div>
                          <span className="text-sm font-medium">{day.title}</span>
                        </div>
                        <ul className="space-y-1">
                          {day.tasks.map((task, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Plan */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">Weekly Milestones</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {learningPlan.weeklyPlan.map((week) => (
                      <div key={week.week} className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">Week {week.week}</Badge>
                        </div>
                        <div className="font-medium text-sm mb-2">{week.title}</div>
                        <ul className="space-y-1">
                          {week.goals.map((goal, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
                              {goal}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">Recommended Projects</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {learningPlan.projects.map((project, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{project.title}</span>
                          <Badge variant="outline" className="text-xs capitalize">{project.difficulty}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{project.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resources */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">Videos</h4>
                    <div className="space-y-2">
                      {learningPlan.videos.map((video, i) => (
                        <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <div className="text-sm font-medium">{video.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{video.duration}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">Practice Problems</h4>
                    <div className="space-y-2">
                      {learningPlan.practiceProblems.map((problem, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{problem.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">{problem.difficulty}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Books */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground tracking-wider">Recommended Reading</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {learningPlan.books.map((book, i) => (
                      <div key={i} className="rounded-lg border p-3 flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{book.title}</div>
                          <div className="text-xs text-muted-foreground">{book.author}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={resetDiagnosis} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Diagnose Another Topic
            </Button>
            <Button variant="outline" size="lg" asChild className="flex-1">
              <Link href="/dashboard">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="flex-1">
              <Link href="/marketplace">
                <Sparkles className="mr-2 h-4 w-4" />
                Verify a Skill
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonMetric({ label, previous, current, diff }: { label: string; previous: number; current: number; diff: number }) {
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isSame = diff === 0;
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-xl font-bold">{previous}%</div>
      <div className={`text-xs font-medium flex items-center justify-center gap-1 mt-1 ${
        isUp ? 'text-success' : isDown ? 'text-destructive' : 'text-muted-foreground'
      }`}>
        {isUp && <TrendingUp className="h-3 w-3" />}
        {isDown && <TrendingDown className="h-3 w-3" />}
        {isSame && <Minus className="h-3 w-3" />}
        {isUp ? `+${diff}%` : isDown ? `${diff}%` : '0%'}
      </div>
    </div>
  );
}

function CurrentMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-xl font-bold text-primary">{value}%</div>
      <div className="text-xs font-medium text-primary mt-1">Current</div>
    </div>
  );
}
