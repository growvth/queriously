import './app-shell-mock.css'

import {
  AlertCircle,
  Eye,
  FileText,
  FolderKanban,
  FolderOpen,
  GitMerge,
  Library,
  MapPin,
  MessageSquare,
  Moon,
  PenLine,
  Search,
  Send,
  Settings2,
  Swords,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

type ThemeMode = 'light' | 'dark'

function QueriouslyLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="asm-logo"
      aria-hidden
    >
      <circle cx="42" cy="42" r="28" stroke="currentColor" strokeWidth="12" />
      <line
        x1="62"
        y1="62"
        x2="86"
        y2="86"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  )
}

const READING_MODES = [
  { id: 'explain', Icon: MessageSquare, label: 'Explain' },
  { id: 'challenge', Icon: Swords, label: 'Challenge' },
  { id: 'connect', Icon: GitMerge, label: 'Connect' },
  { id: 'annotate', Icon: PenLine, label: 'Annotate' },
] as const

type MockVariant = 'default' | 'showcase'

/**
 * Static illustration of the Queriously desktop shell (TopBar, Sidebar, PDF viewer,
 * RightPanel chat, StatusBar) using the same layout and theme tokens as the Tauri app.
 */
export function AppShellMock({
  theme,
  variant = 'default',
}: {
  theme: ThemeMode
  variant?: MockVariant
}) {
  return (
    <div
      className={`app-shell-mock ${variant === 'showcase' ? 'app-shell-mock--showcase' : ''}`}
      data-app-mock-theme={theme === 'dark' ? 'dark' : 'light'}
      aria-hidden="true"
    >
      <header className="asm-topbar">
        <div className="asm-brand">
          <QueriouslyLogo size={20} />
          <span className="asm-brand-name">Queriously</span>
        </div>
        <div className="asm-doc-title">
          Model serving tradeoffs · ISCA &apos;23 workshop (camera-ready).pdf
        </div>
        <div className="asm-top-actions">
          <span className="asm-btn">
            <FolderOpen />
            <span>Open</span>
          </span>
          <span className="asm-btn" aria-hidden title="Toggle theme">
            <Moon />
          </span>
          <span className="asm-btn" aria-hidden title="Settings">
            <Settings2 />
          </span>
        </div>
      </header>

      <div className="asm-body">
        <aside className="asm-sidebar" aria-hidden>
          <div className="asm-srail">
            <span className="asm-tabico" data-active="true" title="Library">
              <Library />
            </span>
            <span className="asm-tabico" data-active="false" title="Sessions">
              <FolderKanban />
            </span>
          </div>
          <div className="asm-spanel">
            <div className="asm-shead">Library</div>
            <div className="asm-search-wrap">
              <Search />
              <input
                className="asm-input"
                type="search"
                readOnly
                tabIndex={-1}
                placeholder="Search library"
              />
            </div>
            <div className="asm-lib">
              <div className="asm-paper" data-active="true">
                <FileText />
                <div className="asm-paper-main">
                  <div className="asm-ptitle">
                    Model serving tradeoffs (ISCA &apos;23).pdf
                  </div>
                  <div className="asm-pmeta">Indexed · Marginalia</div>
                </div>
              </div>
              <div className="asm-paper" data-active="false">
                <FileText />
                <div className="asm-paper-main">
                  <div className="asm-ptitle">GPU micro-batching cost model.pdf</div>
                  <div className="asm-pmeta">Indexed</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="asm-handle" />

        <div className="asm-viewer">
          <div className="asm-page">
            <p className="asm-para">
              We evaluate tail latency under bursty request traffic when using GPU
              micro-batching versus single-sample inference. Micro-batching improves
              throughput but can increase{' '}
              <span className="asm-hl">tail latency for stragglers in the batch</span>{' '}
              when batch formation waits on the slowest sample.
            </p>
            <p className="asm-para">
              Figure 4 shows p99 latency vs. batch timeout; teams should cap batch wait
              time during interactive serving to avoid violating SLOs under skewed
              arrivals.
            </p>
          </div>
        </div>

        <div className="asm-handle" />

        <aside className="asm-right" aria-hidden>
          <div className="asm-rtabs">
            <span className="asm-rtab" data-active="true">
              <MessageSquare />
              <span>Chat</span>
            </span>
            <span className="asm-rtab" data-active="false">
              <FileText />
              <span>Summary</span>
            </span>
          </div>
          <div className="asm-chat">
            <div className="asm-messages">
              <div className="asm-row asm-row-user">
                <div className="asm-avatar asm-avatar-user">
                  <User />
                </div>
                <div className="asm-bubble asm-bubble-user">
                  What happens to p99 latency if our batch timeout is too aggressive?
                </div>
              </div>

              <div className="asm-row">
                <div className="asm-avatar asm-avatar-bot">Q</div>
                <div>
                  <div className="asm-bubble asm-bubble-bot">
                    <p>
                      The paper links higher p99 primarily to batch formation delay: when
                      the timeout is tight, stragglers get grouped with faster samples less
                      often, which can{' '}
                      <strong>reduce tail inflation from batching effects</strong> but also
                      lower GPU utilization.
                    </p>
                    <span className="asm-cursor" />
                  </div>
                  <div className="asm-conf">
                    <AlertCircle />
                    <span>Medium confidence</span>
                  </div>
                  <button type="button" className="asm-cite" tabIndex={-1}>
                    <MapPin />
                    <div>
                      <div className="asm-cite-page">
                        p.7 · §3.2 batch timeout
                        <span className="asm-cite-score">87% match</span>
                      </div>
                      <div className="asm-cite-snippet">
                        …tight batch caps reduce co-scheduling of samples with heterogeneous
                        runtimes, improving tail bounds under skew…
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="asm-modes">
              {READING_MODES.map((m) => (
                <span
                  key={m.id}
                  className={m.id === 'challenge' ? 'asm-mode asm-mode--challenge' : 'asm-mode'}
                  data-active={m.id === 'explain' ? 'true' : 'false'}
                >
                  <m.Icon />
                  <span>{m.label}</span>
                </span>
              ))}
            </div>

            <div className="asm-compose">
              <div className="asm-compose-form">
                <textarea
                  className="asm-textarea"
                  readOnly
                  tabIndex={-1}
                  rows={1}
                  placeholder="Ask about this paper..."
                />
                <span className="asm-send">
                  <Send />
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="asm-status">
        <div className="asm-status-primary">
          <span className="asm-tabular">Page 7 / 42</span>
          <span className="asm-st-muted">
            <Eye />
            <span>Marginalia on</span>
            <span className="asm-st-count">(3)</span>
          </span>
          <span className="asm-ai-ready">
            <span className="asm-dot" />
            <span>AI ready</span>
          </span>
        </div>
        <div className="asm-zoom">
          <span>
            <ZoomOut />
          </span>
          <span className="asm-tabular">110%</span>
          <span>
            <ZoomIn />
          </span>
        </div>
      </footer>
    </div>
  )
}
