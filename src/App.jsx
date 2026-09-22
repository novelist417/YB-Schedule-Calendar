import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const TYPE_COLORS = {
  방송: '#8B5CF6',
  '지역축제/행사': '#F59E0B',
  기념일: '#EC4899',
  대학축제: '#10B981',
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [schedules, setSchedules] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSchedules, setSelectedSchedules] = useState([])

  useEffect(() => {
    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)

      if (newSession) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadSchedules()
  }, [])

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    setSession(session)

    if (session) {
      loadProfile(session.user.id)
    }
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('프로필 조회 실패:', error)
      return
    }

    setProfile(data)
  }

  async function loadSchedules() {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) {
      console.error('일정 불러오기 실패:', error)
      return
    }

    setSchedules(data || [])
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginError(error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const weeks = []
  let week = []

  for (let i = 0; i < firstDay; i++) {
    week.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)

    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null)
    }
    weeks.push(week)
  }

  function getSchedules(day) {
    if (!day) return []

    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`

    return schedules.filter((schedule) => schedule.event_date === date)
  }

  function openDay(day) {
    const items = getSchedules(day)

    if (items.length === 0) return

    setSelectedDate(day)
    setSelectedSchedules(items)
  }

  function closeDetail() {
    setSelectedDate(null)
    setSelectedSchedules([])
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">YB</div>

        <h1>YB Schedule Calendar</h1>

        <div style={{ marginLeft: 'auto' }}>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {profile?.role === 'admin' && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#10B981',
                  }}
                >
                  ADMIN
                </span>
              )}

              <button
                onClick={handleLogout}
                style={{
                  border: '1px solid #ddd',
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const login = document.getElementById('login')
                login?.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{
                border: '1px solid #ddd',
                background: '#fff',
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              로그인
            </button>
          )}
        </div>
      </header>

      <main className="main">
        <div className="calendar-header">
          <button>‹</button>

          <h2>
            {year}. {String(month + 1).padStart(2, '0')}
          </h2>

          <button>›</button>
        </div>

        <div className="calendar-card">
          <div className="weekdays">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(
              (day) => (
                <div key={day}>{day}</div>
              )
            )}
          </div>

          <div className="calendar-grid">
            {weeks.flat().map((day, index) => {
              const items = getSchedules(day)

              return (
                <div
                  key={index}
                  className={`calendar-day ${
                    day === today.getDate() ? 'today' : ''
                  } ${day ? '' : 'empty'}`}
                  onClick={() => openDay(day)}
                >
                  {day && <div className="date-number">{day}</div>}

                  <div className="events">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="event"
                        style={{
                          borderLeftColor:
                            TYPE_COLORS[item.schedule_type] || '#999',
                        }}
                      >
                        <span
                          className="event-dot"
                          style={{
                            backgroundColor:
                              TYPE_COLORS[item.schedule_type] || '#999',
                          }}
                        />

                        <span className="event-title">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {!session && (
          <section
            id="login"
            style={{
              maxWidth: '420px',
              margin: '30px auto 0',
              padding: '24px',
              background: '#fff',
              border: '1px solid #e8e8ee',
              borderRadius: '16px',
            }}
          >
            <h2 style={{ margin: '0 0 18px', fontSize: '18px' }}>
              로그인
            </h2>

            <form
              onSubmit={handleLogin}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                }}
              />

              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                }}
              />

              <button
                type="submit"
                style={{
                  padding: '12px',
                  border: 0,
                  borderRadius: '8px',
                  background: '#222',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                로그인
              </button>

              {loginError && (
                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#d33',
                    fontSize: '13px',
                  }}
                >
                  로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.
                </p>
              )}
            </form>
          </section>
        )}
      </main>

      {selectedDate && (
        <div className="overlay" onClick={closeDetail}>
          <div
            className="bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <h2>
                {year}. {String(month + 1).padStart(2, '0')}.{' '}
                {String(selectedDate).padStart(2, '0')}
              </h2>

              <button className="close-button" onClick={closeDetail}>
                ×
              </button>
            </div>

            {selectedSchedules.map((schedule) => (
              <article className="schedule-detail" key={schedule.id}>
                <div
                  className="detail-type"
                  style={{
                    color:
                      TYPE_COLORS[schedule.schedule_type] || '#666',
                  }}
                >
                  {schedule.schedule_type}
                </div>

                <h3>{schedule.title}</h3>

                {schedule.event_time && (
                  <div className="detail-row">
                    <span>일시</span>
                    <strong>
                      {schedule.event_date} {schedule.event_time}
                    </strong>
                  </div>
                )}

                {schedule.place && (
                  <div className="detail-row">
                    <span>장소</span>
                    <strong>{schedule.place}</strong>
                  </div>
                )}

                {schedule.address && (
                  <div className="detail-row">
                    <span>주소</span>
                    <strong>{schedule.address}</strong>
                  </div>
                )}

                {schedule.details && (
                  <div className="detail-section">
                    <span>참고 사항</span>
                    <p>{schedule.details}</p>
                  </div>
                )}

                {schedule.related_link && (
                  <a
                    className="reference-link"
                    href={schedule.related_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    참고 링크 →
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
