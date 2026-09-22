import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const TYPE_COLORS = {
  방송: '#5B8DEF',
  '지역축제/행사': '#F39C5A',
  기념일: '#E77FB5',
  대학축제: '#7A68D8',
}

const EMPTY_FORM = {
  title: '',
  schedule_type: '방송',
  event_date: '',
  event_time: '',
  place: '',
  address: '',
  details: '',
  related_link: '',
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

  const [page, setPage] = useState('calendar')

  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)

      if (newSession?.user) {
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
    const { data } = await supabase.auth.getSession()
    const currentSession = data.session

    setSession(currentSession)

    if (currentSession?.user) {
      await loadProfile(currentSession.user.id)
    }
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('프로필 조회 실패:', error)
      setProfile(null)
      return
    }

    console.log('현재 사용자 프로필:', data)
    setProfile(data)
  }

  async function loadSchedules() {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true })

    if (error) {
      console.error('일정 조회 실패:', error)
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
    setSession(null)
    setProfile(null)
    setPage('calendar')
  }

  function openNewScheduleForm() {
    setEditingSchedule(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(schedule) {
    setEditingSchedule(schedule)

    setForm({
      title: schedule.title || '',
      schedule_type: schedule.schedule_type || '방송',
      event_date: schedule.event_date || '',
      event_time: schedule.event_time
        ? schedule.event_time.slice(0, 5)
        : '',
      place: schedule.place || '',
      address: schedule.address || '',
      details: schedule.details || '',
      related_link: schedule.related_link || '',
    })

    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingSchedule(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function handleFormChange(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSaveSchedule(e) {
    e.preventDefault()

    if (!isAdmin) return

    if (!form.title.trim()) {
      setFormError('일정 제목을 입력해주세요.')
      return
    }

    if (!form.event_date) {
      setFormError('날짜를 선택해주세요.')
      return
    }

    setSaving(true)
    setFormError('')

    const payload = {
      title: form.title.trim(),
      schedule_type: form.schedule_type,
      event_date: form.event_date,
      event_time: form.event_time || null,
      place: form.place.trim() || null,
      address: form.address.trim() || null,
      details: form.details.trim() || null,
      related_link: form.related_link.trim() || null,
      updated_at: new Date().toISOString(),
    }

    let error

    if (editingSchedule) {
      const result = await supabase
        .from('schedules')
        .update(payload)
        .eq('id', editingSchedule.id)

      error = result.error
    } else {
      const result = await supabase
        .from('schedules')
        .insert(payload)

      error = result.error
    }

    if (error) {
      console.error('일정 저장 실패:', error)
      setFormError(error.message)
      setSaving(false)
      return
    }

    await loadSchedules()

    setSaving(false)
    closeForm()
    setSelectedDate(null)
    setSelectedSchedules([])
  }

  async function handleDeleteSchedule(schedule) {
    if (!isAdmin) return

    const confirmed = window.confirm(
      `"${schedule.title}" 일정을 삭제할까요?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', schedule.id)

    if (error) {
      console.error('일정 삭제 실패:', error)
      alert(`삭제에 실패했습니다.\n${error.message}`)
      return
    }

    await loadSchedules()

    setSelectedDate(null)
    setSelectedSchedules([])
  }

  function handleDateClick(day) {
    if (!day) return

    const date = formatDate(day)

    const daySchedules = schedules.filter(
      (schedule) => schedule.event_date === date
    )

    setSelectedDate(date)
    setSelectedSchedules(daySchedules)
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay()
  }

  function formatDate(day) {
    return `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      '0'
    )}-${String(day).padStart(2, '0')}`
  }

  function formatTime(time) {
    if (!time) return ''

    const [hourString, minute] = time.split(':')
    const hour = Number(hourString)

    if (hour === 0) {
      return `오전 12:${minute}`
    }

    if (hour < 12) {
      return `오전 ${hour}:${minute}`
    }

    if (hour === 12) {
      return `오후 12:${minute}`
    }

    return `오후 ${hour - 12}:${minute}`
  }

  function formatDateText(dateString) {
    if (!dateString) return ''

    const [year, month, day] = dateString.split('-')

    return `${year}. ${Number(month)}. ${Number(day)}.`
  }

  function formatListDate(dateString) {
    if (!dateString) return ''

    const [year, month, day] = dateString.split('-')

    return `${year}.${month}.${day}`
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  const daysInMonth = getDaysInMonth(
    currentYear,
    currentMonth
  )

  const firstDay = getFirstDayOfMonth(
    currentYear,
    currentMonth
  )

  const calendarDays = []

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  function getSchedulesForDate(day) {
    if (!day) return []

    const date = formatDate(day)

    return schedules.filter(
      (schedule) => schedule.event_date === date
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div
          className="logo"
          onClick={() => setPage('calendar')}
          style={{ cursor: 'pointer' }}
        >
          <span className="logo-mark">YB</span>
          <span>YB Schedule Calendar</span>
        </div>

        <div className="header-right">
          {isAdmin && (
            <nav className="admin-nav">
              <button
                className={
                  page === 'calendar'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() => setPage('calendar')}
              >
                달력
              </button>

              <button
                className={
                  page === 'list'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() => setPage('list')}
              >
                일정목록
              </button>
            </nav>
          )}

          {isAdmin && (
            <span className="admin-badge">
              ADMIN
            </span>
          )}

          {session && (
            <button
              className="header-button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {!session && (
          <section className="login-section">
            <h2>로그인</h2>

            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

              <button type="submit">
                로그인
              </button>

              {loginError && (
                <p className="error-message">
                  {loginError}
                </p>
              )}
            </form>
          </section>
        )}

        {page === 'list' && isAdmin ? (
          <section className="schedule-list-page">
            <div className="list-page-header">
              <div>
                <p className="page-eyebrow">
                  ADMIN
                </p>
                <h1>일정목록</h1>
                <p className="page-description">
                  등록된 모든 일정을 관리합니다.
                </p>
              </div>

              <button
                className="add-schedule-button"
                onClick={openNewScheduleForm}
              >
                + 일정 추가
              </button>
            </div>

            <div className="schedule-list">
              {schedules.length === 0 ? (
                <div className="empty-list">
                  등록된 일정이 없습니다.
                </div>
              ) : (
                schedules.map((schedule) => (
                  <div
                    className="schedule-list-item"
                    key={schedule.id}
                  >
                    <div className="list-item-date">
                      {formatListDate(
                        schedule.event_date
                      )}
                    </div>

                    <div className="list-item-main">
                      <div
                        className="list-item-type"
                        style={{
                          color:
                            TYPE_COLORS[
                              schedule.schedule_type
                            ] || '#777',
                        }}
                      >
                        {schedule.schedule_type}
                      </div>

                      <h3>{schedule.title}</h3>

                      <div className="list-item-info">
                        {schedule.event_time && (
                          <span>
                            {formatTime(
                              schedule.event_time
                            )}
                          </span>
                        )}

                        {schedule.place && (
                          <span>
                            {schedule.place}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="list-item-actions">
                      <button
                        onClick={() =>
                          openEditForm(schedule)
                        }
                      >
                        수정
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDeleteSchedule(schedule)
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="calendar-section">
            <div className="calendar-header">
              <h1>
                {currentYear}.{' '}
                {String(currentMonth + 1).padStart(
                  2,
                  '0'
                )}
              </h1>

              {isAdmin && (
                <button
                  className="add-schedule-button"
                  onClick={openNewScheduleForm}
                >
                  + 일정 추가
                </button>
              )}
            </div>

            <div className="calendar-card">
              <div className="weekdays">
                <div>일</div>
                <div>월</div>
                <div>화</div>
                <div>수</div>
                <div>목</div>
                <div>금</div>
                <div>토</div>
              </div>

              <div className="calendar-grid">
                {calendarDays.map((day, index) => {
                  const daySchedules =
                    getSchedulesForDate(day)

                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear()

                  return (
                    <button
                      key={index}
                      className={`calendar-day ${
                        isToday ? 'today' : ''
                      }`}
                      onClick={() =>
                        handleDateClick(day)
                      }
                      disabled={!day}
                    >
                      {day && (
                        <>
                          <span className="date-number">
                            {day}
                          </span>

                          <div className="events">
                            {daySchedules.map(
                              (schedule) => (
                                <div
                                  className="event"
                                  key={schedule.id}
                                >
                                  <span
                                    className="event-dot"
                                    style={{
                                      backgroundColor:
                                        TYPE_COLORS[
                                          schedule.schedule_type
                                        ] || '#999',
                                    }}
                                  />

                                  <span className="event-title">
                                    {schedule.title}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {selectedDate && (
        <div
          className="overlay"
          onClick={() => {
            setSelectedDate(null)
            setSelectedSchedules([])
          }}
        >
          <div
            className="bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <h2>
                {formatDateText(selectedDate)}
              </h2>

              <button
                className="close-button"
                onClick={() => {
                  setSelectedDate(null)
                  setSelectedSchedules([])
                }}
              >
                ×
              </button>
            </div>

            <div className="schedule-detail">
              {selectedSchedules.length === 0 ? (
                <p>등록된 일정이 없습니다.</p>
              ) : (
                selectedSchedules.map((schedule) => (
                  <div
                    className="schedule-item"
                    key={schedule.id}
                  >
                    <div
                      className="detail-type"
                      style={{
                        backgroundColor:
                          TYPE_COLORS[
                            schedule.schedule_type
                          ] || '#999',
                      }}
                    >
                      {schedule.schedule_type}
                    </div>

                    <h3>{schedule.title}</h3>

                    <div className="detail-row">
                      <strong>일시</strong>
                      <span>
                        {formatDateText(
                          schedule.event_date
                        )}
                        {schedule.event_time &&
                          ` ${formatTime(
                            schedule.event_time
                          )}`}
                      </span>
                    </div>

                    {schedule.place && (
                      <div className="detail-row">
                        <strong>장소</strong>
                        <span>{schedule.place}</span>
                      </div>
                    )}

                    {schedule.address && (
                      <div className="detail-row">
                        <strong>주소</strong>
                        <span>{schedule.address}</span>
                      </div>
                    )}

                    {schedule.details && (
                      <div className="detail-section">
                        <strong>참고 사항</strong>
                        <p>{schedule.details}</p>
                      </div>
                    )}

                    {schedule.related_link && (
                      <div className="detail-section">
                        <strong>참고 링크</strong>
                        <a
                          className="reference-link"
                          href={
                            schedule.related_link
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          링크 열기
                        </a>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="admin-actions">
                        <button
                          onClick={() =>
                            openEditForm(schedule)
                          }
                        >
                          수정
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDeleteSchedule(
                              schedule
                            )
                          }
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="overlay">
          <div
            className="bottom-sheet schedule-form-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <h2>
                {editingSchedule
                  ? '일정 수정'
                  : '일정 추가'}
              </h2>

              <button
                className="close-button"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              className="schedule-form"
              onSubmit={handleSaveSchedule}
            >
              <label>
                제목 *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="예: 중앙대학교 축제"
                />
              </label>

              <label>
                유형 *
                <select
                  name="schedule_type"
                  value={form.schedule_type}
                  onChange={handleFormChange}
                >
                  <option value="방송">방송</option>
                  <option value="지역축제/행사">
                    지역축제/행사
                  </option>
                  <option value="기념일">기념일</option>
                  <option value="대학축제">대학축제</option>
                </select>
              </label>

              <label>
                날짜 *
                <input
                  type="date"
                  name="event_date"
                  value={form.event_date}
                  onChange={handleFormChange}
                />
              </label>

              <label>
                시간
                <input
                  type="time"
                  name="event_time"
                  value={form.event_time}
                  onChange={handleFormChange}
                />
              </label>

              <label>
                장소
                <input
                  name="place"
                  value={form.place}
                  onChange={handleFormChange}
                  placeholder="장소"
                />
              </label>

              <label>
                주소 / 지도
                <input
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="주소 또는 지도 링크"
                />
              </label>

              <label>
                참고 사항
                <textarea
                  name="details"
                  value={form.details}
                  onChange={handleFormChange}
                  placeholder="참고 사항"
                  rows="3"
                />
              </label>

              <label>
                참고 링크
                <input
                  name="related_link"
                  value={form.related_link}
                  onChange={handleFormChange}
                  placeholder="https://..."
                />
              </label>

              {formError && (
                <p className="error-message">
                  {formError}
                </p>
              )}

              <button
                className="save-schedule-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? '저장 중...'
                  : editingSchedule
                    ? '수정 저장'
                    : '일정 저장'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
