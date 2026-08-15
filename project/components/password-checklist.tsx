'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { PASSWORD_RULES, getPasswordStrength } from '@/lib/password-validation';

export function PasswordChecklist({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const maxScore = 6;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">Password strength</span>
          <span className={`text-xs font-semibold ${
            strength.label === 'Weak' ? 'text-destructive' :
            strength.label === 'Fair' ? 'text-warning' :
            strength.label === 'Good' ? 'text-primary' : 'text-success'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxScore }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < strength.score ? strength.color : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <div key={rule.id} className="flex items-center gap-2 text-xs">
              {passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={passed ? 'text-success' : 'text-muted-foreground'}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
