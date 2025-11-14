import { Button, Spinner } from '@fluentui/react-components';
import { SparkleFilled } from '@fluentui/react-icons';

interface AiGenerationSectionProps {
    onGenerate: () => void;
    isButtonDisabled: boolean;
    isGenerating: boolean;
    disabledReason?: string | null;
}

/**
 * AiGenerationSection provides the trigger and context for AI-powered recommendations.
 */
export const AiGenerationSection = ({ onGenerate, isButtonDisabled, isGenerating, disabledReason }: AiGenerationSectionProps) => {
    return (
        <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
                <SparkleFilled className="text-sky-600" />
                <p className="font-medium">Generowanie zaleceń AI</p>
            </div>
            <p className="text-sm text-slate-600">
                Generowane zalecenia są wyłącznie sugestią. Zweryfikuj je przed zapisaniem i poinformuj pacjenta o ewentualnych ograniczeniach.
            </p>
            <div>
                <Button
                    appearance="primary"
                    icon={isGenerating ? <Spinner size="tiny" /> : <SparkleFilled />}
                    onClick={onGenerate}
                    disabled={isButtonDisabled}
                >
                    {isGenerating ? 'Generowanie…' : 'Wygeneruj zalecenia AI'}
                </Button>
                {isButtonDisabled && disabledReason ? (
                    <p className="mt-2 text-xs text-slate-500">{disabledReason}</p>
                ) : null}
            </div>
        </section>
    );
};
