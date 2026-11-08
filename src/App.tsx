// CodeRedGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  checkLlmConnection,
  getDefaultLlmEndpoint,
  streamInterrogation,
  type EvidenceId,
  type SuspectId
} from './lib/llm';

// --- 데이터 타입 정의 ---
interface Suspect {
  id: SuspectId;
  name: string;
  role: string;
  age: number;
  avatar: string;
  initialHeartRate: number;
  alibi: string;
}

interface Evidence {
  id: EvidenceId;
  name: string;
  desc: string;
  icon: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'suspect' | 'system';
  suspectId?: SuspectId;
  text: string;
  timestamp: string;
  stressDelta?: number;
  isContradiction?: boolean;
}

// --- 게임 기본 데이터 ---
const SUSPECTS: Record<SuspectId, Suspect> = {
  kim: {
    id: 'kim',
    name: '김보안',
    role: '물리보안팀장',
    age: 42,
    avatar: '👮‍♂️',
    initialHeartRate: 78,
    alibi: '21:10부터 방재실 모니터를 홀로 관제 중이었습니다.'
  },
  park: {
    id: 'park',
    name: '박개발',
    role: 'IT 외주 책임 연구원 [진범]',
    age: 29,
    avatar: '👩‍💻',
    initialHeartRate: 85,
    alibi: '전산실에서 오프라인으로 하나인증서 패치 스크립트 작성 중이었습니다.'
  },
  choi: {
    id: 'choi',
    name: '최청소',
    role: '야간 환경미화원',
    age: 55,
    avatar: '🧹',
    initialHeartRate: 80,
    alibi: '지하 1층 청소를 마치고 21:15에 휴게실로 들어갔습니다.'
  }
};

const EVIDENCE_LIST: Evidence[] = [
  {
    id: 'receipt',
    name: '비상계단 자판기 영수증',
    desc: '21:23, 비상계단 자판기 커피 결제 내역',
    icon: '🧾'
  },
  {
    id: 'cctv',
    name: 'CCTV 조작 로그',
    desc: '21:20부터 20분간 영상 루프 반복 스크립트 실행 흔적',
    icon: '📹'
  },
  {
    id: 'wax',
    name: '바닥 특수 왁스 자국',
    desc: '금고 출입문 앞 미화용 고광택 왁스 카트 바퀴 자국',
    icon: '🧴'
  },
  {
    id: 'mac',
    name: '서버 접속 MAC 로그',
    desc: '21:22, 박개발 맥북 MAC 주소 원격 푸시 기록',
    icon: '💻'
  }
];

const QUICK_QUESTIONS: Record<SuspectId, string[]> = {
  kim: [
    '방재실을 1초도 비우지 않은 게 맞습니까?',
    '21시 23분 비상계단 자판기 결제는 뭡니까?',
    '순찰 일지 시간과 실제 동선이 다릅니다.'
  ],
  park: [
    '인터넷 끊었다면서 21시 22분 서버 접속 로그는 뭐죠?',
    'CCTV 영상이 왜 21시 20분부터 루프 조작됐을까요?',
    '하나인증서 백도어 키를 외부로 유출했습니까?'
  ],
  choi: [
    '금고 앞 복도에 왁스 카트 자국이 왜 남아있죠?',
    '바닥에 떨어진 VIP 마스터키를 주운 적 없나요?',
    '정확히 몇 시에 지하 청소를 끝내셨습니까?'
  ]
};

interface DeterministicResponse {
  text: string;
  stressDelta: number;
  isContradiction: boolean;
}

function getDeterministicResponse(suspectId: SuspectId, question: string, evidenceId: EvidenceId | null): DeterministicResponse {
  const lower = question.toLowerCase();

  if (suspectId === 'park') {
    if (
      evidenceId === 'mac' ||
      lower.includes('mac') ||
      lower.includes('인터넷') ||
      lower.includes('접속') ||
      lower.includes('로그')
    ) {
      return {
        text: '네?! 그, 그게 왜... 아, 아니, 그건 자동 스케줄러가 백그라운드에서 실행된 거지 제가 직접 한 게 아닙니다! 관리자 권한 로그는 저도 못 보는데 어떻게...?!',
        stressDelta: 50,
        isContradiction: true
      };
    }
    if (evidenceId === 'cctv' || lower.includes('cctv') || lower.includes('루프')) {
      return {
        text: 'CCTV 루프요...? 방재실 보안 쪽 문제 아닌가요? 저는 3층 전산실에만 있었는데 왜 저한테 그런 걸 물으시나요...',
        stressDelta: 25,
        isContradiction: false
      };
    }
    return {
      text: '저는 하나은행 보안 프로토콜 규정을 엄격히 준수했습니다. 수사관님, 시간 낭비하지 마시고 방재실이나 확인해 보세요.',
      stressDelta: 5,
      isContradiction: false
    };
  }

  if (suspectId === 'kim') {
    if (
      evidenceId === 'receipt' ||
      lower.includes('자판기') ||
      lower.includes('영수증') ||
      lower.includes('커피') ||
      lower.includes('비상계단')
    ) {
      return {
        text: '큭...! 수, 수사관님 제발 그것만은 봐주십시오. 사채업자 놈들이 전화로 협박해서 잠깐 비상계단에서 통화한 겁니다. 금고에는 손도 안 댔습니다!',
        stressDelta: 55,
        isContradiction: true
      };
    }
    if (lower.includes('방재실') || lower.includes('순찰')) {
      return {
        text: '당직 근무 규정대로 1시간마다 모니터를 육안 체크했습니다. 제 장부에도 기록되어 있습니다!',
        stressDelta: 10,
        isContradiction: false
      };
    }
    return {
      text: '20년 동안 하나은행 보안을 지켜왔습니다. 저를 모욕하지 마십시오.',
      stressDelta: 5,
      isContradiction: false
    };
  }

  if (
    evidenceId === 'wax' ||
    lower.includes('왁스') ||
    lower.includes('바닥') ||
    lower.includes('카트')
  ) {
    return {
      text: '아이고 수사관님... 제가 바닥에 반짝이는 카드(VIP 마스터키)가 떨어져 있길래 잠깐 주워서 주머니에 넣었던 건 맞는데요... 금고 문은 어떻게 여는지도 모릅니다요!',
      stressDelta: 45,
      isContradiction: true
    };
  }
  if (lower.includes('마스터키') || lower.includes('카드')) {
    return {
      text: '카, 카드라니요? 저는 빗자루질밖에 안 했습니다...',
      stressDelta: 30,
      isContradiction: true
    };
  }
  return {
    text: '나이 먹고 청소하는 사람이라고 무시하시는 겁니까? 저는 시간 맞춰 휴게실에 들어갔어요.',
    stressDelta: 5,
    isContradiction: false
  };
}

type ApiCheckStatus = 'idle' | 'checking' | 'connected' | 'error';

function getSavedLlmEndpoint() {
  try {
    return window.localStorage.getItem('code-red-llm-endpoint') || getDefaultLlmEndpoint();
  } catch {
    return getDefaultLlmEndpoint();
  }
}

function getSavedAiMode() {
  try {
    return window.localStorage.getItem('code-red-ai-mode') === 'true';
  } catch {
    return false;
  }
}

export default function CodeRedGame() {
  // --- 상태 관리 ---
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectId>('park');
  const [heartRates, setHeartRates] = useState<Record<SuspectId, number>>({ kim: 78, park: 85, choi: 80 });
  const [remainingTurns, setRemainingTurns] = useState<number>(15);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [showAlibiBanner, setShowAlibiBanner] = useState<boolean>(true);
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'system',
      text: '🚨 [사이버수사대] 하나은행 지하 VIP 금고 침납 사건 모바일 심문실입니다. 15회 내에 진술 모순을 밝혀내십시오.',
      timestamp: '21:40'
    },
    {
      id: 'init-2',
      sender: 'suspect',
      suspectId: 'park',
      text: '수사관님, 저는 내일 배포할 하나인증서 보안 패치를 로컬에서 테스트 중이었습니다. 왜 저를 의심하시죠?',
      timestamp: '21:40'
    }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingSuspectId, setTypingSuspectId] = useState<SuspectId | null>(null);
  const [streamingReply, setStreamingReply] = useState('');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState(getSavedLlmEndpoint);
  const [isAiMode, setIsAiMode] = useState(getSavedAiMode);
  const [apiCheckStatus, setApiCheckStatus] = useState<ApiCheckStatus>('idle');
  const [apiCheckMessage, setApiCheckMessage] = useState('연결 상태를 확인해 주세요.');

  // 모달 상태
  const [isAccuseModalOpen, setIsAccuseModalOpen] = useState<boolean>(false);
  const [accuseSuspect, setAccuseSuspect] = useState<SuspectId>('park');
  const [accuseEvidence, setAccuseEvidence] = useState<EvidenceId>('mac');
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [resultMessage, setResultMessage] = useState<{ title: string; desc: string; badge: string }>({
    title: '',
    desc: '',
    badge: ''
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 대화창 자동 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs, isTyping, streamingReply]);

  // EKG 심박수 주기적 미세 변화
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartRates((prev) => {
        const jitter = Math.floor(Math.random() * 5) - 2;
        return {
          kim: Math.max(70, Math.min(180, prev.kim + jitter)),
          park: Math.max(75, Math.min(185, prev.park + jitter)),
          choi: Math.max(70, Math.min(180, prev.choi + jitter))
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  // 질문 전송 처리
  const handleAskQuestion = async (questionText: string, evidenceUsed: EvidenceId | null = null) => {
    if (!questionText.trim() || remainingTurns <= 0 || isTyping) return;

    const suspectIdAtSend = selectedSuspect;
    const heartRateAtSend = heartRates[suspectIdAtSend];
    const newTurn = remainingTurns - 1;
    setRemainingTurns(newTurn);
    setInputText('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: evidenceUsed
        ? `[증거 제시: ${EVIDENCE_LIST.find((e) => e.id === evidenceUsed)?.name}]\n${questionText}`
        : questionText,
      timestamp: getCurrentTime()
    };

    setChatLogs((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setTypingSuspectId(suspectIdAtSend);
    setStreamingReply('');

    const localResponse = getDeterministicResponse(suspectIdAtSend, questionText, evidenceUsed);
    let replyText = localResponse.text;
    let fallbackNotice: ChatMessage | null = null;

    try {
      if (isAiMode) {
        const history = chatLogs
          .filter((message) => message.sender !== 'system' && (message.sender === 'user' || message.suspectId === suspectIdAtSend))
          .slice(-8)
          .map((message) => ({
            role: message.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: message.text
          }));

        replyText = await streamInterrogation(
          apiEndpoint,
          {
            suspectId: suspectIdAtSend,
            question: questionText,
            evidenceId: evidenceUsed,
            heartRate: heartRateAtSend,
            history
          },
          setStreamingReply
        );
        setApiCheckStatus('connected');
        setApiCheckMessage('AI 서버에 연결되었습니다.');
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 600));
      }
    } catch {
      setStreamingReply('');
      setApiCheckStatus('error');
      setApiCheckMessage('AI 연결에 실패해 로컬 엔진으로 응답했습니다.');
      fallbackNotice = {
        id: `msg-fallback-${Date.now()}`,
        sender: 'system',
        text: '⚠️ AI 서버에 연결할 수 없어 내장 추리 엔진으로 답변했습니다.',
        timestamp: getCurrentTime()
      };
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    setHeartRates((prev) => ({
      ...prev,
      [suspectIdAtSend]: Math.min(185, prev[suspectIdAtSend] + localResponse.stressDelta)
    }));

    const botMsg: ChatMessage = {
      id: 'msg-bot-' + Date.now(),
      sender: 'suspect',
      suspectId: suspectIdAtSend,
      text: replyText || localResponse.text,
      timestamp: getCurrentTime(),
      stressDelta: localResponse.stressDelta,
      isContradiction: localResponse.isContradiction
    };

    setChatLogs((prev) => [...prev, ...(fallbackNotice ? [fallbackNotice] : []), botMsg]);
    setIsTyping(false);
    setTypingSuspectId(null);
    setStreamingReply('');
    setSelectedEvidence(null);

    if (newTurn === 0) setIsAccuseModalOpen(true);
  };

  const handleCheckLlmConnection = async () => {
    setApiCheckStatus('checking');
    setApiCheckMessage('AI 서버 연결을 확인하고 있습니다...');
    try {
      await checkLlmConnection(apiEndpoint);
      setApiCheckStatus('connected');
      setApiCheckMessage('AI 서버와 모델 설정이 확인되었습니다.');
    } catch (error) {
      setApiCheckStatus('error');
      setApiCheckMessage(error instanceof Error ? error.message : 'AI 서버에 연결하지 못했습니다.');
    }
  };

  const handleSaveLlmSettings = () => {
    const normalizedEndpoint = apiEndpoint.trim() || getDefaultLlmEndpoint();
    setApiEndpoint(normalizedEndpoint);
    try {
      window.localStorage.setItem('code-red-llm-endpoint', normalizedEndpoint);
      window.localStorage.setItem('code-red-ai-mode', String(isAiMode));
    } catch {
      // Private browsing may block local storage; settings still apply for this session.
    }
    setIsAiSettingsOpen(false);
  };

  // 최종 기소 판정
  const handleFinalIndictment = () => {
    setIsAccuseModalOpen(false);

    if (accuseSuspect === 'park' && accuseEvidence === 'mac') {
      setGameResult('win');
      setResultMessage({
        title: '🏆 완벽한 검거 성공! (S랭크)',
        desc: '외주 개발자 박개발의 노트북 고유 MAC 주소와 21시 22분 GitHub 백도어 커밋 푸시 로그를 들이밀자, 박개발이 완전히 무너지며 CCTV 루프 조작 및 관리자 키 탈취를 자백했습니다! 하나은행 지하 VIP 금고의 보안 위협을 완벽히 방어했습니다.',
        badge: '하나원픽 골드 마스터 수사관 표창'
      });
    } else {
      setGameResult('lose');
      let reason = '';
      if (accuseSuspect === 'kim') {
        reason =
          '김보안 팀장은 사채 통화로 자리를 비운 직무유기 혐의는 인정되었으나, 금고를 침납한 해커가 아니었습니다. 진짜 해커 박개발은 유유히 증거를 인멸하고 탈출했습니다.';
      } else if (accuseSuspect === 'choi') {
        reason =
          '최청소 여사는 바닥에 떨어진 VIP 카드를 습득한 점유이탈물횡령 혐의는 인정되었으나, 디지털 FIDO 암호화 금고를 뚫을 기술적 능력이 없어 법원에서 기각되었습니다.';
      } else {
        reason =
          '박개발을 진범으로 지목했으나 결정적 스모킹 건(MAC 주소 로그)을 제시하지 못해 교묘한 법망을 빠져나갔습니다.';
      }
      setResultMessage({
        title: '❌ 기소 실패 (RANK F)',
        desc: reason,
        badge: '수사 권한 정지 처분'
      });
    }
  };

  const handleResetGame = () => {
    setGameResult(null);
    setRemainingTurns(15);
    setHeartRates({ kim: 78, park: 85, choi: 80 });
    setSelectedSuspect('park');
    setSelectedEvidence(null);
    setChatLogs([
      {
        id: 'init-1',
        sender: 'system',
        text: '🚨 [사이버수사대] 심문실이 리셋되었습니다. 진술 모순을 찾아내십시오.',
        timestamp: getCurrentTime()
      }
    ]);
  };

  const currentSuspect = SUSPECTS[selectedSuspect];
  const currentHeartRate = heartRates[selectedSuspect];
  const activeTypingSuspect = SUSPECTS[typingSuspectId ?? selectedSuspect];

  const getBpmBadge = (bpm: number) => {
    if (bpm >= 130) return { bg: 'bg-red-500/20 text-red-400 border-red-500/40', label: '🔥 당황' };
    if (bpm >= 105) return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', label: '⚠️ 긴장' };
    return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', label: '🟢 안정' };
  };

  return (
    <div className="flex justify-center bg-slate-900 min-h-screen">
      {/* 모바일 최적화 컨테이너 (태블릿/PC에서는 깔끔한 스마트폰 뷰로 중앙 정렬) */}
      <div className="w-full max-w-md h-screen flex flex-col bg-slate-950 text-slate-100 shadow-2xl relative overflow-hidden border-x border-slate-800/80">
        
        {/* 1. 상단 미니멀 헤더 */}
        <header className="h-12 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur px-3.5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
              H
            </span>
            <div>
              <h1 className="text-xs font-bold text-white tracking-tight leading-none">
                코드 레드: 하나은행 지하 금고
              </h1>
              <span className="text-[10px] text-emerald-400 font-semibold">사이버 수사대 심문실</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-800/90 px-2 py-1 rounded-md border border-slate-700/80 flex items-center gap-1">
              <span className="text-[10px] text-slate-400">질문</span>
              <span
                className={`text-xs font-black ${
                  remainingTurns <= 3 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {remainingTurns}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAiSettingsOpen(true)}
              aria-label="AI 연결 설정"
              className={`px-2 py-1 rounded-md border text-[10px] font-bold transition-all ${
                isAiMode
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              ⚙️ AI
            </button>

            <button
              onClick={() => setIsAccuseModalOpen(true)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/30 transition-all flex items-center gap-1 active:scale-95 shrink-0"
            >
              <span>⚖️</span>
              <span>기소</span>
            </button>
          </div>
        </header>

        {/* 2. 상단 3인 용의자 탭바 (콤팩트 가로 배치) */}
        <div className="bg-slate-900/70 border-b border-slate-800/80 px-2 py-1.5 shrink-0">
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SUSPECTS) as SuspectId[]).map((id) => {
              const s = SUSPECTS[id];
              const isSelected = selectedSuspect === id;
              const bpm = heartRates[id];
              const badge = getBpmBadge(bpm);

              return (
                <button
                  key={id}
                  onClick={() => setSelectedSuspect(id)}
                  disabled={isTyping}
                  className={`flex items-center justify-between p-1.5 rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-70 hover:opacity-100'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-lg leading-none shrink-0">{s.avatar}</span>
                    <div className="truncate">
                      <div className="text-[11px] font-bold text-slate-200 truncate">{s.name}</div>
                      <div className="text-[9px] text-slate-400 truncate">{s.role.split(' ')[0]}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded border shrink-0 ${badge.bg}`}
                  >
                    {bpm}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 용의자 실시간 상태 & 알리바이 요약 배너 (접이식) */}
        <div className="bg-slate-900/40 border-b border-slate-800/60 px-3 py-1.5 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-emerald-400 shrink-0">{currentSuspect.name}</span>
            <span className="text-slate-400 truncate">
              {showAlibiBanner ? `"${currentSuspect.alibi}"` : `${currentSuspect.role} (${currentSuspect.age}세)`}
            </span>
          </div>
          <button
            onClick={() => setShowAlibiBanner(!showAlibiBanner)}
            className="text-[10px] text-slate-500 hover:text-slate-300 ml-2 shrink-0"
          >
            {showAlibiBanner ? '닫기 ▲' : '알리바이 ▼'}
          </button>
        </div>

        {/* 4. 메신저형 대화창 (카카오톡 스타일 말풍선) */}
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950">
          {chatLogs.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="text-center text-[11px] py-1 px-3 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 leading-snug">
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isUser = msg.sender === 'user';
            const suspect = SUSPECTS[msg.suspectId || selectedSuspect];

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0 mb-1">
                    {suspect.avatar}
                  </div>
                )}

                <div
                  className={`flex flex-col ${
                    isUser ? 'items-end' : 'items-start'
                  } max-w-[78%]`}
                >
                  {!isUser && (
                    <span className="text-[10px] text-slate-400 font-semibold mb-0.5 ml-1">
                      {suspect.name}
                    </span>
                  )}

                  <div
                    className={`p-2.5 rounded-2xl text-xs leading-relaxed border whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-none border-emerald-500 shadow-sm'
                        : msg.isContradiction
                        ? 'bg-red-950/70 text-red-100 rounded-bl-none border-red-500 shadow-md shadow-red-950/40'
                        : 'bg-slate-900 text-slate-200 rounded-bl-none border-slate-800'
                    }`}
                  >
                    {msg.text}

                    {msg.isContradiction && (
                      <div className="mt-1.5 pt-1.5 border-t border-red-500/30 text-[10px] text-red-300 font-bold flex items-center gap-1">
                        <span>⚡</span>
                        <span>모순 포착! 심박수 급상승 (+{msg.stressDelta} BPM)</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2 items-end">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0 mb-1">
                {activeTypingSuspect.avatar}
              </div>
              <div className="flex flex-col items-start max-w-[78%]">
                <span className="text-[10px] text-slate-400 font-semibold mb-0.5 ml-1">
                  {activeTypingSuspect.name}
                </span>
                <div className="p-2.5 rounded-2xl rounded-bl-none bg-slate-900 text-slate-200 border border-slate-800 text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {streamingReply || <span className="animate-pulse text-slate-500 italic">답변을 망설이고 있습니다...</span>}
                  {streamingReply && <span className="ml-0.5 animate-pulse text-emerald-300">▍</span>}
                </div>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* 5. 하단 인터랙션 컨트롤 (증거 칩 + 추천 질문 + 입력창) */}
        <div className="border-t border-slate-800/80 bg-slate-900/90 backdrop-blur shrink-0">
          
          {/* 4대 증거 가로 스크롤 칩 (터치 토글) */}
          <div className="px-2.5 py-1.5 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">증거제시:</span>
            {EVIDENCE_LIST.map((ev) => {
              const isChosen = selectedEvidence === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvidence(isChosen ? null : ev.id)}
                  disabled={isTyping}
                  className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 transition-all ${
                    isChosen
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  } disabled:opacity-50`}
                >
                  <span>{ev.icon}</span>
                  <span>{ev.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* 추천 질문 가로 스크롤 칩 */}
          <div className="px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-bold text-slate-500 shrink-0">추천:</span>
            {QUICK_QUESTIONS[selectedSuspect].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q, selectedEvidence)}
                disabled={remainingTurns <= 0 || isTyping}
                className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/80 shrink-0 transition-all active:scale-95 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          {/* 텍스트 입력창 & 전송 버튼 */}
          <div className="p-2 pt-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion(inputText, selectedEvidence);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  selectedEvidence
                    ? `[${EVIDENCE_LIST.find((e) => e.id === selectedEvidence)?.name}] 증거 제시 중...`
                    : `${currentSuspect.name}에게 심문할 질문 입력...`
                }
                disabled={remainingTurns <= 0 || isTyping}
                className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || remainingTurns <= 0 || isTyping}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
              >
                전송
              </button>
            </form>
          </div>
        </div>

        {/* AI API 설정 */}
        {isAiSettingsOpen && (
          <div className="absolute inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
            <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">AI 심문 연결</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">OpenAI Responses API 스트리밍</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiSettingsOpen(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                  aria-label="설정 닫기"
                >
                  ✕
                </button>
              </div>

              <div className="py-3 space-y-3">
                <label className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAiMode}
                    onChange={(event) => setIsAiMode(event.target.checked)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-100">실제 AI 응답 사용</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">끄면 키나 네트워크 없이 로컬 추리 엔진으로 플레이합니다.</span>
                  </span>
                </label>

                <div>
                  <label htmlFor="llm-endpoint" className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    AI 서버 주소
                  </label>
                  <input
                    id="llm-endpoint"
                    type="url"
                    value={apiEndpoint}
                    onChange={(event) => setApiEndpoint(event.target.value)}
                    placeholder="https://내-서버.vercel.app/api/interrogate"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none"
                    autoComplete="url"
                    spellCheck={false}
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    기본값은 <code className="text-slate-400">/api/interrogate</code>입니다. GitHub Pages에서 AI 모드를 쓰려면 별도 배포한 서버 주소를 입력하세요.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 px-3 py-2 border border-slate-800">
                  <span className={`text-[10px] leading-relaxed ${apiCheckStatus === 'connected' ? 'text-emerald-300' : apiCheckStatus === 'error' ? 'text-amber-300' : 'text-slate-400'}`}>
                    {apiCheckMessage}
                  </span>
                  <button
                    type="button"
                    onClick={handleCheckLlmConnection}
                    disabled={apiCheckStatus === 'checking'}
                    className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {apiCheckStatus === 'checking' ? '확인 중…' : '연결 확인'}
                  </button>
                </div>

                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  보안을 위해 API 키는 이 브라우저에 입력하거나 저장하지 않습니다. 서버 환경변수 <code>OPENAI_API_KEY</code>에 설정해야 합니다. AI 서버에 연결할 수 없으면 로컬 엔진으로 계속 플레이합니다.
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  AI 모드에서는 질문과 최근 심문 일부가 설정한 서버로 전송됩니다. 심박수 상승과 모순 판정은 현재 로컬 증거 규칙으로 처리합니다.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiSettingsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleSaveLlmSettings}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  설정 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. 모바일 최적화 진범 기소 모달 */}
        {isAccuseModalOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
            <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>⚖️</span>
                  <span>진범 기소 및 영장 청구</span>
                </h3>
                <button
                  onClick={() => setIsAccuseModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>

              <div className="py-3 space-y-3">
                {/* 용의자 1인 선택 */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    1. 금고 침납 진범 지목:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(SUSPECTS) as SuspectId[]).map((id) => {
                      const s = SUSPECTS[id];
                      const isPicked = accuseSuspect === id;
                      return (
                        <div
                          key={id}
                          onClick={() => setAccuseSuspect(id)}
                          className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                            isPicked
                              ? 'bg-red-950/70 border-red-500 ring-1 ring-red-500'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="text-xl mb-0.5">{s.avatar}</div>
                          <div className="text-[11px] font-bold text-slate-200">{s.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 결정적 증거 1개 선택 */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    2. 법원 제출용 스모킹 건(증거):
                  </label>
                  <div className="space-y-1">
                    {EVIDENCE_LIST.map((ev) => {
                      const isPicked = accuseEvidence === ev.id;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setAccuseEvidence(ev.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isPicked
                              ? 'bg-red-950/40 border-red-500 text-red-200'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>{ev.icon}</span>
                            <span className="font-semibold text-[11px] truncate">{ev.name}</span>
                          </div>
                          {isPicked && <span className="text-[10px] text-red-400 font-bold shrink-0">선택됨</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setIsAccuseModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  onClick={handleFinalIndictment}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30"
                >
                  최종 기소 확정
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. 엔딩 결과 모달 */}
        {gameResult && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center shadow-2xl">
              <div className="text-4xl mb-2">{gameResult === 'win' ? '🎖️' : '🚨'}</div>

              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black mb-2 border ${
                  gameResult === 'win'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
              >
                {resultMessage.badge}
              </span>

              <h2 className="text-base font-black text-white mb-2">{resultMessage.title}</h2>

              <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 text-left mb-4">
                {resultMessage.desc}
              </p>

              <button
                onClick={handleResetGame}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
              >
                처음부터 다시 수사하기 (재도전)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
