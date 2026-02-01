'use client';

import React from 'react';
import { z } from 'zod';

interface DynamicFormProps {
    schema: z.ZodObject<any, any>;
    values: Record<string, any>;
    onChange: (values: Record<string, any>) => void;
}

export function DynamicForm({ schema, values, onChange }: DynamicFormProps) {

    const handleChange = (key: string, newValue: any) => {
        const newValues = { ...values, [key]: newValue };
        onChange(newValues);
    };

    const shape = schema.shape;

    return (
        <div className="space-y-4">
            {Object.keys(shape).map((key) => {
                const field = shape[key];
                let description = '';
                let isOptional = false;
                let defaultValue: any = undefined;

                // Inspect Zod metadata
                let curr = field;
                while (curr instanceof z.ZodOptional || curr instanceof z.ZodNullable || curr instanceof z.ZodDefault) {
                    if (curr instanceof z.ZodOptional) isOptional = true;
                    if (curr instanceof z.ZodDefault) {
                        defaultValue = (curr._def as { defaultValue: () => unknown }).defaultValue();
                    }
                    curr = curr._def.innerType;
                }
                description = curr.description || '';

                const isEnum = curr instanceof z.ZodEnum;

                // Use provided value or default
                const currentValue = values[key] ?? defaultValue ?? '';

                return (
                    <div key={key} className="space-y-1">
                        <label className="block text-xs font-medium text-gray-400">
                            {key} {isOptional && <span className="text-gray-600">(optional)</span>}
                        </label>

                        {isEnum ? (
                            <select
                                value={currentValue}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                            >
                                <option value="" disabled>Select {key}</option>
                                {curr._def.values.map((v: string) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        ) : key === 'prompt' || key === 'additionalContext' ? (
                            <textarea
                                value={currentValue}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono min-h-[100px]"
                                placeholder={description}
                            />
                        ) : (
                            <input
                                type="text"
                                value={currentValue}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder={description}
                            />
                        )}

                        {description && <p className="text-[10px] text-gray-500">{description}</p>}
                    </div>
                );
            })}
        </div>
    );
}
