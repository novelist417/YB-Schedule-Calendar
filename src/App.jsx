import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const TYPE_COLORS = {
  방송: '#1B7FEB',
  '지역축제/행사': '#7C5CFF',
  기념일: '#FFE300',
  대학축제: '#03B00A',
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
  end_date: '',
  end_time: '',
  place: '',
  address: '',
  details: '',
  related_link: '',
  related_link_text: '',
}

const EMPTY_REQUEST_FORM = {
  title: '',
  request_type: '일정 추가',
  details: '',
}

const WEEKDAYS = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
]

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSignupMode, setIsSignupMode] = useState(false)
  const [signupMessage, setSignupMessage] = useState('')
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const [schedules, setSchedules] = useState([])
  const [scheduleLoadError, setScheduleLoadError] = useState('')

  // 날짜 선택 → 일정 목록
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSchedules, setSelectedSchedules] = useState([])

  // 일정 목록 → 특정 일정 상세
  const [selectedSchedule, setSelectedSchedule] = useState(null)

  const [page, setPage] = useState('calendar')
  const [calendarView, setCalendarView] = useState('month')

  const [calendarCursor, setCalendarCursor] = useState(
    new Date()
  )

  const timetableScrollRef = useRef(null)

  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // 개인 메모
  const [memos, setMemos] = useState({})
  const [memoText, setMemoText] = useState({})
  const [editingMemoId, setEditingMemoId] = useState(null)
  const [memoSaving, setMemoSaving] = useState(null)

  // 요청사항
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [requestForm, setRequestForm] = useState(
    EMPTY_REQUEST_FORM
  )
  const [requestSaving, setRequestSaving] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [myRequests, setMyRequests] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [requestLoading, setRequestLoading] = useState(false)

  // 관리자 요청사항 필터
  const [requestStatusFilter, setRequestStatusFilter] =
    useState('pending')

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
          setEditingRequest(null)
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

  useEffect(() => {
    if (
      page !== 'calendar' ||
      calendarView !== 'week'
    ) {
      return
    }

    const resetTimetableScroll = () => {
      const element = timetableScrollRef.current

      if (!element) return

      element.scrollTop = 0
      element.scrollLeft = 0
    }

    const frame = window.requestAnimationFrame(
      resetTimetableScroll
    )

    return () =>
      window.cancelAnimationFrame(frame)
  }, [
    page,
    calendarView,
    calendarCursor,
  ])

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
    setScheduleLoadError('')

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true })

    if (error) {
      console.error('일정 조회 실패:', error)
      setScheduleLoadError(
        `일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.\n${error.message}`
      )
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
      return
    }

    setShowAuthPrompt(false)
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
      setShowAuthPrompt(false)
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
    setSelectedSchedule(null)
    setMemos({})
    setMemoText({})
    setEditingMemoId(null)
    setMyRequests([])
    setAllRequests([])
    setEditingRequest(null)
    setShowRequestForm(false)
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
      end_date: schedule.end_date || '',
      end_time: schedule.end_time
        ? schedule.end_time.slice(0, 5)
        : '',
      place: schedule.place || '',
      address: schedule.address || '',
      details: schedule.details || '',
      related_link: schedule.related_link || '',
      related_link_text:
        schedule.related_link_text || '',
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
        '시작 날짜를 선택해주세요.'
      )
      return
    }

    if (
      form.end_date &&
      form.end_date < form.event_date
    ) {
      setFormError(
        '종료 일자는 시작 일자보다 빠를 수 없습니다.'
      )
      return
    }

    const effectiveEndDate =
      form.end_date ||
      (form.end_time
        ? form.event_date
        : '')

    if (
      effectiveEndDate ===
        form.event_date &&
      form.event_time &&
      form.end_time &&
      form.end_time < form.event_time
    ) {
      setFormError(
        '같은 날짜라면 종료 시간은 시작 시간보다 빠를 수 없습니다.'
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
      end_date: effectiveEndDate || null,
      end_time: form.end_time || null,
      place: form.place.trim() || null,
      address: form.address.trim() || null,
      details: form.details.trim() || null,
      related_link:
        form.related_link.trim() || null,
      related_link_text:
        form.related_link_text.trim() || null,
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
    setSelectedSchedule(null)
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
    setSelectedSchedule(null)
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

  function isScheduleOnDate(
    schedule,
    dateString
  ) {
    if (
      !schedule?.event_date ||
      !dateString
    ) {
      return false
    }

    const startDate =
      schedule.event_date

    const endDate =
      schedule.end_date ||
      startDate

    return (
      dateString >= startDate &&
      dateString <= endDate
    )
  }

  async function handleDateStringClick(
    date
  ) {
    if (!date) return

    const daySchedules =
      schedules
        .filter(
          (schedule) =>
            isScheduleOnDate(
              schedule,
              date
            )
        )
        .sort((a, b) => {
          const timeCompare = (
            a.event_time || '99:99'
          ).localeCompare(
            b.event_time || '99:99'
          )

          if (timeCompare !== 0) {
            return timeCompare
          }

          return a.title.localeCompare(
            b.title
          )
        })

    setSelectedDate(date)
    setSelectedSchedules(
      daySchedules
    )
    setSelectedSchedule(null)

    await loadMemos(
      daySchedules.map(
        (schedule) => schedule.id
      )
    )
  }

  async function handleEventClick(
    schedule,
    dateString = schedule?.event_date
  ) {
    if (!schedule) return

    const targetDate =
      dateString || schedule.event_date

    const daySchedules =
      schedules
        .filter((item) =>
          isScheduleOnDate(
            item,
            targetDate
          )
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

    setSelectedDate(targetDate)
    setSelectedSchedules(daySchedules)
    setSelectedSchedule(schedule)

    await loadMemos(
      daySchedules.map(
        (item) => item.id
      )
    )
  }

  function openAuthPrompt() {
    setLoginError('')
    setSignupMessage('')
    setShowAuthPrompt(true)
  }

  function closeAuthPrompt() {
    setShowAuthPrompt(false)
    setLoginError('')
    setSignupMessage('')
  }

  function closeScheduleOverlay() {
    setSelectedDate(null)
    setSelectedSchedules([])
    setSelectedSchedule(null)
  }

  function backToScheduleList() {
    setSelectedSchedule(null)
    setEditingMemoId(null)
  }

  // =========================
  // 요청사항
  // =========================

  function openRequestForm() {
    setEditingRequest(null)

    setRequestForm(
      EMPTY_REQUEST_FORM
    )

    setRequestError('')
    setShowRequestForm(true)
  }

  function openEditRequestForm(request) {
    setEditingRequest(request)

    setRequestForm({
      title: request.title || '',
      request_type:
        request.request_type === '기타'
          ? '개선사항'
          : request.request_type || '일정 추가',
      details: request.details || '',
    })

    setRequestError('')
    setShowRequestForm(true)
  }

  function closeRequestForm() {
    setShowRequestForm(false)
    setEditingRequest(null)
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

    let result

    if (editingRequest) {
      if (
        editingRequest.submitter_email?.toLowerCase() !==
        session.user.email?.toLowerCase()
      ) {
        setRequestError(
          '본인이 작성한 요청사항만 수정할 수 있습니다.'
        )
        setRequestSaving(false)
        return
      }

      result = await supabase
        .from('schedule_requests')
        .update({
          title:
            requestForm.title.trim(),
          request_type:
            requestForm.request_type,
          details:
            requestForm.details.trim(),
        })
        .eq('id', editingRequest.id)
        .eq(
          'submitter_email',
          session.user.email
        )
    } else {
      result = await supabase
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
    }

    if (result.error) {
      console.error(
        editingRequest
          ? '요청사항 수정 실패:'
          : '요청사항 등록 실패:',
        result.error
      )

      setRequestError(
        result.error.message
      )
      setRequestSaving(false)
      return
    }

    await loadMyRequests()

    if (isAdmin) {
      await loadAllRequests()
    }

    setRequestSaving(false)
    closeRequestForm()

    alert(
      editingRequest
        ? '요청사항이 수정되었습니다.'
        : '요청사항이 등록되었습니다.'
    )
  }

  async function handleDeleteRequest(
    request
  ) {
    if (!session?.user) return

    if (
      request.submitter_email?.toLowerCase() !==
      session.user.email?.toLowerCase()
    ) {
      return
    }

    const confirmed = window.confirm(
      `"${request.title}" 요청사항을 삭제할까요?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('schedule_requests')
      .delete()
      .eq('id', request.id)
      .eq(
        'submitter_email',
        session.user.email
      )

    if (error) {
      console.error(
        '요청사항 삭제 실패:',
        error
      )

      alert(
        `삭제에 실패했습니다.\n${error.message}`
      )

      return
    }

    await loadMyRequests()

    if (isAdmin) {
      await loadAllRequests()
    }
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

    return `${year}.${month}.${day}.`
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

  function formatScheduleDateTime(
    schedule
  ) {
    if (!schedule?.event_date) {
      return ''
    }

    const startDate =
      formatDateText(
        schedule.event_date
      )

    const endDate =
      schedule.end_date &&
      schedule.end_date !==
        schedule.event_date
        ? formatDateText(
            schedule.end_date
          )
        : ''

    const startTime =
      schedule.event_time
        ? formatTime(
            schedule.event_time
          )
        : ''

    const endTime =
      schedule.end_time
        ? formatTime(
            schedule.end_time
          )
        : ''

    let result = startDate

    if (startTime) {
      result += ` ${startTime}`
    }

    if (endDate) {
      result += ` ~ ${endDate}`

      if (endTime) {
        result += ` ${endTime}`
      }
    } else if (endTime) {
      result += ` ~ ${endTime}`
    }

    return result
  }

  function formatScheduleTimeRange(
    schedule
  ) {
    const startTime =
      schedule.event_time
        ? formatTime(
            schedule.event_time
          )
        : ''

    const endTime =
      schedule.end_time
        ? formatTime(
            schedule.end_time
          )
        : ''

    if (startTime && endTime) {
      return `${startTime} ~ ${endTime}`
    }

    if (startTime) {
      return startTime
    }

    if (endTime) {
      return `~ ${endTime}`
    }

    if (
      schedule.schedule_type ===
      '기념일'
    ) {
      return ''
    }

    return '시간 미정'
  }

  function isSameDay(
    first,
    second
  ) {
    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
    )
  }

  function getMonthTitle(date) {
    return `${date.getFullYear()}. ${String(
      date.getMonth() + 1
    ).padStart(2, '0')}`
  }

  function getWeekTitle(dates) {
    if (!dates.length) return ''

    const first = dates[0]
    const last =
      dates[dates.length - 1]

    const firstText = `${first.getFullYear()}. ${String(
      first.getMonth() + 1
    ).padStart(2, '0')}. ${String(
      first.getDate()
    ).padStart(2, '0')}`

    const lastText = `${last.getFullYear()}. ${String(
      last.getMonth() + 1
    ).padStart(2, '0')}. ${String(
      last.getDate()
    ).padStart(2, '0')}`

    return `${firstText} ~ ${lastText}`
  }

  function moveCalendar(
    direction
  ) {
    setCalendarCursor(
      (prev) => {
        const next =
          new Date(prev)

        if (
          calendarView === 'week'
        ) {
          next.setDate(
            next.getDate() +
              direction * 7
          )
        } else {
          next.setMonth(
            next.getMonth() +
              direction
          )
          next.setDate(1)
        }

        return next
      }
    )
  }

  function moveToToday() {
    setCalendarCursor(
      new Date()
    )
  }

  const today = new Date()

  const currentYear =
    calendarCursor.getFullYear()

  const currentMonth =
    calendarCursor.getMonth()

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
    getWeekDates(
      calendarCursor
    )

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
            schedule.related_link_text,
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

  const agendaMonthStart = `${currentYear}-${String(
    currentMonth + 1
  ).padStart(2, '0')}-01`

  const agendaMonthEnd = `${currentYear}-${String(
    currentMonth + 1
  ).padStart(2, '0')}-${String(
    daysInMonth
  ).padStart(2, '0')}`

  const agendaSchedules =
    [...filteredSchedules]
      .filter((schedule) => {
        const scheduleStart =
          schedule.event_date

        const scheduleEnd =
          schedule.end_date ||
          schedule.event_date

        return (
          scheduleStart <=
            agendaMonthEnd &&
          scheduleEnd >=
            agendaMonthStart
        )
      })
      .sort((a, b) => {
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
      })

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
        isScheduleOnDate(
          schedule,
          date
        )
    )
  }

  function getWeekSchedules(
    dateString
  ) {
    return filteredSchedules
      .filter(
        (schedule) =>
          isScheduleOnDate(
            schedule,
            dateString
          )
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
        weekDateStrings.some(
          (dateString) =>
            isScheduleOnDate(
              schedule,
              dateString
            )
        )
    )

  const untimedWeekSchedules =
    weekSchedules
      .filter(
        (schedule) =>
          !schedule.event_time &&
          schedule.schedule_type !==
            '기념일'
      )
      .sort((a, b) =>
        a.event_date.localeCompare(
          b.event_date
        )
      )

  const untimedAnniversarySchedules =
    weekSchedules
      .filter(
        (schedule) =>
          schedule.schedule_type ===
            '기념일' &&
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

  function getMinutesFromTime(
    time
  ) {
    if (!time) return null

    const [
      hourString,
      minuteString,
    ] = time.split(':')

    const hour = Number(
      hourString
    )

    const minute = Number(
      minuteString
    )

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return null
    }

    return hour * 60 + minute
  }

  const weekStartHour = 6
  const weekEndHour = 23
  const weekStartMinutes =
    weekStartHour * 60
  const weekEndMinutes =
    (weekEndHour + 1) * 60

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

  function getScheduleTimeRange(
    schedule,
    dateString
  ) {
    const startDate =
      schedule.event_date

    const endDate =
      schedule.end_date ||
      startDate

    const startMinutes =
      getMinutesFromTime(
        schedule.event_time
      )

    const endMinutes =
      getMinutesFromTime(
        schedule.end_time
      )

    if (startMinutes === null) {
      return null
    }

    let rangeStart = 0
    let rangeEnd = 24 * 60

    if (dateString === startDate) {
      rangeStart = startMinutes
    }

    if (dateString === endDate) {
      rangeEnd =
        endMinutes !== null
          ? endMinutes
          : 24 * 60
    }

    if (startDate === endDate) {
      if (endMinutes === null) {
        rangeEnd = Math.min(
          startMinutes + 60,
          24 * 60
        )
      } else if (
        rangeEnd <= rangeStart
      ) {
        rangeEnd = Math.min(
          rangeStart + 60,
          24 * 60
        )
      }
    }

    return {
      start: rangeStart,
      end: rangeEnd,
    }
  }

  function getTimedSchedulesForDate(
    dateString
  ) {
    return timedWeekSchedules
      .filter((schedule) =>
        isScheduleOnDate(
          schedule,
          dateString
        )
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

  function getAnniversariesForDate(
    dateString
  ) {
    return untimedAnniversarySchedules.filter(
      (schedule) =>
        isScheduleOnDate(
          schedule,
          dateString
        )
    )
  }

  async function handleWeekBlankClick(
    dateString
  ) {
    const anniversaries =
      getAnniversariesForDate(
        dateString
      )

    if (anniversaries.length === 1) {
      await handleEventClick(
        anniversaries[0],
        dateString
      )
    } else if (
      anniversaries.length > 1
    ) {
      setSelectedDate(dateString)
      setSelectedSchedules(
        anniversaries
      )
      setSelectedSchedule(null)
      await loadMemos(
        anniversaries.map(
          (schedule) => schedule.id
        )
      )
    }
  }

  // =========================
  // 관리자 요청사항 필터
  // =========================

  const filteredAdminRequests =
    useMemo(() => {
      if (
        requestStatusFilter ===
        'completed'
      ) {
        return allRequests.filter(
          (request) =>
            request.status ===
            '반영 완료'
        )
      }

      return allRequests.filter(
        (request) =>
          request.status !==
          '반영 완료'
      )
    }, [
      allRequests,
      requestStatusFilter,
    ])

  // =========================
  // 화면
  // =========================

  return (
    <div className="app">
      <style>{`
        .yb-logo-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 8px;
          background: transparent;
          color: #fff;
          font-size: 22px;
          font-weight: 950;
          font-style: italic;
          letter-spacing: -7px;
          line-height: 1;
          transform: skewX(-8deg);
        }

        .yb-logo-y,
        .yb-logo-b {
          display: inline-block;
        }

        .yb-logo-y {
          transform: translateY(-1px);
        }

        .yb-logo-b {
          transform: translate(4px, 1px);
        }

        .logo-title {
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .timetable-body {
          position: relative;
        }

        .timetable-row {
          height: 72px !important;
          min-height: 72px !important;
        }

        .timetable-events-layer {
          position: absolute;
          inset: 0 0 0 82px;
          display: grid;
          grid-template-columns: repeat(7, minmax(95px, 1fr));
          pointer-events: none;
          z-index: 5;
        }

        .timetable-day-event-layer {
          position: relative;
          min-width: 0;
          height: 100%;
          padding: 0 4px;
        }

        .timetable-event {
          position: absolute;
          left: 4px;
          right: 4px;
          margin: 0;
          min-height: 24px;
          padding: 5px 6px 5px 8px;
          overflow: hidden;
          border: 0;
          border-left: 3px solid var(--event-color, #999);
          border-radius: 7px;
          z-index: 2;
          background: color-mix(
            in srgb,
            var(--event-color, #999) 18%,
            #181818
          );
          color: #fff;
          text-align: left;
          cursor: pointer;
          pointer-events: auto;
          box-sizing: border-box;
        }

        .timetable-event:hover {
          filter: brightness(0.97);
        }

        .timetable-event-time {
          display: block;
          margin-bottom: 2px;
          color: #c0c0c0;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.2;
        }

        .timetable-event-title {
          display: -webkit-box;
          overflow: hidden;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.3;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .timetable-anniversary {
          position: absolute;
          inset: 0 3px 0 3px;
          min-height: 0;
          padding: 10px 8px;
          border: 1px solid rgba(255, 227, 0, 0.55);
          border-radius: 6px;
          background: rgba(255, 227, 0, 0.13);
          color: #fff;
          text-align: left;
          cursor: pointer;
          pointer-events: auto;
          box-sizing: border-box;
          z-index: 1;
        }

        .timetable-anniversary span {
          display: inline-flex;
          margin-bottom: 5px;
          padding: 2px 5px;
          border-radius: 4px;
          background: rgba(255, 227, 0, 0.18);
          color: #FFE300;
          font-size: 9px;
          font-weight: 900;
        }

        .timetable-anniversary strong {
          display: block;
          overflow: hidden;
          color: #fff;
          font-size: 11px;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: normal;
          text-shadow: 0 1px 3px rgba(0,0,0,0.45);
        }

        .timetable-anniversary-badge {
          display: inline-flex !important;
          margin-top: 4px;
          padding: 2px 5px;
          border-radius: 5px;
          background: rgba(255, 227, 0, 0.18);
          color: #FFE300 !important;
          font-size: 9px !important;
          font-weight: 800;
        }

        .list-item-date {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          flex: 0 0 120px;
          min-width: 0;
        }

        .list-item-date-text {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
        }

        .list-item-date-mobile {
          display: none;
        }

        .list-item-time-text {
          color: #777;
          font-size: 11px;
          line-height: 1.2;
          white-space: normal;
        }

        .schedule-detail {
          padding-top: 2px;
        }

        .schedule-detail > p {
          margin: 8px 0;
          color: #888;
          text-align: center;
        }

        .schedule-selection-list {
          display: grid;
          gap: 9px;
        }

        .schedule-selection-item {
          display: grid;
          grid-template-columns: 9px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 14px 13px;
          border: 1px solid #e9e9ed;
          border-radius: 13px;
          background: #fff;
          color: #222;
          text-align: left;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          cursor: pointer;
        }

        .schedule-selection-item:hover {
          background: #fafafa;
          transform: translateY(-1px);
        }

        .selection-type-dot {
          width: 8px;
          height: 34px;
          border-radius: 99px;
        }

        .selection-main {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .selection-type {
          color: #888;
          font-size: 10px;
          font-weight: 700;
        }

        .selection-main strong {
          overflow: hidden;
          font-size: 14px;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .selection-time {
          color: #777;
          font-size: 11px;
        }

        .selection-arrow {
          color: #aaa;
          font-size: 22px;
        }

        .auth-sheet {
          max-width: 460px;
        }

        .auth-prompt-text {
          margin: 0 0 18px;
          color: #666;
          font-size: 13px;
          line-height: 1.6;
        }

        .auth-form {
          display: grid;
          gap: 9px;
        }

        .auth-form input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 13px;
          border: 1px solid #ddd;
          border-radius: 9px;
          font: inherit;
        }

        .auth-form > button[type='submit'] {
          padding: 12px;
          border: 0;
          border-radius: 9px;
          background: #171717;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        .login-required-button {
          width: 100%;
          padding: 11px 12px;
          border: 1px dashed #d5d5d5;
          border-radius: 9px;
          background: #fafafa;
          color: #777;
          font-size: 12px;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .logo-title {
            display: inline;
            font-size: 11px;
            white-space: nowrap;
            letter-spacing: -0.6px;
          }

          .yb-logo-mark {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
            border-radius: 10px;
            font-size: 16px;
          }

          .list-item-date {
            flex-basis: 82px;
          }

          .list-item-date-desktop {
            display: none;
          }

          .list-item-date-mobile {
            display: block;
            font-size: 12px;
          }

          .list-item-time-text {
            font-size: 10px;
          }

          .timetable-events-layer {
            left: 58px;
          }

          .timetable-row {
            height: 68px !important;
            min-height: 68px !important;
          }

          .timetable-event {
            left: 2px;
            right: 2px;
            padding: 4px 4px 4px 6px;
            border-left-width: 2px;
            border-radius: 5px;
          }

          .timetable-event-time {
            font-size: 9px;
          }

          .timetable-event-title {
            font-size: 10px;
          }

          .timetable-anniversary {
            inset: 0 2px;
            padding: 6px 4px;
            border-radius: 5px;
          }

          .timetable-anniversary span {
            margin-bottom: 4px;
            font-size: 8px;
          }

          .timetable-anniversary strong {
            font-size: 9px;
            line-height: 1.3;
          }
        }
      `}</style>
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
          <span
            className="logo-mark yb-logo-mark"
            aria-label="YB"
          >
            <span className="yb-logo-y">
              Y
            </span>
            <span className="yb-logo-b">
              B
            </span>
          </span>

          <span className="logo-title">
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

          {!session && (
            <button
              className="nav-button"
              type="button"
              onClick={openAuthPrompt}
            >
              요청사항
            </button>
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
                  {scheduleLoadError ? (
                    <>
                      일정을
                      불러오지 못했습니다.
                      <br />
                      {scheduleLoadError}
                    </>
                  ) : (
                    '등록된 일정이 없습니다.'
                  )}
                </div>
              ) : (
                schedules.map(
                  (schedule) => (
                    <div
                      className="schedule-list-item"
                      key={schedule.id}
                    >
                      <div className="list-item-date">
                        <span className="list-item-date-text list-item-date-desktop">
                          {formatListDate(
                            schedule.event_date
                          )}
                        </span>
                        <span className="list-item-date-text list-item-date-mobile">
                          {schedule.event_date
                            ? `${schedule.event_date.slice(
                                2,
                                4
                              )}.${schedule.event_date.slice(
                                5,
                                7
                              )}.${schedule.event_date.slice(
                                8,
                                10
                              )}.`
                            : ''}
                        </span>
                        <span className="list-item-time-text">
                          {formatScheduleTimeRange(
                            schedule
                          )}
                        </span>
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
              <>
                <div className="request-filter-bar">
                  <button
                    type="button"
                    className={
                      requestStatusFilter ===
                      'pending'
                        ? 'request-filter-button active'
                        : 'request-filter-button'
                    }
                    onClick={() =>
                      setRequestStatusFilter(
                        'pending'
                      )
                    }
                  >
                    반영 전
                  </button>

                  <button
                    type="button"
                    className={
                      requestStatusFilter ===
                      'completed'
                        ? 'request-filter-button active'
                        : 'request-filter-button'
                    }
                    onClick={() =>
                      setRequestStatusFilter(
                        'completed'
                      )
                    }
                  >
                    반영 완료
                  </button>
                </div>

                {requestLoading ? (
                  <div className="empty-list">
                    요청사항을
                    불러오는 중입니다.
                  </div>
                ) : filteredAdminRequests.length ===
                  0 ? (
                  <div className="empty-list">
                    {requestStatusFilter ===
                    'completed'
                      ? '반영 완료된 요청사항이 없습니다.'
                      : '반영 전 요청사항이 없습니다.'}
                  </div>
                ) : (
                  <div className="request-admin-list">
                    {filteredAdminRequests.map(
                      (request) => (
                        <div
                          className="request-admin-item"
                          key={request.id}
                        >
                          <div className="request-admin-top">
                            <div className="request-admin-title-area">
                              <span className="request-type-badge">
                                {request.request_type ===
                                '기타'
                                  ? '개선사항'
                                  : request.request_type}
                              </span>

                              <h3>
                                {
                                  request.title
                                }
                              </h3>
                            </div>
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

                          <div className="request-status-area">
                            <span
                              className={
                                request.status ===
                                '반영 완료'
                                  ? 'request-current-status completed'
                                  : 'request-current-status'
                              }
                            >
                              {
                                request.status
                              }
                            </span>

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
                              {request.status ===
                              '반영 완료'
                                ? '반영 전으로 변경'
                                : '반영 완료'}
                            </button>

                            {session?.user?.email?.toLowerCase() ===
                              request.submitter_email?.toLowerCase() && (
                              <div
                                className="request-owner-actions"
                                style={{
                                  display:
                                    'flex',
                                  gap: '8px',
                                  alignItems:
                                    'center',
                                  marginTop:
                                    '8px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditRequestForm(
                                      request
                                    )
                                  }
                                  style={{
                                    color:
                                      '#333',
                                    backgroundColor:
                                      '#fff',
                                    border:
                                      '1px solid #d5d5d5',
                                    padding:
                                      '7px 12px',
                                    borderRadius:
                                      '8px',
                                    fontWeight:
                                      600,
                                    cursor:
                                      'pointer',
                                  }}
                                >
                                  수정
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteRequest(
                                      request
                                    )
                                  }
                                  style={{
                                    color:
                                      '#c0392b',
                                    backgroundColor:
                                      '#fff',
                                    border:
                                      '1px solid #e2b4ae',
                                    padding:
                                      '7px 12px',
                                    borderRadius:
                                      '8px',
                                    fontWeight:
                                      600,
                                    cursor:
                                      'pointer',
                                  }}
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
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
                          {request.request_type ===
                          '기타'
                            ? '개선사항'
                            : request.request_type}
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

                      <div className="my-request-actions">
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

                        <div
                          className="request-owner-actions"
                          style={{
                            display:
                              'flex',
                            gap: '8px',
                            alignItems:
                              'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openEditRequestForm(
                                request
                              )
                            }
                            style={{
                              color:
                                '#333',
                              backgroundColor:
                                '#fff',
                              border:
                                '1px solid #d5d5d5',
                              padding:
                                '7px 12px',
                              borderRadius:
                                '8px',
                              fontWeight:
                                600,
                              cursor:
                                'pointer',
                            }}
                          >
                            수정
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteRequest(
                                request
                              )
                            }
                            style={{
                              color:
                                '#c0392b',
                              backgroundColor:
                                '#fff',
                              border:
                                '1px solid #e2b4ae',
                              padding:
                                '7px 12px',
                              borderRadius:
                                '8px',
                              fontWeight:
                                600,
                              cursor:
                                'pointer',
                            }}
                          >
                            삭제
                          </button>
                        </div>
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
                <div className="calendar-navigation">
                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={() =>
                      moveCalendar(-1)
                    }
                    aria-label="이전"
                  >
                    ‹
                  </button>

                  <h1>
                    {calendarView ===
                    'week'
                      ? getWeekTitle(
                          weekDates
                        )
                      : getMonthTitle(
                          calendarCursor
                        )}
                  </h1>

                  <button
                    type="button"
                    className="calendar-nav-button"
                    onClick={() =>
                      moveCalendar(1)
                    }
                    aria-label="다음"
                  >
                    ›
                  </button>

                  <button
                    type="button"
                    className="calendar-today-button"
                    onClick={
                      moveToToday
                    }
                  >
                    오늘
                  </button>
                </div>

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

            {scheduleLoadError && (
              <div
                className="error-message"
                style={{
                  whiteSpace: 'pre-line',
                  marginBottom: '12px',
                }}
              >
                {scheduleLoadError}
              </div>
            )}

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

                {searchText && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() =>
                      setSearchText('')
                    }
                    aria-label="검색어 지우기"
                  >
                    ×
                  </button>
                )}
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

            {calendarView ===
              'month' && (
              <div className="calendar-card">
                <div className="weekdays">
                  {WEEKDAYS.map(
                    (day) => (
                      <div key={day}>
                        {day.charAt(0)}
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
                            type="button"
                            className="untimed-event"
                            key={schedule.id}
                            onClick={() =>
                              handleEventClick(
                                schedule,
                                schedule.event_date
                              )
                            }
                          >
                            <span
                              className="week-event-dot"
                              style={{
                                backgroundColor:
                                  TYPE_COLORS[
                                    schedule.schedule_type
                                  ] || '#999',
                              }}
                            />
                            <span className="untimed-date">
                              {formatListDate(
                                schedule.event_date
                              )}
                            </span>
                            <span className="untimed-name">
                              {schedule.title}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div ref={timetableScrollRef} className="timetable-scroll">
                  <div className="timetable">
                    <div className="timetable-header">
                      <div className="time-column-head" />
                      {weekDates.map((date) => {
                        const dateString =
                          toDateString(date)
                        const isToday =
                          dateString ===
                          toDateString(today)
                        const anniversaries =
                          getAnniversariesForDate(
                            dateString
                          )

                        return (
                          <button
                            type="button"
                            className={
                              `timetable-day-head ${
                                isToday
                                  ? 'today'
                                  : ''
                              }`
                            }
                            key={dateString}
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
                            {anniversaries.length >
                              0 && (
                              <span className="timetable-anniversary-badge">
                                기념일
                              </span>
                            )}
                          </button>
                        )
                      })}
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
                                return (
                                  <div
                                    className="timetable-cell"
                                    key={`${dateString}-${hour}`}
                                    onClick={() =>
                                      handleWeekBlankClick(
                                        dateString
                                      )
                                    }
                                  />
                                )
                              }
                            )}
                          </div>
                        )
                      )}

                      <div className="timetable-events-layer">
                        {weekDates.map(
                          (date, dayIndex) => {
                            const dateString =
                              toDateString(date)
                            const daySchedules =
                              getTimedSchedulesForDate(
                                dateString
                              )
                            const anniversaries =
                              getAnniversariesForDate(
                                dateString
                              )

                            return (
                              <div
                                className="timetable-day-event-layer"
                                key={dateString}
                                style={{
                                  gridColumn:
                                    dayIndex + 1,
                                }}
                              >
                                {anniversaries.slice(0, 1).map(
                                  (schedule) => (
                                    <button
                                      type="button"
                                      className="timetable-anniversary"
                                      key={schedule.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDateStringClick(
                                          dateString
                                        )
                                      }}
                                    >
                                      <span>
                                        기념일
                                        {anniversaries.length > 1
                                          ? ` ${anniversaries.length}건`
                                          : ''}
                                      </span>
                                      <strong>
                                        {anniversaries.length > 1
                                          ? anniversaries
                                              .map(
                                                (item) =>
                                                  item.title
                                              )
                                              .join(' · ')
                                          : schedule.title}
                                      </strong>
                                    </button>
                                  )
                                )}

                                {daySchedules.map(
                                  (schedule) => {
                                    const range =
                                      getScheduleTimeRange(
                                        schedule,
                                        dateString
                                      )

                                    if (!range) {
                                      return null
                                    }

                                    const visibleStart =
                                      Math.max(
                                        range.start,
                                        weekStartMinutes
                                      )
                                    const visibleEnd =
                                      Math.min(
                                        range.end,
                                        weekEndMinutes
                                      )

                                    if (
                                      visibleEnd <=
                                      visibleStart
                                    ) {
                                      return null
                                    }

                                    const top =
                                      ((visibleStart -
                                        weekStartMinutes) /
                                        (weekEndMinutes -
                                          weekStartMinutes)) *
                                      100
                                    const height =
                                      ((visibleEnd -
                                        visibleStart) /
                                        (weekEndMinutes -
                                          weekStartMinutes)) *
                                      100
                                    const typeColor =
                                      TYPE_COLORS[
                                        schedule.schedule_type
                                      ] || '#999'

                                    return (
                                      <button
                                        type="button"
                                        className="timetable-event"
                                        key={schedule.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEventClick(
                                            schedule,
                                            dateString
                                          )
                                        }}
                                        style={{
                                          top: `${top}%`,
                                          height: `${height}%`,
                                          borderLeftColor:
                                            typeColor,
                                          '--event-color':
                                            typeColor,
                                        }}
                                      >
                                        <span className="timetable-event-time">
                                          {schedule.event_time?.slice(
                                            0,
                                            5
                                          )}
                                          {schedule.end_time
                                            ? ` ~ ${schedule.end_time.slice(
                                                0,
                                                5
                                              )}`
                                            : ''}
                                        </span>
                                        <span className="timetable-event-title">
                                          {schedule.title}
                                        </span>
                                      </button>
                                    )
                                  }
                                )}
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {timedWeekSchedules.length === 0 &&
                  untimedWeekSchedules.length === 0 &&
                  untimedAnniversarySchedules.length ===
                    0 && (
                    <div className="week-no-results">
                      이 주에는 표시할 일정이
                      없습니다.
                    </div>
                  )}
              </div>
            )}

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
                    (schedule) => {
                      const scheduleTime =
                        formatScheduleTimeRange(
                          schedule
                        )

                      return (
                        <button
                          className="agenda-item"
                          key={schedule.id}
                          onClick={() =>
                            handleEventClick(
                              schedule,
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
                              {scheduleTime}

                              {schedule.end_date &&
                                schedule.end_date !==
                                  schedule.event_date &&
                                ` · ${formatDateText(
                                  schedule.end_date
                                )}까지`}

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
                    }
                  )
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* =========================
          날짜별 일정 목록 / 일정 상세
         ========================= */}
      {selectedDate && (
        <div
          className="overlay"
          onClick={() => {
            closeScheduleOverlay()
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {selectedSchedule && (
                  <button
                    type="button"
                    className="close-button"
                    onClick={
                      backToScheduleList
                    }
                    aria-label="목록으로"
                    style={{
                      fontSize: '22px',
                    }}
                  >
                    ‹
                  </button>
                )}

                <h2>
                  {selectedSchedule
                    ? selectedSchedule.title
                    : formatDateText(
                        selectedDate
                      )}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={
                  closeScheduleOverlay
                }
              >
                ×
              </button>
            </div>

            <div className="schedule-detail">
              {!selectedSchedule ? (
                selectedSchedules.length ===
                0 ? (
                  <p>
                    등록된 일정이
                    없습니다.
                  </p>
                ) : (
                  <div className="schedule-selection-list">
                    {selectedSchedules.map(
                      (schedule) => (
                        <button
                          type="button"
                          className="schedule-selection-item"
                          key={schedule.id}
                          onClick={() =>
                            handleEventClick(
                              schedule,
                              schedule.event_date
                            )
                          }
                        >
                          <span
                            className="selection-type-dot"
                            style={{
                              backgroundColor:
                                TYPE_COLORS[
                                  schedule
                                    .schedule_type
                                ] ||
                                '#999',
                            }}
                          />

                          <div className="selection-main">
                            <span className="selection-type">
                              {
                                schedule.schedule_type
                              }
                            </span>

                            <strong>
                              {
                                schedule.title
                              }
                            </strong>

                            <span className="selection-time">
                              {formatScheduleTimeRange(
                                schedule
                              )}
                            </span>
                          </div>

                          <span className="selection-arrow">
                            ›
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )
              ) : (
                <div
                  className="schedule-item"
                  key={
                    selectedSchedule.id
                  }
                >
                  <div
                    className="detail-type"
                    style={{
                      backgroundColor:
                        TYPE_COLORS[
                          selectedSchedule
                            .schedule_type
                        ] ||
                        '#999',
                    }}
                  >
                    {
                      selectedSchedule.schedule_type
                    }
                  </div>

                  <h3>
                    {selectedSchedule.title}
                  </h3>

                  <div className="detail-row">
                    <strong>
                      일시
                    </strong>

                    <span>
                      {formatScheduleDateTime(
                        selectedSchedule
                      )}
                    </span>
                  </div>

                  {selectedSchedule.place && (
                    <div className="detail-row">
                      <strong>
                        장소
                      </strong>

                      <span>
                        {
                          selectedSchedule.place
                        }
                      </span>
                    </div>
                  )}

                  {selectedSchedule.address && (
                    <div className="detail-row">
                      <strong>
                        주소
                      </strong>

                      <span>
                        {
                          selectedSchedule.address
                        }
                      </span>
                    </div>
                  )}

                  {selectedSchedule.details && (
                    <div className="detail-section">
                      <strong>
                        참고 사항
                      </strong>

                      <p>
                        {
                          selectedSchedule.details
                        }
                      </p>
                    </div>
                  )}

                  {selectedSchedule.related_link && (
                    <div className="detail-section">
                      <strong>
                        참고 링크
                      </strong>

                      <a
                        className="reference-link"
                        href={
                          selectedSchedule.related_link
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedSchedule.related_link_text ||
                          '링크 열기'}
                      </a>
                    </div>
                  )}

                  <div className="memo-section">
                    {session?.user ? (
                      <>
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
                          selectedSchedule.id
                        ] && (
                          <div className="memo-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMemoId(
                                  selectedSchedule.id
                                )

                                setMemoText(
                                  (
                                    prev
                                  ) => ({
                                    ...prev,
                                    [selectedSchedule.id]:
                                      memos[
                                        selectedSchedule.id
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
                                  selectedSchedule.id
                                )
                              }
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {memos[selectedSchedule.id] && editingMemoId !== selectedSchedule.id ? (
                        <div className="memo-view">
                          {memos[selectedSchedule.id].content}
                        </div>
                      ) : (
                        <div className="memo-editor">
                          <textarea
                            value={memoText[selectedSchedule.id] || ''}
                            onChange={(e) =>
                              setMemoText((prev) => ({
                                ...prev,
                                [selectedSchedule.id]: e.target.value,
                              }))
                            }
                            placeholder="이 일정에 대한 메모를 남겨보세요."
                            rows="2"
                          />

                          <button
                            type="button"
                            className="memo-save-button"
                            onClick={() =>
                              handleSaveMemo(selectedSchedule.id)
                            }
                            disabled={memoSaving === selectedSchedule.id}
                          >
                            {memoSaving === selectedSchedule.id
                              ? '저장 중...'
                              : '저장'}
                          </button>
                        </div>
                      )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="login-required-button"
                        onClick={openAuthPrompt}
                      >
                        로그인하면 이 일정에 개인 메모를 남길 수 있어요
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="admin-actions">
                      <button
                        onClick={() =>
                          openEditForm(
                            selectedSchedule
                          )
                        }
                      >
                        수정
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDeleteSchedule(
                            selectedSchedule
                          )
                        }
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuthPrompt && (
        <div
          className="overlay"
          onClick={closeAuthPrompt}
        >
          <div
            className="bottom-sheet auth-sheet"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>
                {isSignupMode
                  ? '회원가입'
                  : '로그인'}
              </h2>
              <button
                type="button"
                className="close-button"
                onClick={closeAuthPrompt}
              >
                ×
              </button>
            </div>
            <p className="auth-prompt-text">
              일정은 로그인 없이 자유롭게 볼 수 있어요.<br />
              개인 메모나 요청사항을 이용하려면 로그인해주세요.
            </p>
            <form
              className="auth-form"
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
                  시작 날짜 *
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
                  시작 시간
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
                  종료 날짜
                  <input
                    type="date"
                    name="end_date"
                    value={
                      form.end_date
                    }
                    min={
                      form.event_date ||
                      undefined
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </label>

                <label>
                  종료 시간
                  <input
                    type="time"
                    name="end_time"
                    value={
                      form.end_time
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
                  참고 링크 주소
                  <input
                    name="related_link"
                    value={
                      form.related_link
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="https://www.instagram.com/..."
                  />
                </label>

                <label>
                  링크 표시 문구
                  <input
                    name="related_link_text"
                    value={
                      form.related_link_text
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="예: YB 공식 인스타그램"
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
          요청사항 작성 / 수정
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
                  {editingRequest
                    ? '요청사항 수정'
                    : '요청사항'}
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

                    <option value="개선사항">
                      개선사항
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
                    ? '저장 중...'
                    : editingRequest
                      ? '수정 저장'
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
