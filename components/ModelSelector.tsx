"use client";

import { Listbox, Transition } from "@headlessui/react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";

export type ModelOption = {
  id: string;
  name: string;
  provider: string;
  description: string;
  tag: string; // very short, 1-2 words
  isDefault?: boolean;
};

const modelOptions: ModelOption[] = [
  {
    id: "auto",
    name: "Auto",
    provider: "Smart",
    description: "Automatically selects the best model for your query",
    tag: "Smart pick",
    isDefault: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Latest GPT-4 optimized model, best for complex reasoning",
    tag: "Reasoning",
  },
  {
    id: "gpt-4o-mini", 
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and efficient for most tasks",
    tag: "Fast",
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Excellent for analysis and creative writing",
    tag: "Creative",
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku", 
    provider: "Anthropic",
    description: "Fast responses for quick questions",
    tag: "Quick",
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
  variant?: "inline" | "default" | "below"; // inline: in-input, below: under input pill
  disabled?: boolean;
}

export default function ModelSelector({ selectedModel, onModelChange, className, variant = "default", disabled = false }: ModelSelectorProps) {
  const selected = modelOptions.find(m => m.id === selectedModel) || modelOptions[0];

  return (
    <div className={classNames("relative", className, disabled ? "opacity-60 pointer-events-none" : undefined)}>
      <Listbox value={selectedModel} onChange={onModelChange} disabled={disabled}>
        {({ open }) => (
          <div>
            <Listbox.Button
              className={classNames(
                variant === "inline"
                  ? "flex items-center gap-1 rounded bg-transparent px-0 py-0 text-sm text-gray-600 h-6"
                  : variant === "below"
                  ? "flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  : "flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs h-7",
                "transition-all duration-200 focus:outline-none"
              )}
            >
              {variant === "inline" ? (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-600 text-sm leading-none">{selected.name}</span>
                  <ChevronDownIcon
                    className={classNames(
                      "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                      open ? "rotate-180" : ""
                    )}
                  />
                </div>
              ) : variant === "below" ? (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700">{selected.name}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{selected.tag}</span>
                  <ChevronDownIcon
                    className={classNames(
                      "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                      open ? "rotate-180" : ""
                    )}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="font-medium text-gray-700 text-xs">{selected.name}</div>
                  <ChevronDownIcon
                    className={classNames(
                      "h-3 w-3 text-gray-400 transition-transform duration-200",
                      open ? "rotate-180" : ""
                    )}
                  />
                </div>
              )}
            </Listbox.Button>

            <Transition
              as="div"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute top-full left-0 mt-2 min-w-[280px] max-h-60 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg border border-gray-200 focus:outline-none z-50">
                {modelOptions.map((model) => (
                  <Listbox.Option
                    key={model.id}
                    className={({ active, selected }) =>
                      classNames(
                        "relative cursor-pointer select-none px-4 py-3 transition-colors duration-150",
                        active ? "bg-gray-50" : "",
                        selected ? "bg-blue-50" : ""
                      )
                    }
                    value={model.id}
                  >
                    {({ selected: isSelected }) => (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900">{model.name}</div>
                            {model.isDefault && (
                              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">{model.provider}</div>
                          <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{model.description}</div>
                        </div>
                        
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
}

export { modelOptions };
