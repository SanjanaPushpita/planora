'use client';

import React, { useState, useEffect } from 'react';
import { MealPlannerContent } from '@/lib/types';
import { Utensils, Coffee, Sun, Sunset, Apple } from 'lucide-react';

interface MealPlannerBlockProps {
  content: MealPlannerContent;
  onChange: (updatedContent: MealPlannerContent) => void;
}

export function MealPlannerBlock({ content, onChange }: MealPlannerBlockProps) {
  const [data, setData] = useState<MealPlannerContent>(
    content || {
      breakfast: '',
      lunch: '',
      dinner: '',
      snacks: '',
    }
  );

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const updateMeal = (key: keyof MealPlannerContent, value: string) => {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  };

  const meals = [
    { key: 'breakfast', label: 'Breakfast', icon: Coffee, placeholder: 'e.g. Oatmeal & berries...' },
    { key: 'lunch', label: 'Lunch', icon: Sun, placeholder: 'e.g. Quinoa salad bowl...' },
    { key: 'dinner', label: 'Dinner', icon: Sunset, placeholder: 'e.g. Baked salmon & veggies...' },
    { key: 'snacks', label: 'Snacks & Tea', icon: Apple, placeholder: 'e.g. Green tea, almonds...' },
  ] as const;

  return (
    <div className="journal-paper p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
        <Utensils className="w-4 h-4 text-[var(--accent)]" />
        <h4 className="font-serif-aesthetic text-sm sm:text-base font-semibold text-[var(--text-primary)]">
          Meals & Nutrition
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {meals.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className="p-3 rounded-xl journal-paper-subtle space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{m.label}</span>
              </div>
              <textarea
                value={data[m.key] || ''}
                onChange={(e) => updateMeal(m.key, e.target.value)}
                placeholder={m.placeholder}
                rows={2}
                className="w-full text-xs bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded p-1 text-[var(--text-primary)] resize-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
