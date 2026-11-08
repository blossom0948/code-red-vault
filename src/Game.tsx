import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import vaultPrologue from './assets/vault-prologue.jpg';
import kimPortrait from './assets/suspect-kim.jpg';
import parkPortrait from './assets/suspect-park.jpg';
import choiPortrait from './assets/suspect-choi.jpg';

type SuspectId = 'kim' | 'park' | 'choi';
type EvidenceId = 'receipt' | 'cctv' | 'wax' | 'mac';
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
    icon: '01'
  },
  {
    id: 'cctv',
    name: 'CCTV 조작 로그',
    detail: '21:20부터 20분간 화면 루프 실행 기록',
    icon: '02'
  },
  {
    id: 'wax',
    name: '바닥 왁스 자국',
    detail: '금고 앞 복도에 남은 광택기 바퀴 흔적',
    icon: '03'
  },
  {
    id: 'mac',
    name: '서버 MAC 로그',
    detail: '21:22 박개발의 맥북에서 원격 접속한 기록',
    icon: '04'
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'opening-system',
    sender: 'system',
    text: '특별 심문을 시작합니다. 남은 질문은 15회입니다.',
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

function currentTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
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
        text: '그 로그가 왜 거기에…! 자동 스케줄러가 한 일입니다. 제가 직접 접속한 게 아니에요. 관리자 권한 기록은 볼 수도 없는데, 어떻게 그걸…',
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

function InitialBriefing({ onStart }: { onStart: () => void }) {
  return (
    <main className="intro-page">
      <section
        className="intro-hero"
        style={{ backgroundImage: 'linear-gradient(90deg, rgba(6, 10, 13, .96) 0%, rgba(6, 10, 13, .72) 48%, rgba(6, 10, 13, .12) 100%), linear-gradient(0deg, #080d10 0%, transparent 58%), url(' + vaultPrologue + ')' }}
      >
        <div className="intro-topline">
          <div className="brand-lockup">
            <span className="brand-symbol">CR</span>
            <span>CODE RED <i>/</i> THE VAULT</span>
          </div>
          <span className="case-number">CASE FILE 01 · 기밀</span>
        </div>
        <div className="intro-copy">
          <span className="eyebrow"><span className="live-dot" /> 하나은행 본점 · 지하 1층</span>
          <h1>코드 레드:<br /><em>하나은행 지하 금고를 열어라</em></h1>
          <p className="intro-lede">비는 그쳤지만, CCTV 기록은 멈춰 있었다.</p>
          <p className="intro-summary">
            금요일 밤 9시 30분. 경보 한 번 울리지 않은 금고에서 담보 자산이 사라졌다.
            금고는 물리 키와 디지털 인증을 모두 통과했다. 그 순간 보안 구역 안에 있던 세 사람은
            서로 다른 이야기를 한다.
          </p>
          <div className="intro-tags">
            <span>심문 추리 어드벤처</span>
            <span>약 5–10분</span>
            <span>비용 없이 플레이</span>
          </div>
        </div>
        <div className="hero-caption"><span>21:30</span> 제1 VIP 금고 · 출입 기록 이상 감지</div>
      </section>

      <section className="briefing-content">
        <div className="briefing-heading">
          <span className="eyebrow">사건 브리핑</span>
          <h2>20분의 공백, 세 개의 알리바이.</h2>
          <p>기록을 따라가면, 누군가의 말이 어긋나기 시작한다.</p>
        </div>

        <div className="timeline">
          <article className="timeline-event">
            <span className="timeline-time">21:20</span>
            <div><b>CCTV가 같은 장면을 반복한다</b><p>방재실에는 정상 영상이 재생되지만, 실제 기록은 남지 않았다.</p></div>
          </article>
          <article className="timeline-event">
            <span className="timeline-time">21:22</span>
            <div><b>금고 제어 서버에 외부 접속 흔적</b><p>오프라인 작업을 했다는 개발자의 기기 정보가 로그에 남았다.</p></div>
          </article>
          <article className="timeline-event">
            <span className="timeline-time">21:30</span>
            <div><b>자산이 사라지고도 경보는 울리지 않았다</b><p>물리 출입과 인증 기록이 모두 정상처럼 보이도록 조작됐다.</p></div>
          </article>
        </div>

        <div className="suspects-heading">
          <div><span className="eyebrow">보안 구역에 있던 사람들</span><h2>세 명의 용의자</h2></div>
          <span className="suspect-count">용의자 03명</span>
        </div>
        <div className="intro-suspects">
          {SUSPECT_IDS.map((id, index) => {
            const suspect = SUSPECTS[id];
            const descriptions: Record<SuspectId, string> = {
              kim: 'CCTV 관제실을 지킨 보안 책임자',
              park: '하나인증서 보안 패치를 맡은 개발자',
              choi: '지하 1층을 청소한 야간 근무자'
            };
            return (
              <article className="intro-suspect" key={id}>
                <div className="intro-suspect-image">
                  <img src={suspect.portrait} alt={suspect.name + ' 용의자 초상'} />
                  <span>0{index + 1}</span>
                </div>
                <div className="intro-suspect-copy">
                  <span>{suspect.role} · {suspect.age}세</span>
                  <h3>{suspect.name}</h3>
                  <p>{descriptions[id]}</p>
                  <blockquote>“{suspect.alibi}”</blockquote>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mission-card">
          <div className="mission-copy">
            <span className="eyebrow">당신의 임무</span>
            <h2>15번의 질문으로<br />진범과 증거를 밝혀라.</h2>
            <p>자유롭게 질문하고, 현장 기록을 대조한 뒤 마지막에 한 사람을 기소하세요. 모든 대화는 기기 안에서 실행되는 무료 추리 엔진으로 처리됩니다.</p>
          </div>
          <div className="mission-stats">
            <div><strong>15</strong><span>심문 기회</span></div>
            <div><strong>04</strong><span>현장 증거</span></div>
            <div><strong>02</strong><span>엔딩 랭크</span></div>
          </div>
          <button className="start-button" type="button" onClick={onStart}>
            <span>심문실에 입장하기</span><b>→</b>
          </button>
        </div>

        <footer className="art-credit">게임 장면과 인물 이미지는 본 프로젝트를 위해 AI로 생성한 콘셉트 아트입니다.</footer>
      </section>
    </main>
  );
}

export default function CodeRedGame() {
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectId>('park');
  const [heartRates, setHeartRates] = useState<Record<SuspectId, number>>({
    kim: SUSPECTS.kim.initialBpm,
    park: SUSPECTS.park.initialBpm,
    choi: SUSPECTS.choi.initialBpm
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
  const chatLogRef = useRef<HTMLDivElement>(null);
  const current = SUSPECTS[selectedSuspect];

  useEffect(() => {
    if (!hasStarted) return undefined;
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
  }, [hasStarted]);

  useEffect(() => {
    const chatLog = chatLogRef.current;
    if (chatLog) chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: 'smooth' });
  }, [chatLogs, isTyping]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hasStarted]);

  const askQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = inputText.trim();
    if (!question || remainingTurns <= 0 || isTyping) return;

    const askedSuspect = selectedSuspect;
    const attachedEvidence = selectedEvidence;
    const nextTurns = remainingTurns - 1;
    const userMessage: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: (attachedEvidence
        ? '[증거 제시: ' + EVIDENCE.find((item) => item.id === attachedEvidence)?.name + ']\n'
        : '') + question,
      time: currentTime()
    };
    const reply = getLocalReply(askedSuspect, question, attachedEvidence);

    setRemainingTurns(nextTurns);
    setInputText('');
    setChatLogs((messages) => [...messages, userMessage]);
    setIsTyping(true);
    setSelectedEvidence(null);
    await new Promise((resolve) => window.setTimeout(resolve, 580));
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
        time: currentTime(),
        contradiction: reply.contradiction,
        stressDelta: reply.stress
      }
    ]);
    setIsTyping(false);
    if (nextTurns === 0) setShowAccuse(true);
  };

  const startInvestigation = () => {
    setSelectedSuspect('park');
    setRemainingTurns(15);
    setHeartRates({ kim: 78, park: 85, choi: 80 });
    setChatLogs(INITIAL_MESSAGES);
    setHasStarted(true);
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

  const resetGame = () => {
    setResult(null);
    setShowAccuse(false);
    setHasStarted(false);
    setSelectedEvidence(null);
    setInputText('');
  };

  if (!hasStarted) {
    return <InitialBriefing onStart={startInvestigation} />;
  }

  return (
    <main className="game-page">
      <div className="game-shell">
        <header className="game-topbar">
          <div className="brand-lockup">
            <span className="brand-symbol">CR</span>
            <span>CODE RED <i>/</i> THE VAULT</span>
          </div>
          <div className="topbar-actions">
            <div className="turn-counter" aria-label={'남은 질문 ' + remainingTurns + '회'}>
              <span>남은 질문</span>
              <strong className={remainingTurns <= 3 ? 'turn-low' : ''}>{remainingTurns}<small> / 15</small></strong>
            </div>
            <button className="accuse-button" type="button" onClick={() => setShowAccuse(true)}>
              최종 기소 <span>→</span>
            </button>
          </div>
        </header>

        <div className="game-section-title">
          <div>
            <span className="eyebrow"><span className="live-dot" /> 사건 번호 CR-01 · 특별 심문</span>
            <h1>금고를 연 사람은 누구인가</h1>
          </div>
          <span className="local-badge"><span /> 무료 로컬 엔진</span>
        </div>

        <div className="investigation-layout">
          <aside className="case-panel">
            <div className="panel-heading">
              <div><span className="eyebrow">조사 대상</span><h2>용의자</h2></div>
              <span className="panel-count">03</span>
            </div>
            <div className="suspect-switcher">
              {SUSPECT_IDS.map((id) => {
                const suspect = SUSPECTS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selectedSuspect === id}
                    className={'suspect-switch ' + (selectedSuspect === id ? 'is-active' : '')}
                    onClick={() => setSelectedSuspect(id)}
                    disabled={isTyping}
                  >
                    <img src={suspect.portrait} alt="" />
                    <span>{suspect.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="suspect-focus">
              <div className="suspect-photo">
                <img src={current.portrait} alt={current.name + ' 초상'} />
                <span className="photo-index">SUBJECT / 0{SUSPECT_IDS.indexOf(selectedSuspect) + 1}</span>
              </div>
              <div className="suspect-profile">
                <div>
                  <h3>{current.name}</h3>
                  <p>{current.role} · {current.age}세</p>
                </div>
                <div className={'bpm-readout ' + (heartRates[selectedSuspect] >= 130 ? 'bpm-alert' : '')}>
                  <span>심박</span><strong>{heartRates[selectedSuspect]}</strong><small>bpm</small>
                </div>
              </div>
              <div className="alibi-card">
                <span>진술한 알리바이</span>
                <p>“{current.alibi}”</p>
              </div>
            </div>

            <details className="evidence-drawer">
              <summary><span>현장 증거</span><b>04</b><i>펼치기</i></summary>
              <div className="evidence-list">
                {EVIDENCE.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={'evidence-item ' + (selectedEvidence === item.id ? 'evidence-selected' : '')}
                    aria-pressed={selectedEvidence === item.id}
                    onClick={() => setSelectedEvidence(selectedEvidence === item.id ? null : item.id)}
                    disabled={isTyping}
                  >
                    <span className="evidence-number">{item.icon}</span>
                    <span><b>{item.name}</b><small>{item.detail}</small></span>
                    <i>{selectedEvidence === item.id ? '선택' : '+'}</i>
                  </button>
                ))}
                <p className="evidence-hint">증거를 선택한 뒤 질문을 보내면 대화에 함께 제시됩니다.</p>
              </div>
            </details>
          </aside>

          <section className="interrogation-panel" aria-label="심문 대화">
            <div className="interrogation-header">
              <div className="conversation-person">
                <img src={current.portrait} alt="" />
                <div><span>심문 기록</span><strong>{current.name}과 대화 중</strong></div>
              </div>
              <div className="recording-indicator"><span /> REC</div>
            </div>
            <div className="chat-log" aria-live="polite" ref={chatLogRef}>
              <div className="chat-date"><span>금요일 · 21:40</span></div>
              {chatLogs.map((message) => {
                if (message.sender === 'system') {
                  return <div className="system-message" key={message.id}><span>{message.text}</span></div>;
                }
                const isUser = message.sender === 'user';
                const person = SUSPECTS[message.suspectId || selectedSuspect];
                return (
                  <article className={'chat-row ' + (isUser ? 'chat-row-user' : '')} key={message.id}>
                    {!isUser && <img className="chat-avatar" src={person.portrait} alt="" />}
                    <div className="chat-message-wrap">
                      {!isUser && <span className="chat-name">{person.name}</span>}
                      <div className={'chat-bubble ' + (isUser ? 'bubble-user' : '') + (message.contradiction ? ' bubble-contradiction' : '')}>
                        <p>{message.text}</p>
                        {message.contradiction && <div className="contradiction-note">진술의 모순 · 심박 +{message.stressDelta} bpm</div>}
                      </div>
                      <time>{message.time}</time>
                    </div>
                  </article>
                );
              })}
              {isTyping && (
                <article className="chat-row">
                  <img className="chat-avatar" src={current.portrait} alt="" />
                  <div className="chat-message-wrap">
                    <span className="chat-name">{current.name}</span>
                    <div className="chat-bubble typing-indicator"><span /><span /><span /></div>
                  </div>
                </article>
              )}
            </div>

            <div className="composer-area">
              {selectedEvidence && (
                <div className="attached-evidence">
                  <span>증거 첨부</span>
                  <b>{EVIDENCE.find((item) => item.id === selectedEvidence)?.name}</b>
                  <button type="button" onClick={() => setSelectedEvidence(null)} aria-label="첨부 증거 해제">×</button>
                </div>
              )}
              <form className="question-form" onSubmit={askQuestion}>
                <input
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder={current.name + '에게 자유롭게 질문하세요'}
                  aria-label="심문 질문"
                  disabled={remainingTurns <= 0 || isTyping}
                  maxLength={220}
                />
                <button type="submit" disabled={!inputText.trim() || remainingTurns <= 0 || isTyping}>
                  보내기 <span>↑</span>
                </button>
              </form>
              <div className="composer-footnote">
                <span>사건과 관련된 질문을 직접 입력하세요.</span>
                <span>{remainingTurns}회 남음</span>
              </div>
            </div>
          </section>
        </div>
        <footer className="game-footer"><span>CODE RED / 특별 수사 기록</span><button type="button" onClick={resetGame}>사건 브리핑으로 돌아가기</button></footer>
      </div>

      {showAccuse && (
        <div className="modal-backdrop" role="presentation">
          <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="accuse-title">
            <div className="modal-heading">
              <div><span className="eyebrow">사건 종결 절차</span><h2 id="accuse-title">최종 기소</h2></div>
              <button className="modal-close" type="button" onClick={() => setShowAccuse(false)} aria-label="닫기">×</button>
            </div>
            <p className="modal-intro">진범이라고 생각하는 사람과 법원에 제출할 증거를 선택하세요.</p>
            <label className="modal-label">기소할 용의자</label>
            <div className="accuse-suspects">
              {SUSPECT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={accuseSuspect === id ? 'accuse-suspect picked' : 'accuse-suspect'}
                  onClick={() => setAccuseSuspect(id)}
                >
                  <img src={SUSPECTS[id].portrait} alt="" /><span>{SUSPECTS[id].name}</span>
                </button>
              ))}
            </div>
            <label className="modal-label">제출할 결정적 증거</label>
            <div className="accuse-evidence">
              {EVIDENCE.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={accuseEvidence === item.id ? 'accuse-evidence-item picked' : 'accuse-evidence-item'}
                  onClick={() => setAccuseEvidence(item.id)}
                >
                  <span>{item.icon}</span><b>{item.name}</b><i>{accuseEvidence === item.id ? '선택됨' : '선택'}</i>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setShowAccuse(false)}>심문 계속</button>
              <button type="button" className="danger-button" onClick={submitAccusation}>기소 확정 <span>→</span></button>
            </div>
          </section>
        </div>
      )}

      {result && (
        <div className="modal-backdrop result-backdrop" role="presentation">
          <section className="game-modal result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className={'result-mark ' + (result === 'win' ? 'result-win' : '')}>{result === 'win' ? '✓' : '!'}</div>
            <span className="eyebrow">{result === 'win' ? 'CASE CLOSED · S RANK' : 'CASE UNRESOLVED · F RANK'}</span>
            <h2 id="result-title">{result === 'win' ? '완벽한 검거' : '기소 실패'}</h2>
            <p className="result-copy">{resultText}</p>
            <button className="start-button result-restart" type="button" onClick={resetGame}><span>사건 브리핑부터 다시하기</span><b>↻</b></button>
          </section>
        </div>
      )}
    </main>
  );
}
