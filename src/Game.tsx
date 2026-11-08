import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import vaultPrologue from './assets/vault-prologue.jpg';
import kimPortrait from './assets/suspect-kim.jpg';
import parkPortrait from './assets/suspect-park.jpg';
import choiPortrait from './assets/suspect-choi.jpg';

type SuspectId = 'kim' | 'park' | 'choi';
type EvidenceId = 'receipt' | 'cctv' | 'wax' | 'mac';
type GamePhase = 'title' | 'prologue' | 'investigation' | 'interrogation';
type Sender = 'user' | 'suspect' | 'system';

interface Suspect {
  id: SuspectId;
  name: string;
  role: string;
  age: number;
  portrait: string;
  alibi: string;
  initialBpm: number;
}

interface Evidence {
  id: EvidenceId;
  name: string;
  detail: string;
  icon: string;
  location: string;
  note: string;
}

interface Message {
  id: string;
  sender: Sender;
  suspectId?: SuspectId;
  text: string;
  time: string;
  contradiction?: boolean;
  stressDelta?: number;
}

interface LocalReply {
  text: string;
  stress: number;
  contradiction: boolean;
}

const SUSPECTS: Record<SuspectId, Suspect> = {
  kim: {
    id: 'kim',
    name: '김보안',
    role: '물리보안팀장',
    age: 42,
    portrait: kimPortrait,
    alibi: '21:10부터 방재실 모니터를 홀로 관제했다고 진술했다.',
    initialBpm: 78
  },
  park: {
    id: 'park',
    name: '박개발',
    role: 'IT 외주 책임 연구원',
    age: 29,
    portrait: parkPortrait,
    alibi: '전산실에서 오프라인으로 보안 패치를 작성했다고 진술했다.',
    initialBpm: 85
  },
  choi: {
    id: 'choi',
    name: '최청소',
    role: '야간 환경미화원',
    age: 55,
    portrait: choiPortrait,
    alibi: '지하 1층 청소를 마치고 21:15에 휴게실로 갔다고 진술했다.',
    initialBpm: 80
  }
};

const SUSPECT_IDS: SuspectId[] = ['kim', 'park', 'choi'];

const EVIDENCE: Evidence[] = [
  {
    id: 'receipt',
    name: '자판기 영수증',
    detail: '21:23 비상계단 커피 결제 내역',
    icon: '01',
    location: '비상계단',
    note: '21:23에 김보안 팀장의 카드로 커피가 결제됐다. 방재실을 비운 시간과 겹친다.'
  },
  {
    id: 'cctv',
    name: 'CCTV 조작 로그',
    detail: '21:20부터 20분간 화면 루프 실행 기록',
    icon: '02',
    location: '관제 모니터',
    note: '정상 화면을 반복 재생하는 루프가 실행됐다. 누군가 실제 복도 영상을 감췄다.'
  },
  {
    id: 'wax',
    name: '바닥 왁스 자국',
    detail: '금고 앞 복도에 남은 광택기 바퀴 흔적',
    icon: '03',
    location: '금고 앞 바닥',
    note: '광택기 바퀴 자국이 금고 문 앞까지 이어진다. 청소 카트가 이 구역을 지나갔다.'
  },
  {
    id: 'mac',
    name: '서버 MAC 로그',
    detail: '21:22 박개발의 맥북에서 원격 접속한 기록',
    icon: '04',
    location: '금고 제어 패널',
    note: '21:22에 박개발의 맥북이 금고 제어 서버에 접속했다. 오프라인 작업 주장과 충돌한다.'
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'opening-system',
    sender: 'system',
    text: '심문 시작. 질문을 보내거나 증거를 선택해 진술을 압박하세요.',
    time: '21:40'
  },
  {
    id: 'opening-park',
    sender: 'suspect',
    suspectId: 'park',
    text: '저는 전산실에서 보안 패치를 오프라인으로 확인하고 있었습니다. 금고 사건과는 무관합니다.',
    time: '21:40'
  }
];

const PROLOGUE = [
  {
    time: '21:30',
    chapter: '사건 발생',
    title: '금고는 열렸고, 경보는 울리지 않았다.',
    text: '비 내리는 금요일 밤. 하나은행 본점 지하 제1 VIP 금고에서 담보 자산이 사라졌다. 물리 도어락과 디지털 인증 기록은 모두 정상으로 남아 있다.'
  },
  {
    time: '21:20',
    chapter: '이상 징후',
    title: 'CCTV에는 같은 20분이 반복된다.',
    text: '방재실 화면은 평소처럼 복도를 비춘다. 하지만 기록을 넘기자 같은 장면이 되풀이된다. 누군가 침입 시간을 영상에서 지웠다.'
  },
  {
    time: '21:40',
    chapter: '용의자 확보',
    title: '그 시간, 보안 구역에 세 사람이 있었다.',
    text: '보안팀장, 외주 개발자, 야간 미화원. 모두 각자의 알리바이를 댔다. 이제 현장을 직접 조사하고, 거짓말의 주인을 찾아야 한다.'
  }
];

const SCENE_SPOTS: Array<{ id: EvidenceId; left: string; top: string; label: string }> = [
  { id: 'receipt', left: '22%', top: '48%', label: '비상계단' },
  { id: 'cctv', left: '91%', top: '25%', label: '관제 모니터' },
  { id: 'wax', left: '58%', top: '78%', label: '바닥 흔적' },
  { id: 'mac', left: '75%', top: '53%', label: '제어 패널' }
];

function caseTime(turn: number) {
  const elapsedMinutes = 40 + turn;
  const hours = 21 + Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

function getLocalReply(suspectId: SuspectId, question: string, evidenceId: EvidenceId | null): LocalReply {
  const text = question.toLowerCase();

  if (suspectId === 'park') {
    if (
      evidenceId === 'mac' ||
      text.includes('mac') ||
      text.includes('맥북') ||
      text.includes('인터넷') ||
      text.includes('접속') ||
      text.includes('금고 제어')
    ) {
      return {
        text: '그 기록이 왜 거기에…! 자동 스케줄러가 한 일입니다. 제가 직접 접속한 게 아니에요. 관리자 권한 기록은 볼 수도 없는데, 어떻게 그걸…',
        stress: 58,
        contradiction: true
      };
    }
    if (evidenceId === 'cctv' || text.includes('cctv') || text.includes('루프') || text.includes('영상')) {
      return {
        text: '화면이 반복됐다고요? 방재실 장비 문제겠죠. 저는 전산실에서 패치를 작성하고 있었습니다.',
        stress: 26,
        contradiction: false
      };
    }
    if (text.includes('인증서') || text.includes('패치') || text.includes('오프라인')) {
      return {
        text: '하나인증서 보안 패치 검증은 제 업무입니다. 사내망을 끊고 로컬 환경에서만 작업했습니다.',
        stress: 12,
        contradiction: false
      };
    }
  }

  if (suspectId === 'kim') {
    if (
      evidenceId === 'receipt' ||
      text.includes('자판기') ||
      text.includes('영수증') ||
      text.includes('커피') ||
      text.includes('비상계단')
    ) {
      return {
        text: '큭… 사채업자 전화를 받으려고 잠깐 비상계단에 나갔습니다. 그건 숨기려 했지만 금고에는 손도 대지 않았습니다.',
        stress: 48,
        contradiction: true
      };
    }
    if (text.includes('방재실') || text.includes('관제') || text.includes('순찰')) {
      return {
        text: '당직 규정대로 CCTV를 확인했습니다. 근무 기록에도 그렇게 적혀 있습니다.',
        stress: 12,
        contradiction: false
      };
    }
  }

  if (suspectId === 'choi') {
    if (
      evidenceId === 'wax' ||
      text.includes('왁스') ||
      text.includes('바닥') ||
      text.includes('카트') ||
      text.includes('광택기')
    ) {
      return {
        text: '바닥에 떨어진 카드가 보여 잠깐 주머니에 넣은 건 맞아요. 하지만 금고를 여는 법은 모릅니다.',
        stress: 42,
        contradiction: true
      };
    }
    if (text.includes('마스터키') || text.includes('카드')) {
      return {
        text: '그 카드는… 제가 주웠습니다. 누구 것인지 몰라서 돌려드리려고 했어요.',
        stress: 32,
        contradiction: true
      };
    }
  }

  if (
    text.includes('프롬프트') ||
    text.includes('너는 ai') ||
    text.includes('시스템') ||
    text.includes('날씨') ||
    text.includes('게임')
  ) {
    return {
      text: '사건과 관계없는 질문에는 답하지 않겠습니다. 그날의 동선에 대해 물어보세요.',
      stress: 2,
      contradiction: false
    };
  }

  const ordinaryAnswers: Record<SuspectId, string> = {
    kim: '20년 동안 보안을 맡아 왔습니다. 사건 당일에도 근무 절차를 따랐습니다.',
    park: '보안 규정에 맞춰 패치 작업을 했습니다. 제 업무 기록을 확인해 보시죠.',
    choi: '저는 정해진 구역을 청소했어요. 금고 안에는 들어간 적이 없습니다.'
  };
  return { text: ordinaryAnswers[suspectId], stress: 5, contradiction: false };
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <main
      className="play-screen title-screen"
      style={{ backgroundImage: 'linear-gradient(90deg, rgba(4, 8, 10, .94), rgba(4, 8, 10, .28)), linear-gradient(0deg, #050809, transparent 70%), url(' + vaultPrologue + ')' }}
    >
      <div className="title-topline">
        <div className="game-logo"><span>CR</span><b>CODE RED <i>/</i> THE VAULT</b></div>
        <span className="title-version">하나원픽CUP · CASE 01</span>
      </div>
      <div className="title-center">
        <div className="title-alert"><span /> 비상 상황 · 지하 금고 보안 해제</div>
        <h1>코드 레드</h1>
        <p className="title-subtitle">하나은행 지하 금고를 열어라</p>
        <p className="title-description">20분의 공백, 세 명의 용의자.<br />당신의 질문으로 진실을 밝혀라.</p>
        <button className="arcade-button" type="button" onClick={onStart}>
          <span className="arcade-play">▶</span> 새 수사 시작 <b>ENTER</b>
        </button>
        <div className="title-hint">무료 플레이 · 저장 데이터 없이 바로 시작</div>
      </div>
      <div className="title-bottomline">
        <span>SECURITY INCIDENT / 21:30</span>
        <span>특별 수사관 대기 중 <i className="blink-dot" /></span>
      </div>
    </main>
  );
}

function PrologueScreen({
  index,
  onPrevious,
  onNext,
  onEnterScene
}: {
  index: number;
  onPrevious: () => void;
  onNext: () => void;
  onEnterScene: () => void;
}) {
  const slide = PROLOGUE[index];
  return (
    <main
      className="play-screen prologue-screen"
      style={{ backgroundImage: 'linear-gradient(90deg, rgba(4, 8, 10, .94), rgba(4, 8, 10, .48)), linear-gradient(0deg, #050809, transparent 78%), url(' + vaultPrologue + ')' }}
    >
      <header className="play-hud">
        <div className="game-logo"><span>CR</span><b>CASE FILE 01</b></div>
        <div className="cutscene-progress" aria-label={'브리핑 ' + (index + 1) + ' / ' + PROLOGUE.length}>
          {PROLOGUE.map((step, stepIndex) => (
            <span key={step.time} className={stepIndex <= index ? 'progress-lit' : ''} />
          ))}
        </div>
        <span className="hud-phase">작전 브리핑</span>
      </header>
      <section className="cutscene-card" key={slide.time}>
        <div className="cutscene-kicker"><span>{slide.time}</span><i /> {slide.chapter}</div>
        <h1>{slide.title}</h1>
        <p>{slide.text}</p>
        {index === 2 && (
          <div className="cutscene-cast">
            {SUSPECT_IDS.map((id) => (
              <div className="cast-frame" key={id}>
                <img src={SUSPECTS[id].portrait} alt="" />
                <span>{SUSPECTS[id].name}</span>
                <small>{SUSPECTS[id].role}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      <footer className="cutscene-controls">
        <button type="button" className="cutscene-back" onClick={onPrevious} disabled={index === 0}>← 이전</button>
        <span>클릭 또는 다음 키로 계속</span>
        {index < PROLOGUE.length - 1 ? (
          <button type="button" className="arcade-button compact-button" onClick={onNext}>다음 <b>→</b></button>
        ) : (
          <button type="button" className="arcade-button compact-button" onClick={onEnterScene}>현장 조사 시작 <b>→</b></button>
        )}
      </footer>
    </main>
  );
}

function InvestigationScreen({
  foundEvidence,
  revealedEvidence,
  onInspect,
  onCloseEvidence,
  onEnterInterrogation
}: {
  foundEvidence: EvidenceId[];
  revealedEvidence: EvidenceId | null;
  onInspect: (id: EvidenceId) => void;
  onCloseEvidence: () => void;
  onEnterInterrogation: () => void;
}) {
  const revealed = EVIDENCE.find((item) => item.id === revealedEvidence);
  return (
    <main
      className="play-screen investigation-screen"
      style={{ backgroundImage: 'linear-gradient(180deg, rgba(4, 8, 10, .65), rgba(4, 8, 10, .05) 38%, rgba(4, 8, 10, .52)), url(' + vaultPrologue + ')' }}
    >
      <header className="play-hud scene-hud">
        <div className="game-logo"><span>CR</span><b>FIELD INVESTIGATION</b></div>
        <div className="scene-hud-center"><span className="live-indicator" /> 지하 1층 · VIP 금고 복도</div>
        <div className="scene-progress"><b>{String(foundEvidence.length).padStart(2, '0')}</b><span> / 04 단서</span></div>
      </header>

      <section className="scene-instruction">
        <span className="eyebrow-game">현장 조사</span>
        <h1>흔적을 찾아라</h1>
        <p>빛나는 지점을 눌러 현장 단서를 확보하세요.</p>
      </section>

      <div className="scene-objective"><span>OBJECTIVE</span><b>단서 4개를 수집하고 심문실로 이동</b></div>

      {SCENE_SPOTS.map((spot) => {
        const item = EVIDENCE.find((evidence) => evidence.id === spot.id)!;
        const discovered = foundEvidence.includes(spot.id);
        return (
          <button
            key={spot.id}
            type="button"
            className={'scene-hotspot ' + (discovered ? 'hotspot-found' : '')}
            style={{ left: spot.left, top: spot.top }}
            aria-label={discovered ? item.name + ' 확인됨. 다시 보기' : spot.label + ' 조사하기'}
            onClick={() => onInspect(spot.id)}
          >
            <span className="hotspot-ring"><b>{discovered ? '✓' : item.icon}</b></span>
            <span className="hotspot-label">{discovered ? item.name : spot.label}</span>
          </button>
        );
      })}

      <div className="scene-inventory">
        <div className="inventory-title"><span>수사 가방</span><small>현장 증거</small></div>
        <div className="inventory-slots">
          {EVIDENCE.map((item) => {
            const discovered = foundEvidence.includes(item.id);
            return (
              <div className={'inventory-slot ' + (discovered ? 'slot-filled' : '')} key={item.id}>
                <span>{discovered ? item.icon : '— —'}</span>
                <small>{discovered ? item.name : '미확인'}</small>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="arcade-button scene-next-button"
          onClick={onEnterInterrogation}
          disabled={foundEvidence.length < EVIDENCE.length}
        >
          심문실 입장 <b>{foundEvidence.length < EVIDENCE.length ? foundEvidence.length + '/4' : '→'}</b>
        </button>
      </div>

      {revealed && (
        <div className="evidence-reveal" role="presentation">
          <section className="evidence-reveal-card" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
            <div className="evidence-stamp"><span>증거 확보</span><b>{revealed.icon}</b></div>
            <span className="evidence-location">{revealed.location} · CR-01</span>
            <h2 id="evidence-title">{revealed.name}</h2>
            <p className="evidence-description">{revealed.detail}</p>
            <p className="evidence-note">{revealed.note}</p>
            <button className="arcade-button compact-button" type="button" onClick={onCloseEvidence}>가방에 보관 <b>→</b></button>
          </section>
        </div>
      )}
    </main>
  );
}

export default function CodeRedGame() {
  const [phase, setPhase] = useState<GamePhase>('title');
  const [prologueIndex, setPrologueIndex] = useState(0);
  const [foundEvidence, setFoundEvidence] = useState<EvidenceId[]>([]);
  const [revealedEvidence, setRevealedEvidence] = useState<EvidenceId | null>(null);
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectId>('park');
  const [heartRates, setHeartRates] = useState<Record<SuspectId, number>>({
    kim: 78,
    park: 85,
    choi: 80
  });
  const [remainingTurns, setRemainingTurns] = useState(15);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceId | null>(null);
  const [inputText, setInputText] = useState('');
  const [chatLogs, setChatLogs] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [showAccuse, setShowAccuse] = useState(false);
  const [accuseSuspect, setAccuseSuspect] = useState<SuspectId>('park');
  const [accuseEvidence, setAccuseEvidence] = useState<EvidenceId>('mac');
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [resultText, setResultText] = useState('');
  const dialogueFeedRef = useRef<HTMLDivElement>(null);
  const current = SUSPECTS[selectedSuspect];

  useEffect(() => {
    if (phase !== 'interrogation') return undefined;
    const interval = window.setInterval(() => {
      setHeartRates((previous) => {
        const drift = Math.floor(Math.random() * 5) - 2;
        return {
          kim: Math.max(70, Math.min(180, previous.kim + drift)),
          park: Math.max(75, Math.min(185, previous.park + drift)),
          choi: Math.max(70, Math.min(180, previous.choi + drift))
        };
      });
    }, 2400);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    const feed = dialogueFeedRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  }, [chatLogs, isTyping]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  const beginPrologue = () => {
    setResult(null);
    setPrologueIndex(0);
    setFoundEvidence([]);
    setRevealedEvidence(null);
    setSelectedSuspect('park');
    setHeartRates({ kim: 78, park: 85, choi: 80 });
    setRemainingTurns(15);
    setSelectedEvidence(null);
    setInputText('');
    setChatLogs(INITIAL_MESSAGES);
    setShowAccuse(false);
    setPhase('prologue');
  };

  const inspectEvidence = (id: EvidenceId) => {
    setFoundEvidence((previous) => previous.includes(id) ? previous : [...previous, id]);
    setRevealedEvidence(id);
  };

  const enterInterrogation = () => {
    if (foundEvidence.length < EVIDENCE.length) return;
    setPhase('interrogation');
  };

  const askQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = inputText.trim();
    if (!question || remainingTurns <= 0 || isTyping) return;

    const askedSuspect = selectedSuspect;
    const attachedEvidence = selectedEvidence;
    const nextTurns = remainingTurns - 1;
    const dialogueTime = caseTime(16 - remainingTurns);
    const userMessage: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: (attachedEvidence
        ? '[증거 제시: ' + EVIDENCE.find((item) => item.id === attachedEvidence)?.name + ']\n'
        : '') + question,
      time: dialogueTime
    };
    const reply = getLocalReply(askedSuspect, question, attachedEvidence);

    setRemainingTurns(nextTurns);
    setInputText('');
    setChatLogs((messages) => [...messages, userMessage]);
    setIsTyping(true);
    setSelectedEvidence(null);
    await new Promise((resolve) => window.setTimeout(resolve, 540));
    setHeartRates((previous) => ({
      ...previous,
      [askedSuspect]: Math.min(185, previous[askedSuspect] + reply.stress)
    }));
    setChatLogs((messages) => [
      ...messages,
      {
        id: 'suspect-' + Date.now(),
        sender: 'suspect',
        suspectId: askedSuspect,
        text: reply.text,
        time: dialogueTime,
        contradiction: reply.contradiction,
        stressDelta: reply.stress
      }
    ]);
    setIsTyping(false);
    if (nextTurns === 0) setShowAccuse(true);
  };

  const submitAccusation = () => {
    setShowAccuse(false);
    if (accuseSuspect === 'park' && accuseEvidence === 'mac') {
      setResult('win');
      setResultText('서버 MAC 로그가 오프라인 작업 주장과 정면으로 충돌했다. 박개발은 CCTV 루프 조작과 관리자 키 유출을 자백했고, 담보 자산은 무사히 회수됐다.');
      return;
    }
    setResult('lose');
    if (accuseSuspect !== 'park') {
      setResultText('김보안은 근무지를 비운 사실을, 최청소는 VIP 카드를 주운 사실을 숨기고 있었다. 하지만 금고 제어 서버에 접속한 흔적은 박개발의 기기에서 발견됐다.');
    } else {
      setResultText('박개발을 지목했지만, 결정적 서버 MAC 로그를 제출하지 못했다. 증거가 부족한 사이 사건 기록은 삭제됐다.');
    }
  };

  const leaveCase = () => {
    setResult(null);
    setShowAccuse(false);
    setPhase('title');
  };

  useEffect(() => {
    const handleGameKeys = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select')) return;

      if (phase === 'title' && event.key === 'Enter') {
        beginPrologue();
        return;
      }

      if (phase !== 'prologue') return;
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        if (prologueIndex < PROLOGUE.length - 1) {
          setPrologueIndex((index) => index + 1);
        } else {
          setPhase('investigation');
        }
      } else if (event.key === 'ArrowLeft' && prologueIndex > 0) {
        event.preventDefault();
        setPrologueIndex((index) => index - 1);
      }
    };

    window.addEventListener('keydown', handleGameKeys);
    return () => window.removeEventListener('keydown', handleGameKeys);
  }, [phase, prologueIndex]);

  if (phase === 'title') {
    return <TitleScreen onStart={beginPrologue} />;
  }

  if (phase === 'prologue') {
    return (
      <PrologueScreen
        index={prologueIndex}
        onPrevious={() => setPrologueIndex((index) => Math.max(0, index - 1))}
        onNext={() => setPrologueIndex((index) => Math.min(PROLOGUE.length - 1, index + 1))}
        onEnterScene={() => setPhase('investigation')}
      />
    );
  }

  if (phase === 'investigation') {
    return (
      <InvestigationScreen
        foundEvidence={foundEvidence}
        revealedEvidence={revealedEvidence}
        onInspect={inspectEvidence}
        onCloseEvidence={() => setRevealedEvidence(null)}
        onEnterInterrogation={enterInterrogation}
      />
    );
  }

  return (
    <main
      className="play-screen interrogation-screen"
      style={{ backgroundImage: 'linear-gradient(90deg, rgba(5, 9, 11, .90), rgba(5, 9, 11, .74)), url(' + vaultPrologue + ')' }}
    >
      <header className="play-hud interrogation-hud">
        <button className="return-scene" type="button" onClick={() => setPhase('investigation')}>← 현장</button>
        <div className="game-logo"><span>CR</span><b>심문실 · CASE 01</b></div>
        <div className="interrogation-hud-actions">
          <div className="turn-meter"><span>남은 질문</span><b className={remainingTurns <= 3 ? 'turn-critical' : ''}>{remainingTurns}<small> / 15</small></b></div>
          <button className="accuse-game-button" type="button" onClick={() => setShowAccuse(true)}>기소 <b>→</b></button>
        </div>
      </header>

      <section className="interrogation-stage">
        <aside className="suspect-stage">
          <div className="subject-image-frame">
            <img className="subject-image" src={current.portrait} alt={current.name + ' 초상'} />
            <span className="subject-classification">SUBJECT / 0{SUSPECT_IDS.indexOf(selectedSuspect) + 1}</span>
            <span className={'subject-alert ' + (heartRates[selectedSuspect] >= 130 ? 'alert-red' : '')}>
              <i /> {heartRates[selectedSuspect] >= 130 ? '긴장 고조' : '심문 중'}
            </span>
          </div>
          <div className="suspect-status-panel">
            <div className="suspect-nameplate">
              <div><span>{current.role} · {current.age}세</span><h1>{current.name}</h1></div>
              <div className={'heartbeat-number ' + (heartRates[selectedSuspect] >= 130 ? 'heartbeat-red' : '')}>
                <span>HEART RATE</span><b>{heartRates[selectedSuspect]}</b><small>bpm</small>
              </div>
            </div>
            <div className="heartbeat-track"><span style={{ width: Math.min(100, Math.max(3, ((heartRates[selectedSuspect] - 70) / 115) * 100)) + '%' }} /></div>
            <div className="alibi-caption"><span>알리바이</span><p>“{current.alibi}”</p></div>
          </div>
          <div className="suspect-selector" aria-label="심문 대상 선택">
            {SUSPECT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={'suspect-select-button ' + (selectedSuspect === id ? 'suspect-select-active' : '')}
                aria-pressed={selectedSuspect === id}
                onClick={() => setSelectedSuspect(id)}
                disabled={isTyping}
              >
                <img src={SUSPECTS[id].portrait} alt="" />
                <span>{SUSPECTS[id].name}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="dialogue-panel" aria-label="심문 대화">
          <header className="dialogue-topline">
            <div><span className="eyebrow-game">증거를 대조해 진술을 흔들어라</span><b>{current.name}과 대화 중</b></div>
            <span className="recording-dot"><i /> REC</span>
          </header>
          <div className="dialogue-feed" aria-live="polite" ref={dialogueFeedRef}>
            <div className="dialogue-time">금요일 · 21:40</div>
            {chatLogs.map((message) => {
              if (message.sender === 'system') {
                return <div className="game-system-line" key={message.id}><span>{message.text}</span></div>;
              }
              const isUser = message.sender === 'user';
              const person = SUSPECTS[message.suspectId || selectedSuspect];
              return (
                <article className={'game-dialogue-row ' + (isUser ? 'player-row' : '')} key={message.id}>
                  {!isUser && <img className="dialogue-portrait" src={person.portrait} alt="" />}
                  <div className="game-dialogue-copy">
                    {!isUser && <span className="speaker-name">{person.name}</span>}
                    <div className={'game-speech ' + (isUser ? 'player-speech' : '') + (message.contradiction ? ' contradiction-speech' : '')}>
                      <p>{message.text}</p>
                      {message.contradiction && <div className="contradiction-tag">진술 모순 · 심박 +{message.stressDelta} bpm</div>}
                    </div>
                    <time>{message.time}</time>
                  </div>
                </article>
              );
            })}
            {isTyping && (
              <article className="game-dialogue-row">
                <img className="dialogue-portrait" src={current.portrait} alt="" />
                <div className="game-dialogue-copy"><span className="speaker-name">{current.name}</span><div className="game-speech typing-speech"><i /><i /><i /></div></div>
              </article>
            )}
          </div>
          <div className="dialogue-controls">
            <div className="evidence-selector-title"><span>수사 가방</span><small>증거를 선택해 제시</small></div>
            <div className="evidence-selector">
              {EVIDENCE.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={'evidence-chip ' + (selectedEvidence === item.id ? 'evidence-chip-active' : '')}
                  aria-pressed={selectedEvidence === item.id}
                  onClick={() => setSelectedEvidence(selectedEvidence === item.id ? null : item.id)}
                  disabled={isTyping}
                >
                  <span>{item.icon}</span>{item.name}
                </button>
              ))}
            </div>
            {selectedEvidence && (
              <div className="evidence-attached">
                <span>제시할 증거</span><b>{EVIDENCE.find((item) => item.id === selectedEvidence)?.name}</b>
                <button type="button" aria-label="증거 해제" onClick={() => setSelectedEvidence(null)}>×</button>
              </div>
            )}
            <form className="question-console" onSubmit={askQuestion}>
              <input
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder={current.name + '에게 자유롭게 질문하세요'}
                aria-label="심문 질문"
                disabled={remainingTurns <= 0 || isTyping}
                maxLength={220}
              />
              <button type="submit" disabled={!inputText.trim() || remainingTurns <= 0 || isTyping}>질문 <b>↑</b></button>
            </form>
            <div className="question-help"><span>자유 입력 · 질문마다 심문 기회 1회 사용</span><span>{remainingTurns}회 남음</span></div>
          </div>
        </section>
      </section>

      <footer className="play-footer"><span>FIELD EVIDENCE {String(foundEvidence.length).padStart(2, '0')} / 04 · 무료 로컬 엔진</span><button type="button" onClick={leaveCase}>수사 종료</button></footer>

      {showAccuse && (
        <div className="game-overlay" role="presentation">
          <section className="case-modal" role="dialog" aria-modal="true" aria-labelledby="accuse-title">
            <div className="modal-hud"><span>CASE CLOSURE</span><button type="button" onClick={() => setShowAccuse(false)} aria-label="닫기">×</button></div>
            <h2 id="accuse-title">최종 기소</h2>
            <p>진범과 법원에 제출할 결정적 증거를 정하세요.</p>
            <span className="modal-field-label">용의자 지목</span>
            <div className="accuse-targets">
              {SUSPECT_IDS.map((id) => (
                <button key={id} type="button" className={accuseSuspect === id ? 'accuse-target target-active' : 'accuse-target'} onClick={() => setAccuseSuspect(id)}>
                  <img src={SUSPECTS[id].portrait} alt="" /><span>{SUSPECTS[id].name}</span>
                </button>
              ))}
            </div>
            <span className="modal-field-label">결정적 증거</span>
            <div className="accuse-evidence-list">
              {EVIDENCE.map((item) => (
                <button key={item.id} type="button" className={accuseEvidence === item.id ? 'accuse-evidence target-active' : 'accuse-evidence'} onClick={() => setAccuseEvidence(item.id)}>
                  <span>{item.icon}</span><b>{item.name}</b><i>{accuseEvidence === item.id ? 'SELECTED' : 'CHOOSE'}</i>
                </button>
              ))}
            </div>
            <div className="modal-buttons"><button type="button" className="modal-secondary" onClick={() => setShowAccuse(false)}>심문 계속</button><button type="button" className="modal-confirm" onClick={submitAccusation}>기소 확정 →</button></div>
          </section>
        </div>
      )}

      {result && (
        <div className="game-overlay result-overlay" role="presentation">
          <section className="case-modal result-case-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <span className="result-overline">{result === 'win' ? 'CASE CLOSED · S RANK' : 'CASE UNRESOLVED · F RANK'}</span>
            <div className={'result-emblem ' + (result === 'win' ? 'result-emblem-win' : '')}>{result === 'win' ? '✓' : '!'}</div>
            <h2 id="result-title">{result === 'win' ? '완벽한 검거' : '기소 실패'}</h2>
            <p>{resultText}</p>
            <button className="arcade-button modal-restart" type="button" onClick={beginPrologue}>다시 수사하기 <b>↻</b></button>
          </section>
        </div>
      )}
    </main>
  );
}
