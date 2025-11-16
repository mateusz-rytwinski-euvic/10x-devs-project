export interface AiModelOption {
    value: string;
    label: string;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
    { value: '', label: 'Domyślny model systemowy' },
    { value: 'agentica-org/deepcoder-14b-preview:free', label: 'Agentica DeepCoder 14B Preview (free)' },
    { value: 'arliai/qwq-32b-arliai-rpr-v1:free', label: 'Arliai QWQ-32B Arliai RPR V1 (free)' },
    { value: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek: DeepSeek Chat V3.1 (free)' },
    { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek: DeepSeek R1 (free)' },
    { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek: DeepSeek R1-0528 (free)' },
    { value: 'deepseek/deepseek-r1-0528-qwen3-8b:free', label: 'DeepSeek: DeepSeek R1-0528 Qwen3 8B (free)' },
    { value: 'google/gemma-3n-e2b-it:free', label: 'Google Gemma 3N E2B IT (free)' },
    { value: 'meituan/longcat-flash-chat:free', label: 'Meituan: LongCat Flash Chat (free)' },
    { value: 'microsoft/mai-ds-r1:free', label: 'Microsoft MAI-DS R1 (free)' },
    { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral: Mistral 7B Instruct (free)' },
    { value: 'mistralai/mistral-small-3.2-24b-instruct:free', label: 'Mistral: Mistral Small 3.2 24B (free)' },
    { value: 'moonshotai/kimi-k2:free', label: 'MoonshotAI Kimi K2 (free)' },
    { value: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'NousResearch Hermes 3 Llama 3.1 405B (free)' },
    { value: 'openai/gpt-oss-20b:free', label: 'OpenAI GPT-OSS 20B (free)' },
    { value: 'openrouter/sherlock-dash-alpha', label: 'Sherlock Dash Alpha' },
    { value: 'openrouter/sherlock-think-alpha', label: 'Sherlock Think Alpha' },
    { value: 'tngtech/deepseek-r1t2-chimera:free', label: 'TNGTech DeepSeek R1T2 Chimera (free)' },
    { value: 'alibaba/tongyi-deepresearch-30b-a3b:free', label: 'Tongyi DeepResearch 30B A3B (free)' },
    { value: 'z-ai/glm-4.5-air:free', label: 'Z-AI GLM 4.5 Air (free)' },
];

/**
 * Resolves a human-readable label for the supplied AI model identifier.
 */
export const getAiModelLabel = (model: string | null | undefined): string => {
    if (!model) {
        return AI_MODEL_OPTIONS[0]?.label ?? 'Domyślny model systemowy';
    }

    const match = AI_MODEL_OPTIONS.find((option) => option.value === model);
    return match?.label ?? model;
};
