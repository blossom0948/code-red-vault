// CodeRedGame.tsx
import React, { useState, useEffect, useRef } from 'react';

// --- 데이터 타입 정의 ---
type SuspectId = 'kim' | 'park' | 'choi';
type EvidenceId = 'receipt' | 'cctv' | 'wax' | 'mac';

interface Suspect {
  id: SuspectId;
  name: string;
  role: string;
  age: number;
  avatar: string;
  initialHeartRate: number;
  alibi: string;
  secret: string;
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
    alibi: '21시 10분부터 방재실 모니터를 홀로 관제하고 있었습니다.',
    secret: '사채 빚 독촉 전화를 받으러 비상계단 자판기에 다녀왔음 (직무유기 은폐)'
  },
  park: {
    id: 'park',
    name: '박개발',
    role: 'IT 외주 책임 연구원 [★ 진범]',
    age: 29,
    avatar: '👩‍💻',
    initialHeartRate: 85,
    alibi: '전산실에서 오프라인 로컬 환경으로 하나인증서 보안 패치 스크립트를 작성했습니다.',
    secret: 'CCTV 루프 악성코드 배포 및 금고 제어 서버 백도어 침투 실행자'
  },
  choi: {
    id: 'choi',
    name: '최청소',
    role: '야간 환경미화원',
    age: 55,
    avatar: '🧹',
    initialHeartRate: 80,
    alibi: '지하 1층 로비를 청소하고 21시 15분에 휴게실에 들어가 쉬었습니다.',
    secret: '바닥에 떨어진 VIP 임시 마스터키 카드를 습득하여 호주머니에 숨김'
  }
};

const EVIDENCE_LIST: Evidence[] = [
  {
    id: 'receipt',
    name: '비상계단 자판기 결제내역',
    desc: '21시 23분, 비상계단 자판기에서 커피 결제 승인 내역 확인.',
    icon: '🧾'
  },
  {
    id: 'cctv',
    name: 'CCTV 조작 로그',
    desc: '21시 20분부터 20분간 비정상적인 영상 반복(루프) 스크립트 실행 기록.',
    icon: '📹'
  },
  {
    id: 'wax',
    name: '바닥 특수 세정제 자국',
    desc: '금고 출입문 앞 복도 바닥에 묻어 있는 미화용 고광택 왁스 카트 바퀴 자국.',
    icon: '🧴'
  },
  {
    id: 'mac',
    name: '서버 접속 MAC 주소 로그',
    desc: '21시 22분, 금고 메인 제어 서버에 박개발의 맥북 고유 MAC 주소 원격 접속 및 커밋 푸시 기록.',
    icon: '💻'
  }
];

const QUICK_QUESTIONS: Record<SuspectId, string[]> = {
  kim: ['당시 방재실을 정말 단 1초도 비우지 않았습니까?', '비상계단 자판기 커피 결제 내역이 있던데요?', '순찰 일지 작성 시간과 실제 행적이 일치합니까?'],
  park: ['인터넷 선을 뽑았는데 21시 22분 서버 접속 로그는 뭡니까?', 'CCTV 영상이 왜 21시 20분부터 루프 조작되었을까요?', '하나인증서 백도어 키를 외부로 유출했습니까?'],
  choi: ['금고 앞 복도에 왁스 카트 자국이 왜 남아있죠?', 'VIP 마스터키 카드를 주운 적 없으신가요?', '지하 1층 로비 청소를 정확히 언제 끝내셨습니까?']
};

export default function CodeRedGame() {
  // --- 상태 관리 ---
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectId>('park');
  const [heartRates, setHeartRates] = useState<Record<SuspectId, number>>({ kim: 78, park: 85, choi: 80 });
  const [remainingTurns, setRemainingTurns] = useState<number>(15);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'system',
      text: '🚨 [하나은행 본점] 지하 VIP 금고 침납 사건 - 긴급 심문실 가동. 총 15회의 질문 기회 내에 용의자들의 진술 모순을 밝혀내십시오.',
      timestamp: '21:40:00'
    },
    {
      id: 'init-2',
      sender: 'suspect',
      suspectId: 'park',
      text: '수사관님, 저는 내일 배포할 하나인증서 보안 패치를 로컬에서 테스트 중이었을 뿐입니다. 외부 인터넷도 차단해 뒀는데 저를 왜 의심하시죠?',
      timestamp: '21:40:12'
    }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

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
  }, [chatLogs, isTyping]);

  // EKG 심박수 심장박동 애니메이션을 위한 주기적 미세 변화
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

  // 시간 포맷 헬퍼
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  // 질문 응답 시뮬레이션 로직
  const handleAskQuestion = (questionText: string, evidenceUsed: EvidenceId | null = null) => {
    if (!questionText.trim() || remainingTurns <= 0 || isTyping) return;

    const newTurn = remainingTurns - 1;
    setRemainingTurns(newTurn);
    setInputText('');

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: evidenceUsed 
        ? `[증거 제시: ${EVIDENCE_LIST.find(e => e.id === evidenceUsed)?.name}] ${questionText}`
        : questionText,
      timestamp: getCurrentTime()
    };

    setChatLogs((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // AI 용의자 모순 감지 및 응답 생성
    setTimeout(() => {
      let replyText = '';
      let stressIncrease = 5;
      let isContradiction = false;
      const lower = questionText.toLowerCase();

      if (selectedSuspect === 'park') {
        if (evidenceUsed === 'mac' || lower.includes('mac') || lower.includes('인터넷') || lower.includes('접속') || lower.includes('로그')) {
          replyText = '네?! 그, 그게 왜... 아, 아니, 그건 자동 스케줄러가 백그라운드에서 실행된 거지 제가 직접 한 게 아닙니다! 관리자 권한 로그는 저도 못 보는데 어떻게...?!';
          stressIncrease = 50;
          isContradiction = true;
        } else if (evidenceUsed === 'cctv' || lower.includes('cctv') || lower.includes('루프')) {
          replyText = 'CCTV 루프요...? 방재실 보안 쪽 문제 아닌가요? 저는 3층 전산실에만 있었는데 왜 저한테 그런 걸 물으시나요...';
          stressIncrease = 25;
        } else {
          replyText = '저는 하나은행 보안 프로토콜 규정을 엄격히 준수했습니다. 수사관님, 시간 낭비하지 마시고 방재실이나 확인해 보세요.';
          stressIncrease = 5;
        }
      } else if (selectedSuspect === 'kim') {
        if (evidenceUsed === 'receipt' || lower.includes('자판기') || lower.includes('영수증') || lower.includes('커피') || lower.includes('비상계단')) {
          replyText = '큭...! 수, 수사관님 제발 그것만은 봐주십시오. 사채업자 놈들이 전화로 협박해서 잠깐 비상계단에서 통화한 겁니다. 금고에는 손도 안 댔습니다!';
          stressIncrease = 55;
          isContradiction = true;
        } else if (lower.includes('방재실') || lower.includes('순찰')) {
          replyText = '당직 근무 규정대로 1시간마다 모니터를 육안 체크했습니다. 제 장부에도 기록되어 있습니다!';
          stressIncrease = 10;
        } else {
          replyText = '20년 동안 하나은행 보안을 지켜왔습니다. 저를 모욕하지 마십시오.';
          stressIncrease = 5;
        }
      } else if (selectedSuspect === 'choi') {
        if (evidenceUsed === 'wax' || lower.includes('왁스') || lower.includes('바닥') || lower.includes('카트')) {
          replyText = '아이고 수사관님... 제가 바닥에 반짝이는 카드(VIP 마스터키)가 떨어져 있길래 잠깐 주워서 주머니에 넣었던 건 맞는데요... 금고 문은 어떻게 여는지도 모릅니다요!';
          stressIncrease = 45;
          isContradiction = true;
        } else if (lower.includes('마스터키') || lower.includes('카드')) {
          replyText = '카, 카드라니요? 저는 빗자루질밖에 안 했습니다...';
          stressIncrease = 30;
          isContradiction = true;
        } else {
          replyText = '나이 먹고 청소하는 사람이라고 무시하시는 겁니까? 저는 시간 맞춰 휴게실에 들어갔어요.';
          stressIncrease = 5;
        }
      }

      // 심박수 갱신
      setHeartRates((prev) => ({
        ...prev,
        [selectedSuspect]: Math.min(185, prev[selectedSuspect] + stressIncrease)
      }));

      const botMsg: ChatMessage = {
        id: 'msg-bot-' + Date.now(),
        sender: 'suspect',
        suspectId: selectedSuspect,
        text: replyText,
        timestamp: getCurrentTime(),
        stressDelta: stressIncrease,
        isContradiction
      };

      setChatLogs((prev) => [...prev, botMsg]);
      setIsTyping(false);
      setSelectedEvidence(null); // 증거 제시 후 초기화

      // 질문 기회 소진 체크
      if (newTurn === 0) {
        setIsAccuseModalOpen(true);
      }
    }, 700);
  };

  // 최종 기소 처리
  const handleFinalIndictment = () => {
    setIsAccuseModalOpen(false);

    if (accuseSuspect === 'park' && accuseEvidence === 'mac') {
      setGameResult('win');
      setResultMessage({
        title: '🏆 완벽한 검거 성공! (RANK S - 명예 수사관)',
        desc: '외주 개발자 박개발의 노트북 MAC 주소와 21시 22분 GitHub 백도어 커밋 푸시 로그를 들이밀자, 박개발이 완전히 무너지며 CCTV 루프 조작 및 관리자 키 유출을 자백했습니다! 하나은행 지하 VIP 금고의 보안 취약점을 완벽히 방어했습니다.',
        badge: '하나원픽 골드 마스터 수사관 표창'
      });
    } else {
      setGameResult('lose');
      let reason = '';
      if (accuseSuspect === 'kim') {
        reason = '김보안 팀장은 직무유기(사채 통화) 혐의는 인정되었으나, 금고 침납을 지시하거나 조작한 진범이 아니었습니다. 진짜 해커 박개발은 유유히 백도어 흔적을 지우고 달아났습니다.';
      } else if (accuseSuspect === 'choi') {
        reason = '최청소 여사는 VIP 카드를 습득한 점유이탈물횡령 혐의는 인정되었으나, 디지털 FIDO 암호화 금고를 뚫을 기술적 능력이 없었습니다. 법원에서 증거 불충분으로 기각되었습니다.';
      } else {
        reason = '박개발을 지목했으나 결정적 증거(MAC 주소 로그)를 제시하지 못해, 교묘한 법망을 피해 혐의를 벗어났습니다.';
      }
      setResultMessage({
        title: '❌ 기소 실패 및 사건 미궁 (RANK F)',
        desc: reason,
        badge: '수사 권한 일시 정지'
      });
    }
  };

  // 게임 재시작
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
        text: '🚨 [하나은행 본점] 지하 VIP 금고 침납 사건 - 심문실이 리셋되었습니다.',
        timestamp: getCurrentTime()
      }
    ]);
  };

  const currentSuspect = SUSPECTS[selectedSuspect];
  const currentHeartRate = heartRates[selectedSuspect];

  // 심박수 상태 컬러
  const getBpmColor = (bpm: number) => {
    if (bpm >= 135) return 'text-red-500 border-red-500/50 bg-red-950/30';
    if (bpm >= 110) return 'text-amber-400 border-amber-500/50 bg-amber-950/30';
    return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HANA ONE-PICK CUP
              </span>
              <h1 className="text-sm font-bold tracking-tight text-white">
                코드 레드: 하나은행 지하 금고를 열어라
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400">남은 심문 기회:</span>
            <span className={`text-sm font-black ${remainingTurns <= 3 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {remainingTurns} / 15
            </span>
          </div>

          <button
            onClick={() => setIsAccuseModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>⚖️</span>
            <span>진범 최종 기소</span>
          </button>
        </div>
      </header>

      {/* 2. 메인 바디 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 용의자 탭 & 증거 보관함 */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 overflow-y-auto">
          {/* 용의자 선택 탭 */}
          <div className="p-3 border-b border-slate-800">
            <h2 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>용의자 목록 (3인)</span>
              <span className="text-[10px] text-slate-500">실시간 감청 중</span>
            </h2>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(SUSPECTS) as SuspectId[]).map((id) => {
                const s = SUSPECTS[id];
                const isSelected = selectedSuspect === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedSuspect(id)}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-2xl mb-1">{s.avatar}</span>
                    <span className="text-xs font-bold text-slate-200">{s.name}</span>
                    <span className="text-[10px] text-slate-400">{s.role.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 현재 선택된 용의자 프로필 카드 */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span>{currentSuspect.avatar}</span>
                <span>{currentSuspect.name}</span>
                <span className="text-xs text-slate-400 font-normal">({currentSuspect.age}세)</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {currentSuspect.role}
              </span>
            </div>
            <div className="text-xs bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 space-y-1.5">
              <div>
                <span className="text-slate-500 block text-[10px]">주장하는 알리바이:</span>
                <p className="text-slate-300 italic">"{currentSuspect.alibi}"</p>
              </div>
            </div>
          </div>

          {/* 4대 증거 보관함 */}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📁</span>
                <span>현장 증거 보관함</span>
              </h3>
              {selectedEvidence && (
                <button
                  onClick={() => setSelectedEvidence(null)}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  선택 해제
                </button>
              )}
            </div>

            <div className="space-y-2 flex-1">
              {EVIDENCE_LIST.map((ev) => {
                const isChosen = selectedEvidence === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidence(isChosen ? null : ev.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChosen
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span>{ev.icon}</span>
                        <span>{ev.name}</span>
                      </span>
                      {isChosen && (
                        <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                          제시 준비
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{ev.desc}</p>
                  </div>
                );
              })}
            </div>

            {selectedEvidence && (
              <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center text-xs text-emerald-300 animate-pulse">
                질문 전송 시 선택한 증거를 함께 들이밉니다!
              </div>
            )}
          </div>
        </aside>

        {/* 우측 메인: 심문 모니터 & EKG 그래프 & 채팅 인터페이스 */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* 심문 모니터 헤더 (EKG 심박수 파형 & 상태창) */}
          <div className="h-28 border-b border-slate-800 bg-slate-900/40 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-inner">
                  {currentSuspect.avatar}
                </div>
                {currentHeartRate >= 130 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] text-white font-bold items-center justify-center">!</span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">{currentSuspect.name}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getBpmColor(currentHeartRate)}`}>
                    {currentHeartRate >= 130 ? '🔥 극심한 당황 (모순 노출)' : currentHeartRate >= 105 ? '⚠️ 긴장 상태' : '🟢 평온'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">실시간 바이오 피드백 센서 연결됨</p>
              </div>
            </div>

            {/* EKG 심박수 그래프 SVG */}
            <div className="flex items-center gap-6">
              <div className="w-56 h-16 bg-slate-950 rounded-xl border border-slate-800 px-3 py-1 flex flex-col justify-between overflow-hidden relative">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>EKG MONITOR</span>
                  <span className="font-mono text-emerald-400">PULSE: OK</span>
                </div>

                {/* SVG 심박수 파동 */}
                <svg className="w-full h-8 overflow-visible" viewBox="0 0 200 40">
                  <path
                    d={
                      currentHeartRate >= 130
                        ? "M 0 20 L 30 20 L 40 5 L 50 35 L 60 10 L 70 30 L 80 20 L 110 20 L 120 2 L 130 38 L 140 5 L 150 20 L 200 20"
                        : currentHeartRate >= 105
                        ? "M 0 20 L 40 20 L 50 10 L 60 30 L 70 15 L 80 20 L 130 20 L 140 8 L 150 32 L 160 20 L 200 20"
                        : "M 0 20 L 60 20 L 70 12 L 80 28 L 90 20 L 150 20 L 160 14 L 170 26 L 180 20 L 200 20"
                    }
                    fill="none"
                    stroke={currentHeartRate >= 130 ? '#ef4444' : currentHeartRate >= 105 ? '#f59e0b' : '#10b981'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>

                <div className="text-[9px] text-slate-600 text-right">LEAD II NORMAL</div>
              </div>

              {/* 심박수 수치 표시 */}
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center min-w-[90px] ${getBpmColor(currentHeartRate)}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider">HEART RATE</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono">{currentHeartRate}</span>
                  <span className="text-xs">BPM</span>
                </div>
              </div>
            </div>
          </div>

          {/* 대화 로그 영역 */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {chatLogs.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="max-w-xl text-center text-xs py-1.5 px-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {isUser ? '수사관' : SUSPECTS[msg.suspectId || selectedSuspect].name}
                    </span>
                    <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed border ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-br-none border-emerald-500 shadow-md shadow-emerald-600/10'
                        : msg.isContradiction
                        ? 'bg-red-950/60 text-red-100 rounded-bl-none border-red-500/80 shadow-lg shadow-red-950/50'
                        : 'bg-slate-900 text-slate-200 rounded-bl-none border-slate-800'
                    }`}
                  >
                    {msg.text}

                    {msg.isContradiction && (
                      <div className="mt-2 pt-2 border-t border-red-500/30 text-[10px] text-red-300 font-bold flex items-center gap-1">
                        <span>⚡</span>
                        <span>결정적 진술 모순 발생! 심박수가 급상승했습니다.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                <span className="animate-pulse">용의자가 답변을 망설이고 있습니다...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 질문 추천 칩 (빠른 질문) */}
          <div className="px-6 py-2 border-t border-slate-800/80 bg-slate-900/30 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">추천 심문:</span>
            {QUICK_QUESTIONS[selectedSuspect].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q, selectedEvidence)}
                disabled={remainingTurns <= 0 || isTyping}
                className="text-xs bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 px-3 py-1 rounded-full border border-slate-700 shrink-0 transition-all active:scale-95 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* 질문 입력 컨트롤 */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion(inputText, selectedEvidence);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedEvidence
                      ? `[${EVIDENCE_LIST.find(e => e.id === selectedEvidence)?.name}] 증거와 함께 물어볼 내용을 입력하세요...`
                      : `${currentSuspect.name} 용의자에게 추궁할 질문을 직접 입력하세요...`
                  }
                  disabled={remainingTurns <= 0 || isTyping}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || remainingTurns <= 0 || isTyping}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
              >
                심문 전송
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* 3. 진범 지목 모달 */}
      {isAccuseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚖️</span>
                <span>최종 진범 지목 및 검찰 기소</span>
              </h3>
              <button
                onClick={() => setIsAccuseModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* 용의자 1인 선택 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  1. 금고를 침납한 진범으로 누구를 지목하시겠습니까?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SUSPECTS) as SuspectId[]).map((id) => {
                    const s = SUSPECTS[id];
                    const isPicked = accuseSuspect === id;
                    return (
                      <div
                        key={id}
                        onClick={() => setAccuseSuspect(id)}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                          isPicked
                            ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500'
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-2xl mb-1">{s.avatar}</div>
                        <div className="text-xs font-bold text-slate-200">{s.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 결정적 증거 1개 선택 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  2. 법원에 제출할 결정적인 스모킹 건(증거)을 선택하십시오:
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {EVIDENCE_LIST.map((ev) => {
                    const isPicked = accuseEvidence === ev.id;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setAccuseEvidence(ev.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                          isPicked
                            ? 'bg-red-950/40 border-red-500 text-red-200'
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <span>{ev.icon}</span>
                        <span className="font-semibold">{ev.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsAccuseModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                수사 계속하기
              </button>
              <button
                onClick={handleFinalIndictment}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30"
              >
                최종 기소 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 멀티 엔딩 결과 모달 */}
      {gameResult && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="text-5xl mb-3">
              {gameResult === 'win' ? '🎖️' : '🚨'}
            </div>

            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black mb-3 border ${
              gameResult === 'win'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {resultMessage.badge}
            </span>

            <h2 className="text-xl font-black text-white mb-3">
              {resultMessage.title}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left mb-6">
              {resultMessage.desc}
            </p>

            <button
              onClick={handleResetGame}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              처음부터 다시 수사하기 (재도전)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
