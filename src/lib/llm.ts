export type SuspectId = 'kim' | 'park' | 'choi';
export type EvidenceId = 'receipt' | 'cctv' | 'wax' | 'mac';

export interface InterrogationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface InterrogationRequest {
  suspectId: SuspectId;
  question: string;
  evidenceId: EvidenceId | null;
  heartRate: number;
  history: InterrogationHistoryItem[];
}

const DEFAULT_ENDPOINT = import.meta.env.VITE_LLM_API_URL?.trim() || '/api/interrogate';

export function getDefaultLlmEndpoint() {
  return DEFAULT_ENDPOINT;
}

function resolveEndpoint(endpoint: string) {
  const value = endpoint.trim();
  if (!value) throw new Error('AI 서버 주소를 입력해 주세요.');

  let url: URL;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    throw new Error('AI 서버 주소 형식을 확인해 주세요.');
  }

  const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('AI 서버 주소는 HTTPS를 사용해야 합니다.');
  }

  return url.toString();
}

async function readError(response: Response) {
  const payload = await response.json().catch(() => null);
  return typeof payload?.error === 'string' ? payload.error : `AI 서버 오류 (${response.status})`;
}

export async function checkLlmConnection(endpoint: string) {
  const response = await fetch(resolveEndpoint(endpoint), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) throw new Error(await readError(response));

  const payload = (await response.json()) as { ok?: boolean; configured?: boolean };
  if (!payload.ok || !payload.configured) {
    throw new Error('AI 서버는 응답했지만 서버 측 모델 설정이 완료되지 않았습니다.');
  }
}

export async function streamInterrogation(
  endpoint: string,
  request: InterrogationRequest,
  onText: (text: string) => void
) {
  const response = await fetch(resolveEndpoint(endpoint), {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) throw new Error(await readError(response));
  if (!response.body) throw new Error('AI 서버가 스트리밍 응답을 지원하지 않습니다.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let completed = false;

  const processFrame = (frame: string) => {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');

    if (!data || data === '[DONE]') return;

    let event: { type?: string; delta?: string; message?: string };
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error('AI 서버의 스트리밍 데이터 형식이 올바르지 않습니다.');
    }

    if (event.type === 'delta' && typeof event.delta === 'string') {
      fullText += event.delta;
      onText(fullText);
    } else if (event.type === 'done') {
      completed = true;
    } else if (event.type === 'error') {
      throw new Error(event.message || 'AI 답변 생성 중 문제가 발생했습니다.');
    }
  };

  while (!completed) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';
    for (const frame of frames) processFrame(frame);
  }

  if (!completed && buffer.trim()) processFrame(buffer);
  if (!completed) throw new Error('AI 응답 스트림이 예기치 않게 종료됐습니다.');
  if (!fullText.trim()) throw new Error('AI 서버에서 빈 답변을 받았습니다.');

  return fullText.trim();
}
