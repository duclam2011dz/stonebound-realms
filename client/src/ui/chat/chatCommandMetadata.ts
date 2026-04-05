export type ChatCommandSuggestionDefinition = {
  value: string;
  description?: string;
  isPlaceholder?: boolean;
};

export type ChatCommandArgumentDefinition = {
  placeholder?: string;
  description?: string;
  getSuggestions?: (resolvedArgs: string[]) => ChatCommandSuggestionDefinition[];
};

export type ChatCommandDefinition = {
  name: string;
  description: string;
  aliases?: string[];
  arguments?: ChatCommandArgumentDefinition[];
};
