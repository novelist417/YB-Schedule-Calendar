import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const TYPE_COLORS = {
  방송: '#5B8DEF',
  '지역축제/행사': '#F39C5A',
  기념일: '#E77FB5',
  대학축제: '#7A68D8',
}

const TYPE_OPTIONS = [
  '방송',
  '지역축제/행사',
  '기념일',
  '대학축제',
]

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

const EMPTY_REQUEST_FORM = {
  title: '',
  request_type: '일정 추가',
  details: '',
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSignupMode, setIsSignupMode] = useState(false)
  const [signupMessage, setSignupMessage] = useState('')

  const [schedules, setSchedules] = useState([])

  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSchedules, setSelectedSchedules] = useState([])

  const [page, setPage] = useState('calendar')
  const [calendarView, setCalendarView] = useState('month')

  // 검색 / 필터
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [memos, setMemos] = useState({})
  const [memoText, setMemoText] = useState({})
  const [editingMemoId, setEditingMemoId] = useState(null)
  const [memoSaving, setMemoSaving] = useState(null)

  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState(
    EMPTY_REQUEST_FORM
  )
  const [requestSaving, setRequestSaving] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [myRequests, setMyRequests] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [requestLoading, setRequestLoading] = useState(false)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)

        if (newSession?.user) {
          loadProfile(newSession.user.id)
        } else {
          setProfile(null)
          setMemos({})
          setMemoText({})
          setEditingMemoId(null)
          setMyRequests([])
          setAllRequests([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadSchedules()
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadMyRequests()
    } else {
      setMyRequests([])
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (isAdmin) {
      loadAllRequests()
    } else {
      setAllRequests([])
    }
  }, [isAdmin])

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
    setSignupMessage('')

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

    if (error) {
      setLoginError(error.message)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()

    setLoginError('')
    setSignupMessage('')

    if (!email.trim() || !password) {
      setLoginError(
        '이메일과 비밀번호를 입력해주세요.'
      )
      return
    }

    if (password.length < 6) {
      setLoginError(
        '비밀번호는 6자 이상 입력해주세요.'
      )
      return
    }

    const { data, error } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

    if (error) {
      setLoginError(error.message)
      return
    }

    if (data.session) {
      setSignupMessage(
        '회원가입이 완료되었습니다.'
      )
    } else {
      setSignupMessage(
        '회원가입이 완료되었습니다.'
      )
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setPage('calendar')
    setSelectedDate(null)
    setSelectedSchedules([])
    setMemos({})
    setMemoText({})
    setEditingMemoId(null)
    setMyRequests([])
    setAllRequests([])
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
      schedule_type:
        schedule.schedule_type || '방송',
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
      setFormError(
        '일정 제목을 입력해주세요.'
      )
      return
    }

    if (!form.event_date) {
      setFormError(
        '날짜를 선택해주세요.'
      )
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
      related_link:
        form.related_link.trim() || null,
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
      console.error(
        '일정 저장 실패:',
        error
      )
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

  async function handleDeleteSchedule(
    schedule
  ) {
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
      console.error(
        '일정 삭제 실패:',
        error
      )
      alert(
        `삭제에 실패했습니다.\n${error.message}`
      )
      return
    }

    await loadSchedules()

    setSelectedDate(null)
    setSelectedSchedules([])
  }

  // =========================
  // 개인 메모
  // =========================

  async function loadMemos(scheduleIds) {
    if (
      !session?.user ||
      !scheduleIds?.length
    ) {
      setMemos({})
      setMemoText({})
      setEditingMemoId(null)
      return
    }

    const { data, error } =
      await supabase
        .from('memos')
        .select('*')
        .eq('user_id', session.user.id)
        .in('schedule_id', scheduleIds)

    if (error) {
      console.error(
        '메모 조회 실패:',
        error
      )
      return
    }

    const memoMap = {}
    const textMap = {}

    ;(data || []).forEach((memo) => {
      memoMap[memo.schedule_id] = memo
      textMap[memo.schedule_id] =
        memo.content
    })

    setMemos(memoMap)
    setMemoText(textMap)
    setEditingMemoId(null)
  }

  async function handleSaveMemo(
    scheduleId
  ) {
    if (!session?.user) return

    const content = (
      memoText[scheduleId] || ''
    ).trim()

    if (!content) return

    setMemoSaving(scheduleId)

    const existingMemo =
      memos[scheduleId]

    let result

    if (existingMemo) {
      result = await supabase
        .from('memos')
        .update({
          content,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', existingMemo.id)
        .eq(
          'user_id',
          session.user.id
        )
    } else {
      result = await supabase
        .from('memos')
        .insert({
          user_id: session.user.id,
          schedule_id: scheduleId,
          content,
        })
    }

    if (result.error) {
      console.error(
        '메모 저장 실패:',
        result.error
      )

      alert(
        `메모 저장에 실패했습니다.\n${result.error.message}`
      )

      setMemoSaving(null)
      return
    }

    await loadMemos(
      selectedSchedules.map(
        (schedule) => schedule.id
      )
    )

    setEditingMemoId(null)
    setMemoSaving(null)
  }

  async function handleDeleteMemo(
    scheduleId
  ) {
    if (!session?.user) return

    const memo = memos[scheduleId]

    if (!memo) return

    const confirmed = window.confirm(
      '이 메모를 삭제할까요?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('memos')
      .delete()
      .eq('id', memo.id)
      .eq(
        'user_id',
        session.user.id
      )

    if (error) {
      console.error(
        '메모 삭제 실패:',
        error
      )

      alert(
        `메모 삭제에 실패했습니다.\n${error.message}`
      )

      return
    }

    await loadMemos(
      selectedSchedules.map(
        (schedule) => schedule.id
      )
    )
  }

  async function handleDateStringClick(
    date
  ) {
    if (!date) return

    const daySchedules =
      schedules.filter(
        (schedule) =>
          schedule.event_date === date
      )

    setSelectedDate(date)
    setSelectedSchedules(
      daySchedules
    )

    await loadMemos(
      daySchedules.map(
        (schedule) => schedule.id
      )
    )
  }

  function handleEventClick(
    schedule
  ) {
    handleDateStringClick(
      schedule.event_date
    )
  }

  // =========================
  // 요청사항
  // =========================

  function openRequestForm() {
    setRequestForm(
      EMPTY_REQUEST_FORM
    )
    setRequestError('')
    setShowRequestForm(true)
  }

  function closeRequestForm() {
    setShowRequestForm(false)
    setRequestForm(
      EMPTY_REQUEST_FORM
    )
    setRequestError('')
  }

  function handleRequestFormChange(e) {
    const { name, value } = e.target

    setRequestForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmitRequest(e) {
    e.preventDefault()

    if (!session?.user) return

    if (!requestForm.title.trim()) {
      setRequestError(
        '제목을 입력해주세요.'
      )
      return
    }

    if (
      !requestForm.details.trim()
    ) {
      setRequestError(
        '요청 내용을 입력해주세요.'
      )
      return
    }

    setRequestSaving(true)
    setRequestError('')

    const { error } =
      await supabase
        .from('schedule_requests')
        .insert({
          title:
            requestForm.title.trim(),
          request_type:
            requestForm.request_type,
          details:
            requestForm.details.trim(),
          submitter_email:
            session.user.email,
        })

    if (error) {
      console.error(
        '요청사항 등록 실패:',
        error
      )

      setRequestError(error.message)
      setRequestSaving(false)
      return
    }

    await loadMyRequests()

    setRequestSaving(false)
    closeRequestForm()

    alert(
      '요청사항이 등록되었습니다.'
    )
  }

  async function loadMyRequests() {
    if (!session?.user?.email) {
      setMyRequests([])
      return
    }

    const { data, error } =
      await supabase
        .from('schedule_requests')
        .select('*')
        .eq(
          'submitter_email',
          session.user.email
        )
        .order('created_at', {
          ascending: false,
        })

    if (error) {
      console.error(
        '내 요청사항 조회 실패:',
        error
      )
      return
    }

    setMyRequests(data || [])
  }

  async function loadAllRequests() {
    if (!isAdmin) {
      setAllRequests([])
      return
    }

    setRequestLoading(true)

    const { data, error } =
      await supabase
        .from('schedule_requests')
        .select('*')
        .order('created_at', {
          ascending: false,
        })

    if (error) {
      console.error(
        '요청사항 전체 조회 실패:',
        error
      )

      setRequestLoading(false)
      return
    }

    setAllRequests(data || [])
    setRequestLoading(false)
  }

  async function handleToggleRequestStatus(
    request
  ) {
    if (!isAdmin) return

    const nextStatus =
      request.status === '반영 완료'
        ? '반영 전'
        : '반영 완료'

    const { error } =
      await supabase
        .from('schedule_requests')
        .update({
          status: nextStatus,
        })
        .eq('id', request.id)

    if (error) {
      console.error(
        '요청사항 상태 변경 실패:',
        error
      )

      alert(
        `상태 변경에 실패했습니다.\n${error.message}`
      )

      return
    }

    await loadAllRequests()
  }

  // =========================
  // 날짜 / 달력
  // =========================

  function getDaysInMonth(
    year,
    month
  ) {
    return new Date(
      year,
      month + 1,
      0
    ).getDate()
  }

  function getFirstDayOfMonth(
    year,
    month
  ) {
    return new Date(
      year,
      month,
      1
    ).getDay()
  }

  function toDateString(date) {
    const year =
      date.getFullYear()

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    const day = String(
      date.getDate()
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getWeekDates(date) {
    const base = new Date(date)
    const day = base.getDay()

    const start = new Date(base)

    start.setDate(
      base.getDate() - day
    )

    return Array.from(
      { length: 7 },
      (_, index) => {
        const current =
          new Date(start)

        current.setDate(
          start.getDate() + index
        )

        return current
      }
    )
  }

  function formatTime(time) {
    if (!time) return ''

    const [hourString, minute] =
      time.split(':')

    const hour =
      Number(hourString)

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

  function formatDateText(
    dateString
  ) {
    if (!dateString) return ''

    const [
      year,
      month,
      day,
    ] = dateString.split('-')

    return `${year}. ${Number(
      month
    )}. ${Number(day)}.`
  }

  function formatListDate(
    dateString
  ) {
    if (!dateString) return ''

    const [
      year,
      month,
      day,
    ] = dateString.split('-')

    return `${year}.${month}.${day}`
  }

  function formatRequestDate(
    dateString
  ) {
    if (!dateString) return ''

    const date =
      new Date(dateString)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }

    return `${date.getFullYear()}.${String(
      date.getMonth() + 1
    ).padStart(2, '0')}.${String(
      date.getDate()
    ).padStart(2, '0')}`
  }

  const today = new Date()

  const currentYear =
    today.getFullYear()

  const currentMonth =
    today.getMonth()

  const daysInMonth =
    getDaysInMonth(
      currentYear,
      currentMonth
    )

  const firstDay =
    getFirstDayOfMonth(
      currentYear,
      currentMonth
    )

  const calendarDays = []

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {
    calendarDays.push(null)
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    calendarDays.push(day)
  }

  const weekDates =
    getWeekDates(today)

  // =========================
  // 검색 / 필터 적용
  // =========================

  const normalizedSearch =
    searchText.trim().toLowerCase()

  const filteredSchedules =
    useMemo(() => {
      return schedules.filter(
        (schedule) => {
          const matchesType =
            filterType === 'all' ||
            schedule.schedule_type ===
              filterType

          if (!matchesType) {
            return false
          }

          if (!normalizedSearch) {
            return true
          }

          const searchableText = [
            schedule.title,
            schedule.place,
            schedule.address,
            schedule.details,
            schedule.related_link,
            schedule.schedule_type,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return searchableText.includes(
            normalizedSearch
          )
        }
      )
    }, [
      schedules,
      filterType,
      normalizedSearch,
    ])

  const agendaSchedules =
    [...filteredSchedules].sort(
      (a, b) => {
        const dateCompare =
          a.event_date.localeCompare(
            b.event_date
          )

        if (
          dateCompare !== 0
        ) {
          return dateCompare
        }

        return (
          a.event_time ||
          '99:99'
        ).localeCompare(
          b.event_time ||
            '99:99'
        )
      }
    )

  function getSchedulesForDate(
    day
  ) {
    if (!day) return []

    const date = `${currentYear}-${String(
      currentMonth + 1
    ).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`

    return filteredSchedules.filter(
      (schedule) =>
        schedule.event_date ===
        date
    )
  }

  function getWeekSchedules(
    dateString
  ) {
    return filteredSchedules
      .filter(
        (schedule) =>
          schedule.event_date ===
          dateString
      )
      .sort((a, b) =>
        (
          a.event_time ||
          '99:99'
        ).localeCompare(
          b.event_time ||
            '99:99'
        )
      )
  }

  // =========================
  // 주간 시간표
  // =========================

  const weekDateStrings =
    weekDates.map(toDateString)

  const weekSchedules =
    filteredSchedules.filter(
      (schedule) =>
        weekDateStrings.includes(
          schedule.event_date
        )
    )

  const untimedWeekSchedules =
    weekSchedules
      .filter(
        (schedule) =>
          !schedule.event_time
      )
      .sort((a, b) =>
        a.event_date.localeCompare(
          b.event_date
        )
      )

  const timedWeekSchedules =
    weekSchedules.filter(
      (schedule) =>
        !!schedule.event_time
    )

  function getHourFromTime(
    time
  ) {
    if (!time) return null

    const hour = Number(
      time.split(':')[0]
    )

    return Number.isNaN(hour)
      ? null
      : hour
  }

  const timedHours =
    timedWeekSchedules
      .map((schedule) =>
        getHourFromTime(
          schedule.event_time
        )
      )
      .filter(
        (hour) => hour !== null
      )

  let weekStartHour = 8
  let weekEndHour = 23

  if (timedHours.length > 0) {
    const minHour = Math.min(
      ...timedHours
    )

    const maxHour = Math.max(
      ...timedHours
    )

    weekStartHour = Math.max(
      6,
      minHour - 1
    )

    weekEndHour = Math.min(
      24,
      Math.max(
        maxHour + 1,
        weekStartHour + 6
      )
    )
  }

  const weekTimeSlots =
    Array.from(
      {
        length:
          weekEndHour -
          weekStartHour +
          1,
      },
      (_, index) =>
        weekStartHour + index
    )

  function getSchedulesForHour(
    dateString,
    hour
  ) {
    return timedWeekSchedules.filter(
      (schedule) => {
        if (
          schedule.event_date !==
          dateString
        ) {
          return false
        }

        return (
          getHourFromTime(
            schedule.event_time
          ) === hour
        )
      }
    )
  }

  // =========================
  // 화면
  // =========================

  return (
    <div className="app">
      <header className="header">
        <div
          className="logo"
          onClick={() =>
            setPage('calendar')
          }
          style={{
            cursor: 'pointer',
          }}
        >
          <span className="logo-mark">
            YB
          </span>

          <span>
            YB Schedule Calendar
          </span>
        </div>

        <div className="header-right">
          {session && (
            <nav className="admin-nav">
              <button
                className={
                  page === 'calendar'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() =>
                  setPage('calendar')
                }
              >
                달력
              </button>

              {isAdmin && (
                <button
                  className={
                    page === 'list'
                      ? 'nav-button active'
                      : 'nav-button'
                  }
                  onClick={() =>
                    setPage('list')
                  }
                >
                  일정목록
                </button>
              )}

              <button
                className={
                  page === 'requests'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() => {
                  setPage('requests')

                  if (isAdmin) {
                    loadAllRequests()
                  } else {
                    loadMyRequests()
                  }
                }}
              >
                요청사항
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
            <h2>
              {isSignupMode
                ? '회원가입'
                : '로그인'}
            </h2>

            <form
              onSubmit={
                isSignupMode
                  ? handleSignup
                  : handleLogin
              }
            >
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
              />

              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
              />

              <button type="submit">
                {isSignupMode
                  ? '회원가입'
                  : '로그인'}
              </button>

              {loginError && (
                <p className="error-message">
                  {loginError}
                </p>
              )}

              {signupMessage && (
                <p className="success-message">
                  {signupMessage}
                </p>
              )}

              <button
                type="button"
                className="auth-switch-button"
                onClick={() => {
                  setIsSignupMode(
                    (prev) => !prev
                  )
                  setLoginError('')
                  setSignupMessage('')
                }}
              >
                {isSignupMode
                  ? '이미 계정이 있어요 → 로그인'
                  : '처음 오셨나요? → 회원가입'}
              </button>
            </form>
          </section>
        )}

        {page === 'list' &&
        isAdmin ? (
          <section className="schedule-list-page">
            <div className="list-page-header">
              <div>
                <p className="page-eyebrow">
                  ADMIN
                </p>

                <h1>일정목록</h1>

                <p className="page-description">
                  등록된 모든 일정을
                  관리합니다.
                </p>
              </div>

              <button
                className="add-schedule-button"
                onClick={
                  openNewScheduleForm
                }
              >
                + 일정 추가
              </button>
            </div>

            <div className="schedule-list">
              {schedules.length ===
              0 ? (
                <div className="empty-list">
                  등록된 일정이
                  없습니다.
                </div>
              ) : (
                schedules.map(
                  (schedule) => (
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
                                schedule
                                  .schedule_type
                              ] ||
                              '#777',
                          }}
                        >
                          {
                            schedule.schedule_type
                          }
                        </div>

                        <h3>
                          {
                            schedule.title
                          }
                        </h3>

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
                              {
                                schedule.place
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="list-item-actions">
                        <button
                          onClick={() =>
                            openEditForm(
                              schedule
                            )
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
                    </div>
                  )
                )
              )}
            </div>
          </section>
        ) : page ===
            'requests' &&
          session ? (
          <section className="schedule-list-page request-page">
            <div className="list-page-header">
              <div>
                <p className="page-eyebrow">
                  {isAdmin
                    ? 'ADMIN'
                    : 'MY REQUESTS'}
                </p>

                <h1>요청사항</h1>

                <p className="page-description">
                  {isAdmin
                    ? '이용자가 보낸 요청사항을 확인하고 반영 상태를 관리합니다.'
                    : '일정 추가나 수정이 필요한 경우 요청사항을 남겨주세요.'}
                </p>
              </div>

              {!isAdmin && (
                <button
                  className="add-schedule-button"
                  onClick={
                    openRequestForm
                  }
                >
                  + 요청사항
                </button>
              )}
            </div>

            {isAdmin ? (
              requestLoading ? (
                <div className="empty-list">
                  요청사항을
                  불러오는 중입니다.
                </div>
              ) : allRequests.length ===
                0 ? (
                <div className="empty-list">
                  등록된 요청사항이
                  없습니다.
                </div>
              ) : (
                <div className="request-admin-list">
                  {allRequests.map(
                    (request) => (
                      <div
                        className="request-admin-item"
                        key={request.id}
                      >
                        <div className="request-admin-top">
                          <div>
                            <span className="request-type-badge">
                              {
                                request.request_type
                              }
                            </span>

                            <h3>
                              {
                                request.title
                              }
                            </h3>
                          </div>

                          <button
                            className={
                              request.status ===
                              '반영 완료'
                                ? 'request-status-button completed'
                                : 'request-status-button'
                            }
                            onClick={() =>
                              handleToggleRequestStatus(
                                request
                              )
                            }
                          >
                            {
                              request.status
                            }
                          </button>
                        </div>

                        <p className="request-details">
                          {
                            request.details
                          }
                        </p>

                        <div className="request-meta">
                          <span>
                            {
                              request.submitter_email
                            }
                          </span>

                          <span>
                            {formatRequestDate(
                              request.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )
            ) : myRequests.length ===
              0 ? (
              <div className="empty-list">
                아직 등록한
                요청사항이 없습니다.
              </div>
            ) : (
              <div className="my-request-list">
                {myRequests.map(
                  (request) => (
                    <div
                      className="my-request-item"
                      key={request.id}
                    >
                      <div className="my-request-main">
                        <div className="my-request-type">
                          {
                            request.request_type
                          }
                        </div>

                        <h3>
                          {
                            request.title
                          }
                        </h3>

                        <p>
                          {
                            request.details
                          }
                        </p>

                        <span>
                          {formatRequestDate(
                            request.created_at
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          request.status ===
                          '반영 완료'
                            ? 'my-request-status completed'
                            : 'my-request-status'
                        }
                      >
                        {
                          request.status
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="calendar-section">
            <div className="calendar-header">
              <div className="calendar-title-row">
                <h1>
                  {currentYear}.{' '}
                  {String(
                    currentMonth + 1
                  ).padStart(2, '0')}
                </h1>

                <select
                  className="calendar-view-select"
                  value={calendarView}
                  onChange={(e) =>
                    setCalendarView(
                      e.target.value
                    )
                  }
                  aria-label="Calendar view"
                >
                  <option value="month">
                    Month
                  </option>

                  <option value="week">
                    Week
                  </option>

                  <option value="agenda">
                    Agenda
                  </option>
                </select>
              </div>

              {isAdmin && (
                <button
                  className="add-schedule-button"
                  onClick={
                    openNewScheduleForm
                  }
                >
                  + 일정 추가
                </button>
              )}
            </div>

            {/* =========================
                검색 / 필터
               ========================= */}
            <div className="calendar-tools">
              <div className="calendar-search">
                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="search"
                  value={searchText}
                  onChange={(e) =>
                    setSearchText(
                      e.target.value
                    )
                  }
                  placeholder="일정 검색"
                  aria-label="일정 검색"
                />

              </div>

              <select
                className="schedule-filter"
                value={filterType}
                onChange={(e) =>
                  setFilterType(
                    e.target.value
                  )
                }
                aria-label="일정 유형 필터"
              >
                <option value="all">
                  전체 유형
                </option>

                {TYPE_OPTIONS.map(
                  (type) => (
                    <option
                      value={type}
                      key={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>

            {(searchText ||
              filterType !== 'all') && (
              <div className="filter-result-info">
                {filteredSchedules.length}개
                일정
                {searchText && (
                  <>
                    {' '}
                    · "{searchText}"
                  </>
                )}
                {filterType !==
                  'all' && (
                  <>
                    {' '}
                    · {filterType}
                  </>
                )}
              </div>
            )}

            {/* =========================
                MONTH
               ========================= */}
            {calendarView ===
              'month' && (
              <div className="calendar-card">
                <div className="weekdays">
                  {WEEKDAYS.map(
                    (day) => (
                      <div key={day}>
                        {day}
                      </div>
                    )
                  )}
                </div>

                <div className="calendar-grid">
                  {calendarDays.map(
                    (day, index) => {
                      const daySchedules =
                        getSchedulesForDate(
                          day
                        )

                      const isToday =
                        day ===
                          today.getDate() &&
                        currentMonth ===
                          today.getMonth() &&
                        currentYear ===
                          today.getFullYear()

                      return (
                        <button
                          key={index}
                          className={`calendar-day ${
                            isToday
                              ? 'today'
                              : ''
                          }`}
                          onClick={() => {
                            if (!day)
                              return

                            handleDateStringClick(
                              `${currentYear}-${String(
                                currentMonth +
                                  1
                              ).padStart(
                                2,
                                '0'
                              )}-${String(
                                day
                              ).padStart(
                                2,
                                '0'
                              )}`
                            )
                          }}
                          disabled={!day}
                        >
                          {day && (
                            <>
                              <span className="date-number">
                                {day}
                              </span>

                              <div className="events">
                                {daySchedules.map(
                                  (
                                    schedule
                                  ) => (
                                    <div
                                      className="event"
                                      key={
                                        schedule.id
                                      }
                                    >
                                      <span
                                        className="event-dot"
                                        style={{
                                          backgroundColor:
                                            TYPE_COLORS[
                                              schedule
                                                .schedule_type
                                            ] ||
                                            '#999',
                                        }}
                                      />

                                      <span className="event-title">
                                        {
                                          schedule.title
                                        }
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </>
                          )}
                        </button>
                      )
                    }
                  )}
                </div>
              </div>
            )}

            {/* =========================
                WEEK - 시간표
               ========================= */}
            {calendarView ===
              'week' && (
              <div className="week-timetable-card">
                {untimedWeekSchedules.length >
                  0 && (
                  <div className="untimed-section">
                    <div className="untimed-title">
                      시간 미정
                    </div>

                    <div className="untimed-list">
                      {untimedWeekSchedules.map(
                        (schedule) => (
                          <button
                            className="untimed-event"
                            key={
                              schedule.id
                            }
                            onClick={() =>
                              handleEventClick(
                                schedule
                              )
                            }
                          >
                            <span
                              className="week-event-dot"
                              style={{
                                backgroundColor:
                                  TYPE_COLORS[
                                    schedule
                                      .schedule_type
                                  ] ||
                                  '#999',
                              }}
                            />

                            <span className="untimed-date">
                              {WEEKDAYS[
                                new Date(
                                  `${schedule.event_date}T00:00:00`
                                ).getDay()
                              ]}{' '}
                              {Number(
                                schedule.event_date.slice(
                                  8,
                                  10
                                )
                              )}
                              일
                            </span>

                            <span className="untimed-name">
                              {
                                schedule.title
                              }
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="timetable-scroll">
                  <div className="timetable">
                    <div className="timetable-header">
                      <div className="time-column-head" />

                      {weekDates.map(
                        (date) => {
                          const dateString =
                            toDateString(
                              date
                            )

                          const isToday =
                            dateString ===
                            toDateString(
                              today
                            )

                          const daySchedules =
                            getWeekSchedules(
                              dateString
                            )

                          return (
                            <button
                              className={`timetable-day-head ${
                                isToday
                                  ? 'today'
                                  : ''
                              }`}
                              key={
                                dateString
                              }
                              onClick={() =>
                                handleDateStringClick(
                                  dateString
                                )
                              }
                            >
                              <span>
                                {
                                  WEEKDAYS[
                                    date.getDay()
                                  ]
                                }
                              </span>

                              <strong>
                                {date.getMonth() +
                                  1}
                                .
                                {date.getDate()}
                              </strong>

                              {daySchedules.length >
                                0 && (
                                <small>
                                  {
                                    daySchedules.length
                                  }
                                </small>
                              )}
                            </button>
                          )
                        }
                      )}
                    </div>

                    <div className="timetable-body">
                      {weekTimeSlots.map(
                        (hour) => (
                          <div
                            className="timetable-row"
                            key={hour}
                          >
                            <div className="time-label">
                              {formatTime(
                                `${String(
                                  hour
                                ).padStart(
                                  2,
                                  '0'
                                )}:00`
                              )}
                            </div>

                            {weekDates.map(
                              (date) => {
                                const dateString =
                                  toDateString(
                                    date
                                  )

                                const cellSchedules =
                                  getSchedulesForHour(
                                    dateString,
                                    hour
                                  )

                                return (
                                  <div
                                    className="timetable-cell"
                                    key={`${dateString}-${hour}`}
                                  >
                                    {cellSchedules.map(
                                      (
                                        schedule
                                      ) => (
                                        <button
                                          className="timetable-event"
                                          key={
                                            schedule.id
                                          }
                                          onClick={() =>
                                            handleEventClick(
                                              schedule
                                            )
                                          }
                                          style={{
                                            borderLeftColor:
                                              TYPE_COLORS[
                                                schedule
                                                  .schedule_type
                                              ] ||
                                              '#999',
                                          }}
                                        >
                                          <span className="timetable-event-time">
                                            {schedule.event_time?.slice(
                                              0,
                                              5
                                            )}
                                          </span>

                                          <span className="timetable-event-title">
                                            {
                                              schedule.title
                                            }
                                          </span>
                                        </button>
                                      )
                                    )}
                                  </div>
                                )
                              }
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {timedWeekSchedules.length ===
                  0 &&
                  untimedWeekSchedules.length ===
                    0 && (
                    <div className="week-no-results">
                      이 주에는 표시할 일정이
                      없습니다.
                    </div>
                  )}
              </div>
            )}

            {/* =========================
                AGENDA
               ========================= */}
            {calendarView ===
              'agenda' && (
              <div className="agenda-view-card">
                {agendaSchedules.length ===
                0 ? (
                  <div className="agenda-empty">
                    {searchText ||
                    filterType !== 'all'
                      ? '검색 조건에 맞는 일정이 없습니다.'
                      : '등록된 일정이 없습니다.'}
                  </div>
                ) : (
                  agendaSchedules.map(
                    (schedule) => (
                      <button
                        className="agenda-item"
                        key={schedule.id}
                        onClick={() =>
                          handleDateStringClick(
                            schedule.event_date
                          )
                        }
                      >
                        <div className="agenda-date">
                          <strong>
                            {formatDateText(
                              schedule.event_date
                            )}
                          </strong>

                          <span>
                            {
                              WEEKDAYS[
                                new Date(
                                  `${schedule.event_date}T00:00:00`
                                ).getDay()
                              ]
                            }
                            요
                          </span>
                        </div>

                        <span
                          className="agenda-type-dot"
                          style={{
                            backgroundColor:
                              TYPE_COLORS[
                                schedule
                                  .schedule_type
                              ] ||
                              '#999',
                          }}
                        />

                        <div className="agenda-main">
                          <strong>
                            {
                              schedule.title
                            }
                          </strong>

                          <span>
                            {schedule.event_time
                              ? formatTime(
                                  schedule.event_time
                                )
                              : '시간 미정'}

                            {schedule.place
                              ? ` · ${schedule.place}`
                              : ''}
                          </span>
                        </div>

                        <span className="agenda-arrow">
                          ›
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* =========================
          일정 상세
         ========================= */}
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
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <h2>
                {formatDateText(
                  selectedDate
                )}
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
              {selectedSchedules.length ===
              0 ? (
                <p>
                  등록된 일정이
                  없습니다.
                </p>
              ) : (
                selectedSchedules.map(
                  (schedule) => (
                    <div
                      className="schedule-item"
                      key={schedule.id}
                    >
                      <div
                        className="detail-type"
                        style={{
                          backgroundColor:
                            TYPE_COLORS[
                              schedule
                                .schedule_type
                            ] ||
                            '#999',
                        }}
                      >
                        {
                          schedule.schedule_type
                        }
                      </div>

                      <h3>
                        {schedule.title}
                      </h3>

                      <div className="detail-row">
                        <strong>
                          일시
                        </strong>

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
                          <strong>
                            장소
                          </strong>

                          <span>
                            {
                              schedule.place
                            }
                          </span>
                        </div>
                      )}

                      {schedule.address && (
                        <div className="detail-row">
                          <strong>
                            주소
                          </strong>

                          <span>
                            {
                              schedule.address
                            }
                          </span>
                        </div>
                      )}

                      {schedule.details && (
                        <div className="detail-section">
                          <strong>
                            참고 사항
                          </strong>

                          <p>
                            {
                              schedule.details
                            }
                          </p>
                        </div>
                      )}

                      {schedule.related_link && (
                        <div className="detail-section">
                          <strong>
                            참고 링크
                          </strong>

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

                      {session?.user && (
                        <div className="memo-section">
                          <div className="memo-heading">
                            <div>
                              <strong>
                                내 메모
                              </strong>

                              <span>
                                로그인한 계정에서만 볼 수 있어요.
                              </span>
                            </div>

                            {memos[
                              schedule.id
                            ] && (
                              <div className="memo-actions">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMemoId(
                                      schedule.id
                                    )

                                    setMemoText(
                                      (
                                        prev
                                      ) => ({
                                        ...prev,
                                        [schedule.id]:
                                          memos[
                                            schedule.id
                                          ].content,
                                      })
                                    )
                                  }}
                                >
                                  ✏️
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteMemo(
                                      schedule.id
                                    )
                                  }
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>

                          {memos[
                            schedule.id
                          ] &&
                          editingMemoId !==
                            schedule.id ? (
                            <div className="memo-view">
                              {
                                memos[
                                  schedule.id
                                ].content
                              }
                            </div>
                          ) : (
                            <div className="memo-editor">
                              <textarea
                                value={
                                  memoText[
                                    schedule.id
                                  ] || ''
                                }
                                onChange={(e) =>
                                  setMemoText(
                                    (
                                      prev
                                    ) => ({
                                      ...prev,
                                      [schedule.id]:
                                        e.target
                                          .value,
                                    })
                                  )
                                }
                                placeholder="이 일정에 대한 메모를 남겨보세요."
                                rows="2"
                              />

                              <button
                                type="button"
                                className="memo-save-button"
                                onClick={() =>
                                  handleSaveMemo(
                                    schedule.id
                                  )
                                }
                                disabled={
                                  memoSaving ===
                                  schedule.id
                                }
                              >
                                {memoSaving ===
                                schedule.id
                                  ? '저장 중...'
                                  : '저장'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="admin-actions">
                          <button
                            onClick={() =>
                              openEditForm(
                                schedule
                              )
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
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          일정 추가 / 수정
         ========================= */}
      {showForm &&
        isAdmin && (
          <div
            className="overlay"
            onClick={closeForm}
          >
            <div
              className="bottom-sheet schedule-form-sheet"
              onClick={(e) =>
                e.stopPropagation()
              }
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
                onSubmit={
                  handleSaveSchedule
                }
              >
                <label>
                  제목 *
                  <input
                    name="title"
                    value={form.title}
                    onChange={
                      handleFormChange
                    }
                    placeholder="예: 중앙대학교 축제"
                  />
                </label>

                <label>
                  유형 *
                  <select
                    name="schedule_type"
                    value={
                      form.schedule_type
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="방송">
                      방송
                    </option>

                    <option value="지역축제/행사">
                      지역축제/행사
                    </option>

                    <option value="기념일">
                      기념일
                    </option>

                    <option value="대학축제">
                      대학축제
                    </option>
                  </select>
                </label>

                <label>
                  날짜 *
                  <input
                    type="date"
                    name="event_date"
                    value={
                      form.event_date
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </label>

                <label>
                  시간
                  <input
                    type="time"
                    name="event_time"
                    value={
                      form.event_time
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </label>

                <label>
                  장소
                  <input
                    name="place"
                    value={form.place}
                    onChange={
                      handleFormChange
                    }
                    placeholder="장소"
                  />
                </label>

                <label>
                  주소 / 지도
                  <input
                    name="address"
                    value={form.address}
                    onChange={
                      handleFormChange
                    }
                    placeholder="주소 또는 지도 링크"
                  />
                </label>

                <label>
                  참고 사항
                  <textarea
                    name="details"
                    value={form.details}
                    onChange={
                      handleFormChange
                    }
                    placeholder="참고 사항"
                    rows="3"
                  />
                </label>

                <label>
                  참고 링크
                  <input
                    name="related_link"
                    value={
                      form.related_link
                    }
                    onChange={
                      handleFormChange
                    }
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

      {/* =========================
          요청사항 작성
         ========================= */}
      {showRequestForm &&
        session && (
          <div
            className="overlay"
            onClick={
              closeRequestForm
            }
          >
            <div
              className="bottom-sheet request-form-sheet"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="sheet-handle" />

              <div className="sheet-header">
                <h2>
                  요청사항
                </h2>

                <button
                  className="close-button"
                  onClick={
                    closeRequestForm
                  }
                >
                  ×
                </button>
              </div>

              <form
                className="schedule-form"
                onSubmit={
                  handleSubmitRequest
                }
              >
                <label>
                  요청 유형 *
                  <select
                    name="request_type"
                    value={
                      requestForm.request_type
                    }
                    onChange={
                      handleRequestFormChange
                    }
                  >
                    <option value="일정 추가">
                      일정 추가
                    </option>

                    <option value="일정 수정">
                      일정 수정
                    </option>

                    <option value="기타">
                      기타
                    </option>
                  </select>
                </label>

                <label>
                  제목 *
                  <input
                    name="title"
                    value={
                      requestForm.title
                    }
                    onChange={
                      handleRequestFormChange
                    }
                    placeholder="예: 10월 일정 추가 요청"
                  />
                </label>

                <label>
                  요청 내용 *
                  <textarea
                    name="details"
                    value={
                      requestForm.details
                    }
                    onChange={
                      handleRequestFormChange
                    }
                    placeholder="추가하거나 수정했으면 하는 내용을 적어주세요."
                    rows="5"
                  />
                </label>

                <p className="request-user-info">
                  요청자:{' '}
                  {session.user.email}
                </p>

                {requestError && (
                  <p className="error-message">
                    {requestError}
                  </p>
                )}

                <button
                  className="save-schedule-button"
                  type="submit"
                  disabled={
                    requestSaving
                  }
                >
                  {requestSaving
                    ? '등록 중...'
                    : '요청사항 등록'}
                </button>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}

export default App
