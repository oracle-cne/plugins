import { basePrompt } from "./prompts";

export interface Prompt {
  content: string;
  role: 'user' | 'assistant' | 'system' | 'context';
  id?: string;
}

export interface PromptResponse {
  content: string;
  error: boolean;
  isPartial: boolean;
  [key: string]: any;
}

export interface ContextMap {
  [id: string]: {
    [key: string]: any;
  }
}

abstract class AIManager<T = unknown> {
  private static _client: unknown;
  protected _history: Prompt[] = [];
  protected _basePrompts: Prompt[] = [{
    content: basePrompt,
    role: 'system'
  }];
  protected _context: ContextMap = {};
  private _realHistoryStartIndex = 0;

  constructor() {
    // @todo: Validate that we have a client.
    this.reset();
  }

  protected get _class() {
    return this.constructor as typeof AIManager;
  }

  get client() {
    return this._class._client as T;
  }

  set client(client: T) {
    this._class._client = client;
  }

  get history() {
    return this._history
      // Avoid sending the base training prompts.
      .slice(this._realHistoryStartIndex)
      // System messages are not shown to the user.
      .filter((message) => message.role !== 'system')
      // Discard the Q: prefix
      .map((message) => {
        if (message.role === 'user') {
          return {
            ...message,
            content: message.content.slice(2),
          };
        }
        return message;
      });
  }

  reset() {
    this._history = [...this.basePrompts];
    this._history.push();
    this._context = {};

    // Makes it easier to update the user visible start index.
    this._realHistoryStartIndex = this._history.length;
  }

  get basePrompts() {
    return this._basePrompts;
  }

  set basePrompts(prompts: Prompt[]) {
    this._basePrompts = prompts;
  }

  getContext(id: string = '') {
    if (id === '') {
      return this._context;
    }

    return this._context[id];
  }

  addContext(id: string, content: ContextMap[string]) {
    if (id === '') {
      throw new Error('Context ID cannot be empty');
    }

    this._context[id] = {content}

    // Check whether to replace or to add the context
    // Go from the end until the start of the history, if a context is found with the
    // same ID, before any system message, replace it.
    let shouldReplace = 0;
    let indexToAdd = this._history.length;
    for (let i = this._history.length - 1; i >= this._realHistoryStartIndex; i--) {
      if (this._history[i].id === id) {
        indexToAdd = i;
        shouldReplace = 1;
        break;
      }
      if (this._history[i].role === 'system') {
        break;
      }
    }

    this._history.splice(indexToAdd, shouldReplace, {
      content: `C:${id}=${JSON.stringify(content)}`,
      role: 'context',
      id
    });
  }

  async userSend(prompt: string) {
    this._history.push({
      content: `Q:${prompt}`,
      role: 'user'
    })

    const promptResp = await this.send(
      // Keep only the content + role from the history messages.
      this._history.map((message) => ({
        content: message.content,
        role: message.role === 'context' ? 'system' : message.role
      }))
    );

    if (!promptResp.error) {
      this._history.push({
        content: promptResp.content,
        role: 'assistant'
      });
    }

    return promptResp;
  }

  abstract send(messages: Prompt[]): Promise<PromptResponse>;

  getPromptSuggestions() {
    if (!this) {
      return [];
    }
    const context = this.getContext() || {};
    const ids = Object.keys(context);

    if (ids.length === 0) {
      return [];
    }

    let suggestions = [];
    const lastContextId = ids[ids.length - 1];
    if (lastContextId === 'resourceList') {
      suggestions = [
        'How many resources do I have here?',
        'Explain this to me.',
        'Give me an example of a deployment.',
      ];
    } else if (lastContextId === 'resourceDetails') {
      suggestions = [
        'Explain this to me.',
        'Any problem with this resource?',
      ];
    } else if (lastContextId === 'clusterWarnings') {
      suggestions = [];
      const lastContext = context[lastContextId];
      if (lastContext?.content?.list?.length > 0) {
        suggestions.push('How can I fix the warnings in this cluster.');
      }
    } else {
      suggestions = [
        "How can I reach out to Headlamp's developers?",
      ];
    }

    return suggestions;
  }
}

export default AIManager;