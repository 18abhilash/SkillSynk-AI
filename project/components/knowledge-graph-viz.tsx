'use client';

import { useMemo } from 'react';
import type { DiagnosisSession, SkillAssessment, Skill } from '@/lib/supabase';
import { CheckCircle2, XCircle, Circle, Network } from 'lucide-react';

type Props = {
  sessions: DiagnosisSession[];
  assessments: SkillAssessment[];
  skills: Skill[];
};

type GraphNode = {
  id: string;
  label: string;
  status: 'mastered' | 'weak' | 'untested' | 'in-progress';
  confidence: number;
  x: number;
  y: number;
};

export function KnowledgeGraphViz({ sessions, assessments, skills }: Props) {
  const nodes = useMemo<GraphNode[]>(() => {
    const nodeList: GraphNode[] = [];

    assessments.forEach((sa) => {
      const skill = skills.find((s) => s.id === sa.skill_id);
      if (!skill) return;
      const score = Number(sa.score);
      nodeList.push({
        id: `skill-${skill.id}`,
        label: skill.name,
        status: score >= 75 ? 'mastered' : score >= 40 ? 'in-progress' : 'weak',
        confidence: score,
        x: 0,
        y: 0,
      });
    });

    sessions.forEach((session) => {
      const weakCount = session.weak_concepts?.length ?? 0;
      const strongCount = session.strong_concepts?.length ?? 0;
      const status: GraphNode['status'] = session.status === 'completed'
        ? (weakCount === 0 ? 'mastered' : weakCount > strongCount ? 'weak' : 'in-progress')
        : 'in-progress';
      nodeList.push({
        id: `session-${session.id}`,
        label: session.topic,
        status,
        confidence: session.confidence,
        x: 0,
        y: 0,
      });
    });

    if (nodeList.length === 0) return [];

    const cols = Math.ceil(Math.sqrt(nodeList.length));
    const spacing = 180;
    nodeList.forEach((node, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      node.x = col * spacing + 40;
      node.y = row * spacing + 40;
    });

    return nodeList;
  }, [sessions, assessments, skills]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Network className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground mb-1">Your knowledge graph is empty</p>
        <p className="text-sm text-muted-foreground/70">
          Start a diagnosis or verify a skill to see your concept mastery here.
        </p>
      </div>
    );
  }

  const statusColors = {
    mastered: { fill: 'hsl(var(--success))', text: 'hsl(var(--success-foreground))', icon: CheckCircle2 },
    weak: { fill: 'hsl(var(--destructive))', text: 'hsl(var(--destructive-foreground))', icon: XCircle },
    'in-progress': { fill: 'hsl(var(--warning))', text: 'hsl(var(--warning-foreground))', icon: Circle },
    untested: { fill: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))', icon: Circle },
  };

  const maxX = Math.max(...nodes.map((n) => n.x)) + 120;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 80;

  return (
    <div className="space-y-4">
      <div className="relative overflow-auto rounded-lg border bg-muted/20 p-4">
        <svg width={maxX} height={maxY} className="mx-auto">
          {nodes.map((node, i) => {
            if (i === 0) return null;
            const prev = nodes[i - 1];
            return (
              <line
                key={`edge-${i}`}
                x1={prev.x + 40}
                y1={prev.y + 20}
                x2={node.x + 40}
                y2={node.y + 20}
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}
          {nodes.map((node) => {
            const color = statusColors[node.status];
            const Icon = color.icon;
            return (
              <g key={node.id} className="cursor-pointer transition-transform hover:scale-105">
                <circle
                  cx={node.x + 40}
                  cy={node.y + 20}
                  r="32"
                  fill={color.fill}
                  fillOpacity="0.15"
                  stroke={color.fill}
                  strokeWidth="2"
                />
                <circle
                  cx={node.x + 40}
                  cy={node.y + 20}
                  r="24"
                  fill={color.fill}
                  fillOpacity="0.2"
                />
                <text
                  x={node.x + 40}
                  y={node.y + 20}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-[10px] font-medium"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label.length > 12 ? node.label.slice(0, 10) + '…' : node.label}
                </text>
                <text
                  x={node.x + 40}
                  y={node.y + 50}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {Math.round(node.confidence)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(statusColors).map(([status, color]) => {
          const Icon = color.icon;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color.fill, opacity: 0.4 }} />
              <span className="text-muted-foreground capitalize">{status.replace('-', ' ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
