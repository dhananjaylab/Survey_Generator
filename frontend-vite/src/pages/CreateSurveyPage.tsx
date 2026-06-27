/**
 * CreateSurveyPage
 *
 * Phase 2 fixes applied:
 *
 * 1. completionFiredRef guard — prevents handleCompletion() from running
 *    twice when both the WebSocket "SUCCESS" message AND the polling
 *    interval detect COMPLETED status simultaneously.
 *
 * 2. hasFailed-gated polling fallback — polling only activates when
 *    `hasFailed` is true (WS auth failure or exhausted reconnects).
 *    Normal WS disconnects / temporary drops still use the WS path.
 *
 * 3. WebSocket status badge — small dot + label in the generation modal
 *    shows real-time connection state (green/gray/yellow) so users know
 *    whether they're getting live updates or polling.
 *
 * 4. All console.log replaced with logger.debug / logger.warn.
 *
 * 5. useWebSocket usage matches the actual hook API on disk:
 *      useWebSocket(onMessage?) → {status, hasFailed, lastMessage, connect, disconnect}
 *    `connect(requestId)` is called after the HTTP /generate response.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveyStore } from '@/stores/surveyStore';
import { useUIStore } from '@/stores/uiStore';
import { useWebSocket } from '@/services/websocket/useWebSocket';
import { ApiEndpoints } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { logger } from '@/utils/logger';
import type { Survey, Choice } from '@/types/survey';

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'technology', 'healthcare', 'finance', 'education', 'retail',
  'manufacturing', 'hospitality', 'real-estate', 'automotive',
  'telecommunications', 'media', 'energy', 'transportation',
  'agriculture', 'construction', 'pharmaceutical', 'insurance',
  'legal', 'consulting', 'non-profit', 'government', 'other',
];

const STATUS_TERMINAL = new Set(['COMPLETED', 'FAILED']);

// ── WebSocket status badge ─────────────────────────────────────────────────────

function WsBadge({ status, hasFailed }: { status: string; hasFailed: boolean }) {
  if (hasFailed) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-yellow-600">
        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        Polling fallback
      </span>
    );
  }
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Live updates
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="h-2 w-2 rounded-full bg-gray-300" />
      Disconnected
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const CreateSurveyPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    setCurrentProject,
    setBusinessOverview,
    setIsGenerating,
    isGenerating,
    setCurrentSurvey,
    setCurrentSurveyDocLink,
    setError,
  } = useSurveyStore();
  const { addNotification } = useUIStore();

  // ── Form state ───────────────────────────────────────────────────────────────

  const [projectName, setProjectName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [industry, setIndustry] = React.useState('technology');
  const [useCase, setUseCase] = React.useState('');
  const [llmModel, setLlmModel] = React.useState<'gpt' | 'gemini'>('gpt');
  const [useWebSearch, setUseWebSearch] = React.useState(false);
  const [businessOverviewText, setBusinessOverviewText] = React.useState('');
  const [showOverview, setShowOverview] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // ── Generation state ─────────────────────────────────────────────────────────

  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [progressLog, setProgressLog] = React.useState<{ time: string; msg: string }[]>([]);
  const [isAiThinking, setIsAiThinking] = React.useState(false);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  /**
   * Guards against the race condition where BOTH the WebSocket "SUCCESS"
   * message AND the polling interval fire handleCompletion() in the same tick.
   */
  const completionFiredRef = React.useRef(false);

  // ── WebSocket ────────────────────────────────────────────────────────────────

  const { status: wsStatus, hasFailed, connect: wsConnect, disconnect: wsDisconnect } =
    useWebSocket((msg) => {
      appendLog(msg.update);

      if (msg.update === 'SUCCESS' || msg.completed) {
        handleCompletion();
      } else if (msg.update?.startsWith('ERROR')) {
        handleFailure(msg.update);
      }
    });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const appendLog = (text: string) => {
    setProgressLog((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), msg: text },
    ]);
  };

  // Auto-scroll log to bottom whenever a new entry arrives
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLog]);

  // Disconnect WS on unmount
  React.useEffect(() => () => wsDisconnect(), [wsDisconnect]);

  // ── Polling fallback (only when WS has permanently failed) ────────────────────

  React.useEffect(() => {
    if (!isGenerating || !requestId || !hasFailed) return;

    logger.debug('[create] WS failed — activating polling fallback');
    appendLog('Switching to polling fallback…');

    const interval = setInterval(async () => {
      try {
        const data = await ApiEndpoints.getSurveyStatus(requestId);
        appendLog(`Status: ${data.status}`);

        if (STATUS_TERMINAL.has(data.status)) {
          clearInterval(interval);
          if (data.status === 'COMPLETED') {
            handleCompletion();
          } else {
            handleFailure('Survey generation failed');
          }
        }
      } catch (err) {
        logger.warn('[create] polling error', err);
      }
    }, 4_000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, requestId, hasFailed]);

  // ── Completion / failure handlers ─────────────────────────────────────────────

  const handleCompletion = React.useCallback(async () => {
    if (completionFiredRef.current) {
      logger.debug('[create] handleCompletion called again — ignoring duplicate');
      return;
    }
    completionFiredRef.current = true;

    logger.debug('[create] generation complete — fetching survey data');

    if (!requestId) return;

    try {
      const data = await ApiEndpoints.getSurveyStatus(requestId);

      if (data.status !== 'COMPLETED') {
        logger.warn('[create] unexpected status after completion signal', data.status);
        return;
      }

      // ── Build frontend Survey object from SurveyJS pages ──────────────────

      const pages: any[] = Array.isArray(data.pages) ? data.pages : [];
      const questions = pages.flatMap((page: any) =>
        (page.elements ?? []).map((el: any, i: number) => ({
          id: el.surveyQID ?? el.name ?? `q-${i}`,
          type: mapType(el.type),
          title: stripHtml(el.title ?? ''),
          description: el.description ?? '',
          required: el.isRequired ?? false,
          choices: mapChoices(el),
        }))
      );

      const survey: Survey = {
        id: requestId,
        title: projectName || 'Draft Survey',
        description: businessOverviewText || '',
        pages: [{ id: 'page1', name: 'page1', title: 'Questions', questions }],
        settings: {
          showProgressBar: true,
          showQuestionNumbers: true,
          allowBack: true,
          completeText: 'Submit',
        },
      };

      setCurrentSurvey(survey);
      if (data.doc_link) setCurrentSurveyDocLink(data.doc_link);

      addNotification({
        type: 'success',
        title: 'Survey ready',
        message: `${questions.length} questions generated.`,
      });

      navigate('/builder');
    } catch (err: any) {
      logger.error('[create] failed to fetch completed survey', err);
      handleFailure(err?.detail ?? 'Failed to load generated survey');
    } finally {
      setIsGenerating(false);
    }
  }, [requestId, projectName, businessOverviewText]);

  const handleFailure = React.useCallback(
    (reason: string) => {
      logger.warn('[create] generation failed:', reason);
      setIsGenerating(false);
      setError(reason);
      addNotification({
        type: 'error',
        title: 'Generation failed',
        message: reason,
      });
    },
    [setIsGenerating, setError, addNotification]
  );

  // ── Form validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!projectName.trim()) errs.projectName = 'Project name is required';
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (!useCase.trim()) errs.useCase = 'Use case is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Generate business overview via AI ─────────────────────────────────────────

  const generateOverview = async () => {
    if (!companyName.trim()) return;
    setIsAiThinking(true);
    try {
      const data = await ApiEndpoints.getBusinessOverview({
        company_name: companyName,
        raw_input: [useCase.trim(), companyName.trim()].filter(Boolean).join('\n\n'),
        llm_model: llmModel,
      });
      setBusinessOverviewText(data.business_overview ?? '');
      setShowOverview(true);
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.detail ?? 'Failed to generate overview';
      addNotification({ type: 'error', title: 'AI error', message });
    } finally {
      setIsAiThinking(false);
    }
  };

  // ── Form submit — triggers generation pipeline ────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const reqId = `req-${Date.now()}`;
    setRequestId(reqId);
    completionFiredRef.current = false;

    setCurrentProject({ projectName, companyName, industry, useCase, llmProvider: llmModel });
    setBusinessOverview(businessOverviewText);
    setIsGenerating(true);
    setProgressLog([{ time: new Date().toLocaleTimeString(), msg: 'Starting survey generation…' }]);

    try {
      await ApiEndpoints.generateSurvey({
        request_id: reqId,
        project_name: projectName,
        company_name: companyName,
        business_overview: businessOverviewText,
        research_objectives: '',
        industry,
        use_case: useCase,
        llm_model: llmModel,
        use_web_search: useWebSearch,
      });

      // Connect WebSocket after confirming the task was accepted
      wsConnect(reqId);
      appendLog('Generation started — listening for updates…');
    } catch (err: any) {
      handleFailure(err?.detail ?? 'Failed to start generation');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">Create New Survey</h2>
          <p className="mt-1 text-sm text-gray-500">Fill in the details below to generate your survey with AI.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Project Name */}
          <FormField label="Project Name" error={formErrors.projectName}>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Customer Satisfaction 2024"
              disabled={isGenerating}
            />
          </FormField>

          {/* Company Name */}
          <FormField label="Company Name" error={formErrors.companyName}>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              disabled={isGenerating}
            />
          </FormField>

          {/* Industry + AI Model row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Industry">
              <Select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={isGenerating}
                options={INDUSTRIES.map((v) => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' '),
                }))}
              />
            </FormField>
            <FormField label="AI Provider">
              <Select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value as 'gpt' | 'gemini')}
                disabled={isGenerating}
                options={[
                  { value: 'gpt',    label: 'OpenAI GPT' },
                  { value: 'gemini', label: 'Google Gemini' },
                ]}
              />
            </FormField>
          </div>

          {/* Use Case */}
          <FormField label="Use Case / Research Goal" error={formErrors.useCase}>
            <Textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="Describe what you want to learn from this survey…"
              rows={4}
              disabled={isGenerating}
            />
          </FormField>

          {/* Web search toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useWebSearch}
              onChange={(e) => setUseWebSearch(e.target.checked)}
              disabled={isGenerating}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Enable web-search intelligence (fetches latest industry trends)
            </span>
          </label>

          {/* Business Overview — collapsible */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Business Overview</p>
                <p className="text-xs text-gray-500">Optional — extra context for better questions</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateOverview}
                  disabled={isGenerating || isAiThinking || !companyName.trim()}
                >
                  {isAiThinking ? 'Generating…' : '✨ AI Generate'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOverview((v) => !v)}
                >
                  {showOverview ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {showOverview && (
              <Textarea
                value={businessOverviewText}
                onChange={(e) => setBusinessOverviewText(e.target.value)}
                placeholder="Generated overview will appear here, or write your own…"
                rows={5}
                disabled={isGenerating}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => navigate('/')} disabled={isGenerating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating…' : 'Generate Survey'}
            </Button>
          </div>
        </form>
      </div>

      {/* Generation progress modal */}
      <Modal
        isOpen={isGenerating}
        onClose={() => {}}
        title="Generating Your Survey"
      >
        <div className="space-y-4">
          {/* WS status badge */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              This may take up to a minute — please don't close this window.
            </p>
            <WsBadge status={wsStatus} hasFailed={hasFailed} />
          </div>

          {/* Log console */}
          <div className="bg-gray-900 rounded-lg p-4 h-44 overflow-y-auto font-mono text-xs">
            {progressLog.map((entry, i) => (
              <div key={i} className="flex gap-2 text-green-400 break-words">
                <span className="text-gray-500 flex-shrink-0">[{entry.time}]</span>
                <span>{entry.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Spinner row */}
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm text-gray-500">AI is crafting your questions…</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── Utility helpers ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent ?? d.innerText ?? '';
}

function mapType(t: string): 'multiple-choice' | 'text' | 'matrix' | 'video' {
  if (t === 'radiogroup' || t === 'checkbox') return 'multiple-choice';
  if (t === 'comment')                         return 'text';
  if (t === 'matrix')                          return 'matrix';
  if (t === 'videofeedback')                   return 'video';
  return 'text';
}

function mapChoices(el: any): Choice[] {
  if (!Array.isArray(el.choices)) return [];
  return el.choices.map((c: any, i: number) => ({
    id:    `c-${i}`,
    text:  stripHtml(typeof c === 'string' ? c : c.text ?? c.value ?? ''),
    value: typeof c === 'string' ? c : c.value ?? c.text ?? '',
  }));
}
