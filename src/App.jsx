import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { Analytics } from '@vercel/analytics/react'

const TYPE_COLORS = {
  방송: '#2673C8',
  '지역축제/행사': '#6D58D8',
  기념일: '#D9C900',
  대학축제: '#229B2F',
  '콘서트/팬미팅': '#E28C29',
}

const TYPE_OPTIONS = [
  '방송',
  '지역축제/행사',
  '기념일',
  '대학축제',
  '콘서트/팬미팅',
]

const EMPTY_FORM = {
  title: '',
  calendar_title: '',
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

function getAddressHref(address) {
  const value = String(address || '').trim()

  if (!value) return ''

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return `https://map.naver.com/p/search/${encodeURIComponent(value)}`
}

const YB_OFFICIAL_LOGO = 'data:image/png;base64,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'

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

  const [scheduleListFilter, setScheduleListFilter] =
    useState('upcoming')

  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // 개인 메모
  const [memos, setMemos] = useState({})
  const [attendanceStatuses, setAttendanceStatuses] = useState({})
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

  // 업데이트 현황
  const [updates, setUpdates] = useState([])
  const [updateForm, setUpdateForm] = useState({
    title: '',
    content: '',
    is_important: false,
  })
  const [editingUpdate, setEditingUpdate] = useState(null)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [updateSaving, setUpdateSaving] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState('')

  // 스케줄표 자동 등록
  const [showAutoImport, setShowAutoImport] = useState(false)
  const [autoImportMode, setAutoImportMode] = useState('image')
  const [autoImportYear, setAutoImportYear] = useState(
    new Date().getFullYear()
  )
  const [autoImportMonth, setAutoImportMonth] = useState(
    new Date().getMonth() + 1
  )
  const [autoImportText, setAutoImportText] = useState('')
  const [autoImportImageData, setAutoImportImageData] = useState('')
  const [autoImportImageName, setAutoImportImageName] = useState('')
  const [autoImportCandidates, setAutoImportCandidates] = useState([])
  const [autoImportStage, setAutoImportStage] = useState('input')
  const [autoImportLoading, setAutoImportLoading] = useState(false)
  const [autoImportSaving, setAutoImportSaving] = useState(false)
  const [autoImportError, setAutoImportError] = useState('')
  const autoImportFileRef = useRef(null)
  const [showAddScheduleMenu, setShowAddScheduleMenu] = useState(false)

  // 관리자 요청사항 필터
  const [requestStatusFilter, setRequestStatusFilter] =
    useState('pending')

  const isAdmin = profile?.role === 'admin'

  const today = new Date()
  const todayDateString = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  function isPastSchedule(schedule) {
    const scheduleEndDate =
      schedule.end_date || schedule.event_date

    return Boolean(
      scheduleEndDate &&
        scheduleEndDate < todayDateString
    )
  }

  const scheduleListSchedules = useMemo(() => {
    if (scheduleListFilter === 'past') {
      return schedules.filter(isPastSchedule)
    }

    if (scheduleListFilter === 'all') {
      return schedules
    }

    return schedules.filter(
      (schedule) => !isPastSchedule(schedule)
    )
  }, [schedules, scheduleListFilter, todayDateString])

  useEffect(() => {
    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)

        if (newSession?.user) {
          loadProfile(newSession.user.id)
          loadAttendanceStatuses(newSession.user.id)
        } else {
          setProfile(null)
          setMemos({})
          setMemoText({})
          setEditingMemoId(null)
          setAttendanceStatuses({})
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
      await loadAttendanceStatuses(currentSession.user.id)
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

  async function loadAttendanceStatuses(userId = session?.user?.id) {
    if (!userId) {
      setAttendanceStatuses({})
      return
    }

    const { data, error } = await supabase
      .from('schedule_attendance')
      .select('schedule_id, status')
      .eq('user_id', userId)

    if (error) {
      console.warn('참석 여부 조회 실패:', error)
      setAttendanceStatuses({})
      return
    }

    const map = {}
    ;(data || []).forEach((row) => {
      map[row.schedule_id] = row.status
    })
    setAttendanceStatuses(map)
  }

  async function handleAttendanceChange(scheduleId, status) {
    if (!session?.user) {
      openAuthPrompt()
      return
    }

    const userId = session.user.id

    if (!status) {
      const { error } = await supabase
        .from('schedule_attendance')
        .delete()
        .eq('schedule_id', scheduleId)
        .eq('user_id', userId)

      if (error) {
        console.error('참석 여부 삭제 실패:', error)
        alert(`참석 여부 저장에 실패했습니다.\n${error.message}`)
        return
      }

      setAttendanceStatuses((prev) => {
        const next = { ...prev }
        delete next[scheduleId]
        return next
      })
      return
    }

    const { error } = await supabase
      .from('schedule_attendance')
      .upsert(
        {
          schedule_id: scheduleId,
          user_id: userId,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'schedule_id,user_id' }
      )

    if (error) {
      console.error('참석 여부 저장 실패:', error)
      alert(`참석 여부 저장에 실패했습니다.\n${error.message}`)
      return
    }

    setAttendanceStatuses((prev) => ({
      ...prev,
      [scheduleId]: status,
    }))
  }

  function getAttendanceIcon(status) {
    if (status === '참석') return '✓'
    if (status === '미정') return '?'
    if (status === '불참') return '×'
    return ''
  }

  // =========================
  // 스케줄표 자동 등록
  // =========================

  function openAutoImport() {
    const cursorYear = calendarCursor.getFullYear()
    const cursorMonth = calendarCursor.getMonth() + 1

    setAutoImportYear(cursorYear)
    setAutoImportMonth(cursorMonth)
    setAutoImportMode('image')
    setAutoImportText('')
    setAutoImportImageData('')
    setAutoImportImageName('')
    setAutoImportCandidates([])
    setAutoImportStage('input')
    setAutoImportError('')
    setAutoImportLoading(false)
    setAutoImportSaving(false)
    setShowAutoImport(true)
  }

  function closeAutoImport() {
    if (autoImportLoading || autoImportSaving) return

    setShowAutoImport(false)
    setAutoImportCandidates([])
    setAutoImportStage('input')
    setAutoImportError('')
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () =>
        reject(new Error('이미지를 읽지 못했습니다.'))

      reader.readAsDataURL(file)
    })
  }

  async function handleAutoImportImageChange(e) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAutoImportError(
        'JPG, PNG, WEBP 같은 이미지 파일을 선택해주세요.'
      )
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setAutoImportError(
        '이미지는 8MB 이하로 선택해주세요.'
      )
      return
    }

    try {
      setAutoImportError('')
      const dataUrl = await fileToDataUrl(file)

      setAutoImportImageData(dataUrl)
      setAutoImportImageName(file.name)
    } catch (error) {
      console.error('이미지 읽기 실패:', error)
      setAutoImportError(
        '이미지를 읽지 못했습니다. 다시 선택해주세요.'
      )
    }
  }

      function renderAddScheduleMenu() {
    return (
      <div className="add-schedule-menu">
        <button
          className="add-schedule-button"
          type="button"
          onClick={() => setShowAddScheduleMenu((prev) => !prev)}
        >
          + 일정 추가
        </button>
        {showAddScheduleMenu && (
          <div className="add-schedule-menu-panel">
            <button
              type="button"
              onClick={() => {
                setShowAddScheduleMenu(false)
                openNewScheduleForm()
              }}
            >
              직접 일정 추가
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddScheduleMenu(false)
                openAutoImport()
              }}
            >
              스케줄표로 일정 추가
            </button>
          </div>
        )}
      </div>
    )
  }

  function isImportedScheduleDuplicate(candidate) {
    const normalize = (value) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\\s+/g, ' ')

    return schedules.some((schedule) => {

  return (
        normalize(schedule.title) ===
          normalize(candidate.title) &&
        schedule.event_date === candidate.event_date &&
        (schedule.event_time || '') ===
          (candidate.event_time || '') &&
        schedule.schedule_type ===
          candidate.schedule_type
      )
    })
  }

  function updateAutoImportCandidate(id, field, value) {
    setAutoImportCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              [field]: value,
              duplicate: isImportedScheduleDuplicate({
                ...candidate,
                [field]: value,
              }),
            }
          : candidate
      )
    )
  }

  async function handleAnalyzeAutoImport() {
    if (!isAdmin) return

    if (
      autoImportMode === 'image' &&
      !autoImportImageData
    ) {
      setAutoImportError(
        '먼저 스케줄표 이미지를 선택해주세요.'
      )
      return
    }

    if (
      autoImportMode === 'text' &&
      !autoImportText.trim()
    ) {
      setAutoImportError(
        '카페 글 내용을 붙여넣어주세요.'
      )
      return
    }

    setAutoImportLoading(true)
    setAutoImportError('')

    try {
      const { data, error } =
        await supabase.functions.invoke(
          'import-schedules',
          {
            body: {
              image_data_url:
                autoImportMode === 'image'
                  ? autoImportImageData
                  : '',
              source_text:
                autoImportMode === 'text'
                  ? autoImportText.trim()
                  : '',
              year: Number(autoImportYear),
              month: Number(autoImportMonth),
            },
          }
        )

      if (error) {
        throw new Error(
          error.message ||
            '스케줄표 분석에 실패했습니다.'
        )
      }

      const imported =
        Array.isArray(data?.schedules)
          ? data.schedules
          : []

      if (!imported.length) {
        throw new Error(
          '일정을 찾지 못했습니다. 이미지나 원문 내용을 확인해주세요.'
        )
      }

      const candidates = imported.map(
        (schedule, index) => ({
          id: `import-${Date.now()}-${index}`,
          selected: !isImportedScheduleDuplicate(
            schedule
          ),
          duplicate:
            isImportedScheduleDuplicate(
              schedule
            ),
          title: schedule.title || '',
          calendar_title: schedule.calendar_title || '',
          schedule_type:
            schedule.schedule_type ||
            '지역축제/행사',
          event_date:
            schedule.event_date || '',
          event_time:
            schedule.event_time || '',
          end_date:
            schedule.end_date || '',
          end_time:
            schedule.end_time || '',
          place: schedule.place || '',
          details: schedule.details || '',
          related_link:
            schedule.related_link || '',
          related_link_text:
            schedule.related_link_text || '',
          confidence:
            schedule.confidence || 'medium',
          warning:
            schedule.warning || '',
          source_text:
            schedule.source_text || '',
        })
      )

      setAutoImportCandidates(candidates)
      setAutoImportStage('review')
    } catch (error) {
      console.error(
        '스케줄표 자동 분석 실패:',
        error
      )
      setAutoImportError(
        error.message ||
          '스케줄표 분석에 실패했습니다.'
      )
    } finally {
      setAutoImportLoading(false)
    }
  }

  function toggleAutoImportCandidate(id) {
    setAutoImportCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              selected: !candidate.selected,
            }
          : candidate
      )
    )
  }

  function toggleAllAutoImportCandidates() {
    setAutoImportCandidates((prev) => {
      const selectable = prev.filter(
        (candidate) => !candidate.duplicate
      )
      const shouldSelect =
        selectable.some(
          (candidate) => !candidate.selected
        )

      return prev.map((candidate) =>
        candidate.duplicate
          ? candidate
          : {
              ...candidate,
              selected: shouldSelect,
            }
      )
    })
  }

  async function handleSaveAutoImport() {
    if (!isAdmin) return

    const selected =
      autoImportCandidates.filter(
        (candidate) => candidate.selected
      )

    if (!selected.length) {
      setAutoImportError(
        '등록할 일정을 하나 이상 선택해주세요.'
      )
      return
    }

    for (const candidate of selected) {
      if (
        !candidate.title.trim() ||
        !candidate.event_date
      ) {
        setAutoImportError(
          '제목과 시작 날짜가 없는 일정이 있습니다. 확인해주세요.'
        )
        return
      }

      if (
        candidate.end_date &&
        candidate.end_date <
          candidate.event_date
      ) {
        setAutoImportError(
          `"${candidate.title}"의 종료 날짜가 시작 날짜보다 빠릅니다.`
        )
        return
      }

      const effectiveEndDate =
        candidate.end_date ||
        (candidate.end_time
          ? candidate.event_date
          : '')

      if (
        effectiveEndDate ===
          candidate.event_date &&
        candidate.event_time &&
        candidate.end_time &&
        candidate.end_time <
          candidate.event_time
      ) {
        setAutoImportError(
          `"${candidate.title}"의 종료 시간이 시작 시간보다 빠릅니다.`
        )
        return
      }
    }

    setAutoImportSaving(true)
    setAutoImportError('')

    const payloads = selected.map(
      (candidate) => ({
        title: candidate.title.trim(),
        calendar_title: candidate.calendar_title?.trim() || null,
        schedule_type:
          candidate.schedule_type,
        event_date:
          candidate.event_date,
        event_time:
          candidate.event_time || null,
        end_date:
          candidate.end_date ||
          (candidate.end_time
            ? candidate.event_date
            : null),
        end_time:
          candidate.end_time || null,
        place:
          candidate.place.trim() || null,
        address: null,
        details:
          candidate.details.trim() || null,
        related_link:
          candidate.related_link.trim() ||
          null,
        related_link_text:
          candidate.related_link_text.trim() ||
          null,
        updated_at:
          new Date().toISOString(),
      })
    )

    const { error } = await supabase
      .from('schedules')
      .insert(payloads)

    if (error) {
      console.error(
        '자동 등록 저장 실패:',
        error
      )
      setAutoImportError(
        `일정 등록에 실패했습니다.\n${error.message}`
      )
      setAutoImportSaving(false)
      return
    }

    await loadSchedules()

    const savedCount = selected.length

    setAutoImportSaving(false)
    setShowAutoImport(false)
    setAutoImportCandidates([])
    setAutoImportStage('input')
    setAutoImportError('')

    alert(
      `${savedCount}개의 일정이 등록되었습니다.`
    )
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
    setAttendanceStatuses({})
    setMyRequests([])
    setAllRequests([])
    setEditingRequest(null)
    setShowRequestForm(false)
    setUpdates([])
    setEditingUpdate(null)
    setUpdateForm({ title: '', content: '', is_important: false })
    setUpdateError('')
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
      calendar_title: schedule.calendar_title || '',
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
      calendar_title: form.calendar_title.trim() || null,
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
    // 로그인 직후 메모 로딩에서 사용하는 일정 ID 목록
    // (이전 버전의 ids 오타로 로그인 후 화면이 암전되는 문제 방지)
    const ids = scheduleIds

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
  // 업데이트 현황
  // =========================

  async function loadUpdates() {
    setUpdateLoading(true)
    setUpdateError('')

    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('업데이트 현황 조회 실패:', error)
      setUpdateError(`업데이트 현황을 불러오지 못했습니다.\n${error.message}`)
      setUpdates([])
      setUpdateLoading(false)
      return
    }

    setUpdates(data || [])
    setUpdateLoading(false)
  }

  function openNewUpdateForm() {
    if (!isAdmin) return
    setEditingUpdate(null)
    setShowUpdateForm(true)
    setUpdateForm({ title: '', content: '', is_important: false })
    setUpdateError('')
  }

  function openEditUpdateForm(update) {
    if (!isAdmin) return
    setEditingUpdate(update)
    setShowUpdateForm(true)
    setUpdateForm({
      title: update.title || '',
      content: update.content || '',
      is_important: Boolean(update.is_important),
    })
    setUpdateError('')
  }

  function cancelUpdateForm() {
    setEditingUpdate(null)
    setShowUpdateForm(false)
    setUpdateForm({ title: '', content: '', is_important: false })
    setUpdateError('')
  }

  async function handleSaveUpdate(e) {
    e.preventDefault()
    if (!isAdmin) return

    const title = updateForm.title.trim()
    const content = updateForm.content.trim()

    if (!title || !content) {
      setUpdateError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setUpdateSaving(true)
    setUpdateError('')

    let result

    if (editingUpdate) {
      result = await supabase
        .from('updates')
        .update({
          title,
          content,
          is_important: updateForm.is_important,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUpdate.id)
    } else {
      result = await supabase
        .from('updates')
        .insert({
          title,
          content,
          is_important: updateForm.is_important,
          author_id: session?.user?.id || null,
        })
    }

    if (result.error) {
      console.error('업데이트 저장 실패:', result.error)
      setUpdateError(result.error.message)
      setUpdateSaving(false)
      return
    }

    await loadUpdates()
    cancelUpdateForm()
    setUpdateSaving(false)
  }

  async function handleDeleteUpdate(update) {
    if (!isAdmin) return

    const confirmed = window.confirm(`\"${update.title}\" 업데이트를 삭제할까요?`)
    if (!confirmed) return

    const { error } = await supabase
      .from('updates')
      .delete()
      .eq('id', update.id)

    if (error) {
      console.error('업데이트 삭제 실패:', error)
      alert(`삭제에 실패했습니다.\n${error.message}`)
      return
    }

    if (editingUpdate?.id === update.id) {
      cancelUpdateForm()
    }

    await loadUpdates()
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
          border-radius: 0;
          background: transparent !important;
          color: #fff;
          overflow: hidden;
        }

        .yb-logo-image {
          display: block;
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .calendar-day .date-number {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          padding: 0 !important;
          line-height: 1 !important;
        }

        .calendar-day.today .date-number {
          top: 10px !important;
          left: 10px !important;
        }

        .calendar-day .events {
          overflow: visible !important;
          min-height: 0 !important;
        }

        .calendar-day .event {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          width: calc(100% + 6px) !important;
          min-width: 0 !important;
          gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        .calendar-day .event-title-row {
          position: relative !important;
          flex: 1 1 auto !important;
          width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          background: color-mix(in srgb, var(--event-color, #777) 24%, #202020) !important;
          border-radius: 5px !important;
          border-left: 0 !important;
          overflow: visible !important;
        }

        .calendar-day .event-title-row::before {
          content: "" !important;
          position: absolute !important;
          left: -5px !important;
          top: 0 !important;
          bottom: 0 !important;
          width: 3px !important;
          border-radius: 2px 0 0 2px !important;
          background: var(--event-color, #777) !important;
        }

        .calendar-day .event-title-row > .event-title {
          box-sizing: border-box !important;
          display: block !important;
          flex: 1 1 auto !important;
          width: 100% !important;
          min-width: 0 !important;
        }

        .calendar-day .event-dot {
          display: none !important;
        }

        .calendar-day .event-title {
          display: block !important;
          flex: 1 1 auto !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          font-size: 14px !important;
          line-height: 1.15 !important;
          color: #fff !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: clip !important;
        }

        .calendar-day .event-title {
          padding: 2px 3px 2px 10px !important;
          border-radius: 0 !important;
          background: transparent !important;
          border-left: 0 !important;
          box-sizing: border-box !important;
        }

        /* 달력 일정 위치/간격 */
        .calendar-day .events {
          margin-top: -2px !important;
          gap: 2px !important;
        }

        /* 날짜를 눌렀을 때 올라오는 목록/상세 모달 기본값 */
        .schedule-view-sheet.schedule-selection-sheet {
          height: auto !important;
          min-height: 0 !important;
          max-height: 66vh !important;
        }

        .schedule-view-sheet.schedule-detail-sheet {
          height: auto !important;
          min-height: 0 !important;
          max-height: calc(100dvh - 24px) !important;
        }

        .address-link,
        .place-link {
          color: #fff !important;
          text-decoration: underline !important;
          text-decoration-color: #666 !important;
          text-underline-offset: 3px;
          line-height: 1.45;
          word-break: break-word;
          cursor: pointer;
        }

        .place-text {
          color: #fff !important;
          line-height: 1.45;
          word-break: break-word;
        }

        .address-link:hover,
        .place-link:hover {
          color: #fff !important;
          text-decoration-color: #aaa !important;
        }

        .attendance-icon {
          position: absolute !important;
          left: 0px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          z-index: 3 !important;
          width: 9px !important;
          height: 9px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          color: #fff !important;
          font-size: 6px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,.4) !important;
          border: 1px solid rgba(255,255,255,.5) !important;
          pointer-events: none !important;
        }

        .attendance-icon.attendance-참석 { background: #28a86b; }
        .attendance-icon.attendance-미정 { background: #d69a27; }
        .attendance-icon.attendance-불참 { background: #d24b5a; }

        .attendance-section {
          margin: 12px 0 16px;
          padding: 10px 11px;
          border: 1px solid #333;
          border-radius: 11px;
          background: #1b1b1b;
        }

        .attendance-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .attendance-heading strong { font-size: 12px; }
        .attendance-heading span { color: #777; font-size: 10px; }
        .attendance-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
        .attendance-button,
        .attendance-reset-button {
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          background: #151515;
          color: #aaa;
          padding: 7px 9px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .attendance-button.active { border-color: #7b202d; background: #2a1b20; color: #fff; }
        .attendance-reset-button { color: #777; }
        .form-help { display: block; margin-top: 4px; color: #777; font-size: 10px; line-height: 1.4; }

        .agenda-item.past {
          opacity: 0.48;
        }

        .agenda-item.past:hover {
          opacity: 0.7;
        }

        .auth-switch-button {
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid #4a2b32 !important;
          border-radius: 9px;
          background: #171313 !important;
          color: #d8a3ad !important;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .auth-switch-button:hover {
          background: #211619 !important;
          border-color: #7b202d !important;
          color: #fff !important;
        }

        .timetable-day-head {
          position: relative !important;
          padding: 0 6px 7px !important;
          overflow: hidden;
        }

        .timetable-day-head > span:not(.timetable-anniversary-badge) {
          display: block;
          margin: 0 0 4px !important;
        }

        .timetable-day-head > strong {
          display: block;
          line-height: 1.1;
        }

        .timetable-anniversary-badge {
          position: absolute !important;
          top: 3px !important;
          right: 4px !important;
          left: auto !important;
          transform: none !important;
          margin: 0 !important;
          padding: 2px 5px !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: rgba(217, 201, 0, 0.14) !important;
          color: #D9C900 !important;
          font-size: 8px !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
          white-space: nowrap;
          z-index: 2;
          pointer-events: none;
        }

        .calendar-header > .admin-list-actions {
          flex: 0 0 auto;
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
          inset: 0;
          display: grid;
          grid-template-columns: 70px repeat(7, minmax(98px, 1fr));
          pointer-events: none;
          z-index: 5;
          overflow: hidden;
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
          inset: 0;
          border: 0;
          border-radius: 0;
          background: rgba(255, 227, 0, 0.055);
          color: #fff;
          pointer-events: none;
          box-sizing: border-box;
          z-index: 0;
        }

        .timetable-anniversary span,
        .timetable-anniversary strong {
          display: none;
        }

        .timetable-anniversary-badge {
          display: inline-flex !important;
          align-items: center;
          margin-top: 5px;
          padding: 3px 7px;
          border: 1px solid rgba(255, 227, 0, 0.65);
          border-radius: 999px;
          background: rgba(255, 227, 0, 0.16);
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

        .address-link {
          color: #d7d7d7;
          text-decoration: none;
          line-height: 1.45;
          word-break: break-word;
          cursor: pointer;
        }

        .address-link:hover {
          color: #ffffff;
          text-decoration: underline;
          text-underline-offset: 3px;
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
          border: 1px solid #353535;
          border-radius: 13px;
          background: #202020;
          color: #f4f4f4;
          text-align: left;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          cursor: pointer;
          box-sizing: border-box;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }

        .schedule-selection-item:hover {
          background: #282828;
          border-color: #454545;
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
          color: #a8a8a8;
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
          color: #9a9a9a;
          font-size: 11px;
        }

        .selection-arrow {
          color: #8d8d8d;
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

        .admin-list-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .schedule-list-toolbar {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 14px;
          padding: 0 2px;
        }

        .schedule-list-filter-label {
          color: #8f8f8f;
          font-size: 12px;
          font-weight: 700;
        }

        .schedule-list-filter {
          min-height: 36px;
          padding: 0 32px 0 11px;
          border: 1px solid #353535;
          border-radius: 9px;
          background: #1b1b1b;
          color: #f1f1f1;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .schedule-list-count {
          color: #777;
          font-size: 11px;
        }

        @media (max-width: 700px) {
          .calendar-day .events {
            display: flex !important;
            flex-direction: column !important;
            gap: 1px !important;
            margin-top: -4px !important;
            transform: translateY(-3px) !important;
            max-height: 38px !important;
            overflow: visible !important;
          }

          .calendar-day .event {
            min-height: 18px !important;
            height: 18px !important;
            flex: 0 0 18px !important;
            margin: 0 !important;
          }

          .calendar-day .event-title {
            font-size: 11px !important;
            line-height: 1.05 !important;
            padding: 2px 2px 2px 2px !important;
            text-overflow: clip !important;
          }

          .calendar-day .event-title-row:has(.attendance-icon) .event-title {
            padding-left: 8px !important;
          }

          .calendar-day .attendance-icon {
            width: 8px !important;
            height: 8px !important;
            font-size: 5px !important;
            left: -1px !important;
          }

          .schedule-list-toolbar {
            gap: 7px;
            margin-bottom: 11px;
          }

          .schedule-list-filter {
            min-height: 34px;
            max-width: 170px;
          }
        }

        /* 업데이트 현황 전용 UI */
        .update-page .list-page-header {
          margin-bottom: 22px;
        }

        .update-editor-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0,0,0,.68);
          box-sizing: border-box;
        }

        .update-editor {
          width: min(620px, 100%);
          max-height: min(760px, calc(100dvh - 40px));
          overflow-y: auto;
          padding: 22px;
          border: 1px solid #363636;
          border-radius: 18px;
          background: #171717;
          box-shadow: 0 24px 70px rgba(0,0,0,.45);
          box-sizing: border-box;
        }

        .update-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .update-editor-header h2 {
          margin: 0;
          color: #fff;
          font-size: 18px;
          line-height: 1.35;
        }

        .update-editor-close {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border: 1px solid #383838;
          border-radius: 9px;
          background: #202020;
          color: #aaa;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .update-editor-form {
          display: grid;
          gap: 12px;
        }

        .update-editor-form input[type='text'],
        .update-editor-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #363636;
          border-radius: 10px;
          background: #222;
          color: #f4f4f4;
          outline: none;
          font: inherit;
        }

        .update-editor-form input[type='text'] {
          height: 48px;
          padding: 0 14px;
          font-size: 14px;
        }

        .update-editor-form textarea {
          min-height: 180px;
          padding: 13px 14px;
          font-size: 13px;
          line-height: 1.65;
          resize: vertical;
        }

        .update-editor-form input[type='text']:focus,
        .update-editor-form textarea:focus {
          border-color: #7b202d;
          box-shadow: 0 0 0 2px rgba(123,32,45,.18);
        }

        .update-editor-form input::placeholder,
        .update-editor-form textarea::placeholder {
          color: #777;
        }

        .update-important-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: #ddd;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .update-important-check input {
          width: 15px;
          height: 15px;
          margin: 0;
          accent-color: #a52a3b;
        }

        .update-editor-error {
          margin: 0;
          padding: 9px 11px;
          border: 1px solid #54252b;
          border-radius: 9px;
          background: #25181a;
          color: #e9a5ad;
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-line;
        }

        .update-editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 3px;
        }

        .update-editor-cancel,
        .update-editor-submit {
          min-height: 38px;
          padding: 0 15px;
          border-radius: 9px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .update-editor-cancel {
          border: 1px solid #383838;
          background: #202020;
          color: #bbb;
        }

        .update-editor-submit {
          border: 1px solid #7b202d;
          background: #7b202d;
          color: #fff;
        }

        .update-editor-submit:disabled {
          opacity: .55;
          cursor: default;
        }

        .update-list {
          display: grid;
          gap: 10px;
        }

        .update-card {
          padding: 17px 18px;
          border: 1px solid #303030;
          border-radius: 14px;
          background: #171717;
          box-shadow: 0 5px 18px rgba(0,0,0,.12);
        }

        .update-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .update-important-badge {
          padding: 4px 8px;
          border-radius: 999px;
          background: #7b202d;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
        }

        .update-card-date {
          color: #777;
          font-size: 11px;
        }

        .update-card-title {
          margin: 0 0 8px;
          color: #fff;
          font-size: 16px;
          line-height: 1.45;
        }

        .update-card-content {
          margin: 0;
          color: #aaa;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-line;
        }

        .update-card-actions {
          display: flex;
          gap: 7px;
          margin-top: 13px;
        }

        .update-card-actions button {
          padding: 6px 10px;
          border: 1px solid #383838;
          border-radius: 8px;
          background: #202020;
          color: #aaa;
          font: inherit;
          font-size: 11px;
          cursor: pointer;
        }

        .update-card-actions .update-delete-button {
          border-color: #54252b;
          color: #d99098;
        }

        @media (max-width: 640px) {
          .update-editor-overlay {
            align-items: flex-end;
            padding: 0;
          }

          .update-editor {
            width: 100%;
            max-height: 88dvh;
            padding: 18px 16px 20px;
            border-radius: 18px 18px 0 0;
            border-bottom: 0;
          }

          .update-editor-header {
            margin-bottom: 14px;
          }

          .update-editor-form textarea {
            min-height: 150px;
          }

          .update-editor-actions > button {
            flex: 1 1 0;
          }

          .update-card {
            padding: 15px;
          }
        }

        .add-schedule-menu { position: relative; flex: 0 0 auto; }
        .add-schedule-chevron { display: inline-block; margin-left: 4px; opacity: .75; }
        .add-schedule-menu-panel { position: absolute; top: calc(100% + 6px); right: 0; z-index: 30; min-width: 170px; padding: 5px; border: 1px solid #383838; border-radius: 10px; background: #1b1b1b; box-shadow: 0 10px 24px rgba(0,0,0,.28); }
        .add-schedule-menu-panel button { display: block; width: 100%; padding: 9px 10px; border: 0; border-radius: 7px; background: transparent; color: #eee; text-align: left; font: inherit; font-size: 12px; cursor: pointer; }
        .add-schedule-menu-panel button:hover { background: #2a2a2a; }

        .auto-import-button {
          border: 1px solid #5b4650;
          border-radius: 10px;
          background: #241d20;
          color: #f0dce2;
          padding: 10px 13px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .auto-import-button:hover {
          background: #302327;
          border-color: #775865;
        }

        .auto-import-sheet {
          max-width: 900px;
        }

        .auto-import-intro {
          margin: 0 0 14px;
          color: #8f8f8f;
          font-size: 12px;
          line-height: 1.55;
        }

        .auto-import-source-tabs {
          display: flex;
          gap: 7px;
          margin-bottom: 12px;
        }

        .auto-import-source-tab {
          border: 1px solid #353535;
          border-radius: 9px;
          background: #1b1b1b;
          color: #999;
          padding: 8px 11px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .auto-import-source-tab.active {
          border-color: #7b202d;
          background: #2a1b20;
          color: #f4e6ea;
        }

        .auto-import-context {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-bottom: 12px;
        }

        .auto-import-context label {
          display: grid;
          gap: 5px;
          color: #aaa;
          font-size: 11px;
          font-weight: 700;
        }

        .auto-import-context input,
        .auto-import-context select,
        .auto-import-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #363636;
          border-radius: 9px;
          background: #181818;
          color: #f4f4f4;
          padding: 10px 11px;
          font: inherit;
        }

        .auto-import-textarea {
          min-height: 180px;
          resize: vertical;
          line-height: 1.55;
        }

        .auto-import-image-picker {
          display: grid;
          gap: 9px;
          padding: 16px;
          border: 1px dashed #464646;
          border-radius: 12px;
          background: #191919;
        }

        .auto-import-image-name {
          color: #999;
          font-size: 11px;
          word-break: break-all;
        }

        .auto-import-review-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
          color: #999;
          font-size: 11px;
        }

        .auto-import-candidate-list {
          display: grid;
          gap: 9px;
          max-height: 52vh;
          overflow-y: auto;
          padding-right: 2px;
        }

        .auto-import-candidate {
          border: 1px solid #343434;
          border-radius: 12px;
          background: #1d1d1d;
          padding: 11px;
        }

        .auto-import-candidate.duplicate {
          border-color: #51464a;
          opacity: 0.7;
        }

        .auto-import-candidate-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
          margin-bottom: 9px;
        }

        .auto-import-candidate-head input[type='checkbox'] {
          width: 16px;
          height: 16px;
          accent-color: #7b202d;
        }

        .auto-import-candidate-number {
          color: #777;
          font-size: 10px;
          font-weight: 800;
        }

        .auto-import-duplicate-label {
          color: #d1a6b0;
          font-size: 10px;
          font-weight: 800;
        }

        .auto-import-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .auto-import-field {
          display: grid;
          gap: 4px;
        }

        .auto-import-field.full {
          grid-column: 1 / -1;
        }

        .auto-import-field span {
          color: #777;
          font-size: 9px;
          font-weight: 700;
        }

        .auto-import-field input,
        .auto-import-field select,
        .auto-import-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #333;
          border-radius: 7px;
          background: #151515;
          color: #f3f3f3;
          padding: 8px 9px;
          font: inherit;
          font-size: 11px;
        }

        .auto-import-field textarea {
          min-height: 52px;
          resize: vertical;
        }

        .auto-import-warning {
          margin: 8px 0 0;
          padding: 7px 9px;
          border-radius: 7px;
          background: #29221d;
          color: #d0ad8f;
          font-size: 10px;
          line-height: 1.45;
        }

        .auto-import-confidence {
          color: #777;
          font-size: 9px;
        }

        .auto-import-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
        }

        .auto-import-footer-actions {
          display: flex;
          gap: 7px;
        }

        .auto-import-secondary-button {
          border: 1px solid #373737;
          border-radius: 9px;
          background: #1b1b1b;
          color: #aaa;
          padding: 10px 13px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .auto-import-primary-button {
          border: 1px solid #7b202d;
          border-radius: 9px;
          background: #7b202d;
          color: #fff;
          padding: 10px 13px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .auto-import-primary-button:disabled,
        .auto-import-secondary-button:disabled,
        .auto-import-button:disabled {
          opacity: 0.5;
          cursor: default;
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
            border-radius: 0;
          }

          .yb-logo-image {
            width: 38px;
            height: 38px;
          }

          .timetable-anniversary-badge {
            top: 2px !important;
            font-size: 7px !important;
          }

          .admin-list-actions {
            width: 100%;
            justify-content: stretch;
          }

          .admin-list-actions > button {
            flex: 1 1 0;
          }

          .admin-list-actions .add-schedule-menu { flex: 1 1 0; }
          .admin-list-actions .add-schedule-menu > .add-schedule-button { width: 100%; }
          .add-schedule-menu-panel { left: 0; right: auto; }

          .auto-import-context {
            grid-template-columns: 1fr 1fr;
          }

          .auto-import-fields {
            grid-template-columns: 1fr;
          }

          .auto-import-field.full {
            grid-column: auto;
          }

          .auto-import-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .auto-import-footer-actions {
            width: 100%;
          }

          .auto-import-footer-actions > button {
            flex: 1 1 0;
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
            left: 0;
            right: 0;
            grid-template-columns: 58px repeat(7, minmax(92px, 1fr));
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

        }

        /* =========================================================
           관리자 모바일 UI 최종 보정
           ========================================================= */
        @media (max-width: 700px) {
          .calendar-header {
            min-width: 0 !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .calendar-header > .calendar-title-row {
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }

          .calendar-header > .admin-list-actions {
            width: auto !important;
            min-width: 0 !important;
            flex: 0 0 auto !important;
            justify-content: flex-end !important;
          }

          .calendar-header > .admin-list-actions .add-schedule-menu {
            width: auto !important;
            min-width: 0 !important;
            flex: 0 0 auto !important;
          }

          .calendar-header > .admin-list-actions .add-schedule-button {
            width: auto !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 8px 10px !important;
            white-space: nowrap !important;
            box-sizing: border-box !important;
          }

          .schedule-view-sheet {
            align-self: center !important;
            width: calc(100% - 20px) !important;
            max-width: 620px !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: calc(100dvh - 24px) !important;
            margin: auto !important;
            padding: 10px 15px 20px !important;
            border-radius: 18px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
          }

          /* 모바일: 날짜 일정 목록은 내용만큼만 높이고 최대 약 1/3까지 */
          .schedule-view-sheet.schedule-selection-sheet {
            max-height: 33dvh !important;
            overflow-y: auto !important;
          }

          /* 모바일 상세는 내용이 잘리지 않게 자동 높이. 화면을 넘을 때만 스크롤 */
          .schedule-view-sheet.schedule-detail-sheet {
            max-height: calc(100dvh - 24px) !important;
            overflow-y: auto !important;
          }

          .schedule-view-sheet .schedule-detail,
          .schedule-view-sheet .schedule-selection-list,
          .schedule-view-sheet .schedule-item {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .schedule-view-sheet .schedule-item {
            padding: 14px !important;
            overflow: hidden !important;
          }

          .schedule-view-sheet .schedule-item h3 {
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .schedule-view-sheet .detail-row {
            min-width: 0 !important;
            align-items: flex-start !important;
          }

          .schedule-view-sheet .detail-row strong {
            flex: 0 0 46px !important;
          }

          .schedule-view-sheet .detail-row > span,
          .schedule-view-sheet .detail-row > a {
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .schedule-view-sheet .address-link,
          .schedule-view-sheet .place-link,
          .schedule-view-sheet .reference-link {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }

          .schedule-view-sheet .memo-section,
          .schedule-view-sheet .memo-editor {
            min-width: 0 !important;
            max-width: 100% !important;
          }

          /* 모바일 모달 하단의 불필요한 빈 공간 제거 */
          .schedule-view-sheet {
            padding-bottom: 4px !important;
          }

          .schedule-view-sheet .schedule-detail {
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }

          .schedule-view-sheet .schedule-item {
            margin-bottom: 0 !important;
          }

          .schedule-view-sheet .schedule-selection-list {
            margin-bottom: 0 !important;
          }

          /* 모바일 날짜/상세 모달은 화면 아래에 붙이고, 모달 아래 빈 공간을 만들지 않음 */
          .overlay:has(.schedule-view-sheet) {
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 0 !important;
          }

          .overlay:has(.schedule-view-sheet) .schedule-view-sheet {
            align-self: flex-end !important;
            margin: 0 auto 20px !important;
            width: calc(100% - 20px) !important;
          }

          .overlay:has(.schedule-view-sheet) .schedule-view-sheet.schedule-selection-sheet {
            height: auto !important;
            max-height: 33dvh !important;
          }

          .overlay:has(.schedule-view-sheet) .schedule-view-sheet.schedule-detail-sheet {
            height: auto !important;
            min-height: 50dvh !important;
            max-height: calc(100dvh - 24px) !important;
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
            aria-label="YB 공식 로고"
          >
            <img
              className="yb-logo-image"
              src={YB_OFFICIAL_LOGO}
              alt="YB"
            />
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
                  page === 'updates'
                    ? 'nav-button active'
                    : 'nav-button'
                }
                onClick={() => {
                  setPage('updates')
                  loadUpdates()
                }}
              >
                업데이트 현황
              </button>

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

          {session ? (
            <button
              className="header-button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          ) : (
            <button
              className="header-button"
              type="button"
              onClick={openAuthPrompt}
            >
              로그인
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

              <div className="admin-list-actions">
                {renderAddScheduleMenu()}
              </div>
            </div>

            <div className="schedule-list-toolbar">
              <div className="schedule-list-filter-label">
                일정 보기
              </div>

              <select
                className="schedule-list-filter"
                value={scheduleListFilter}
                onChange={(e) =>
                  setScheduleListFilter(e.target.value)
                }
                aria-label="일정목록 표시 범위"
              >
                <option value="upcoming">
                  지나간 일정 숨김
                </option>
                <option value="past">
                  지난 일정만 보기
                </option>
                <option value="all">
                  전체 일정 보기
                </option>
              </select>

              <span className="schedule-list-count">
                {scheduleListSchedules.length}개
              </span>
            </div>

            <div className="schedule-list">
              {scheduleListSchedules.length ===
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
                    scheduleListFilter === 'upcoming'
                      ? '지나간 일정을 제외하면 표시할 일정이 없습니다.'
                      : scheduleListFilter === 'past'
                        ? '지난 일정이 없습니다.'
                        : '등록된 일정이 없습니다.'
                  )}
                </div>
              ) : (
                scheduleListSchedules.map(
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
        ) : page === 'updates' && session ? (
          <section className="schedule-list-page update-page">
            <div className="list-page-header">
              <div>
                <p className="page-eyebrow">UPDATE</p>
                <h1>업데이트 현황</h1>
                <p className="page-description">
                  앱에서 변경되거나 추가된 기능을 확인할 수 있습니다.
                </p>
              </div>

              {isAdmin && !editingUpdate && (
                <button
                  className="add-schedule-button"
                  type="button"
                  onClick={openNewUpdateForm}
                >
                  + 업데이트 작성
                </button>
              )}
            </div>

            {isAdmin && showUpdateForm && (
              <div className="update-editor-overlay" onClick={cancelUpdateForm}>
                <div className="update-editor" onClick={(e) => e.stopPropagation()}>
                  <div className="update-editor-header">
                    <h2>{editingUpdate ? '업데이트 수정' : '업데이트 작성'}</h2>
                    <button type="button" className="update-editor-close" onClick={cancelUpdateForm}>×</button>
                  </div>

                  <form className="update-editor-form" onSubmit={handleSaveUpdate}>
                    <input
                      type="text"
                      value={updateForm.title}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="업데이트 제목"
                      autoFocus
                    />
                    <textarea
                      value={updateForm.content}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="업데이트 내용을 입력해주세요."
                    />
                    <label className="update-important-check">
                      <input
                        type="checkbox"
                        checked={updateForm.is_important}
                        onChange={(e) => setUpdateForm((prev) => ({ ...prev, is_important: e.target.checked }))}
                      />
                      중요 업데이트
                    </label>

                    {updateError && <p className="update-editor-error">{updateError}</p>}

                    <div className="update-editor-actions">
                      <button type="button" className="update-editor-cancel" onClick={cancelUpdateForm}>취소</button>
                      <button type="submit" disabled={updateSaving} className="update-editor-submit">
                        {updateSaving ? '저장 중...' : editingUpdate ? '수정 저장' : '등록'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {updateLoading ? (
              <div className="empty-list">업데이트 현황을 불러오는 중입니다.</div>
            ) : updateError && updates.length === 0 ? (
              <div className="empty-list" style={{ whiteSpace: 'pre-line' }}>{updateError}</div>
            ) : updates.length === 0 ? (
              <div className="empty-list">아직 등록된 업데이트가 없습니다.</div>
            ) : (
              <div className="update-list">
                {updates.map((update) => (
                  <article key={update.id} className="update-card">
                    <div className="update-card-meta">
                      {update.is_important && <span className="update-important-badge">중요 업데이트</span>}
                      <span className="update-card-date">{formatRequestDate(update.created_at)}</span>
                    </div>
                    <h3 className="update-card-title">{update.title}</h3>
                    <p className="update-card-content">{update.content}</p>
                    {isAdmin && (
                      <div className="update-card-actions">
                        <button type="button" onClick={() => openEditUpdateForm(update)}>수정</button>
                        <button type="button" className="update-delete-button" onClick={() => handleDeleteUpdate(update)}>삭제</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
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
                <div className="admin-list-actions">
                  {renderAddScheduleMenu()}
                </div>
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

                                      <div
                                        className="event-title-row"
                                        style={{
                                          '--event-color':
                                            TYPE_COLORS[
                                              schedule.schedule_type
                                            ] || '#999',
                                        }}
                                      >
                                        {attendanceStatuses[schedule.id] && (
                                          <span
                                            className={'attendance-icon attendance-' + attendanceStatuses[schedule.id]}
                                            aria-label={'참석 여부: ' + attendanceStatuses[schedule.id]}
                                            title={'참석 여부: ' + attendanceStatuses[schedule.id]}
                                          >
                                            {getAttendanceIcon(attendanceStatuses[schedule.id])}
                                          </span>
                                        )}
                                        <span
                                          className="event-title"
                                          style={{
                                            '--event-color':
                                              TYPE_COLORS[
                                                schedule.schedule_type
                                              ] || '#999',
                                          }}
                                        >
                                          {schedule.calendar_title || schedule.title}
                                        </span>
                                      </div>
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
                                    dayIndex + 2,
                                }}
                              >
                                {anniversaries.length > 0 && (
                                  <div
                                    className="timetable-anniversary"
                                    aria-hidden="true"
                                  />
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
                          className={`agenda-item ${
                            isPastSchedule(schedule)
                              ? 'past'
                              : ''
                          }`}
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
            className={`bottom-sheet schedule-view-sheet ${selectedSchedule ? 'schedule-detail-sheet' : 'schedule-selection-sheet'}`}
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

                      {selectedSchedule.address ? (
                        <a
                          className="place-link"
                          href={getAddressHref(
                            selectedSchedule.address
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selectedSchedule.place}
                        </a>
                      ) : (
                        <span className="place-text">
                          {selectedSchedule.place}
                        </span>
                      )}
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

                  <div className="attendance-section">
                    <div className="attendance-heading">
                      <strong>참석 여부</strong>
                      <span>이 일정에 대한 내 참석 상태</span>
                    </div>
                    <div className="attendance-buttons">
                      {['참석', '미정', '불참'].map((status) => (
                        <button
                          type="button"
                          key={status}
                          className={attendanceStatuses[selectedSchedule.id] === status ? 'attendance-button active' : 'attendance-button'}
                          onClick={() => handleAttendanceChange(selectedSchedule.id, status)}
                        >
                          {getAttendanceIcon(status)} {status}
                        </button>
                      ))}
                      {attendanceStatuses[selectedSchedule.id] && (
                        <button
                          type="button"
                          className="attendance-reset-button"
                          onClick={() => handleAttendanceChange(selectedSchedule.id, null)}
                        >
                          선택 해제
                        </button>
                      )}
                    </div>
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

      {showAutoImport &&
        isAdmin && (
          <div
            className="overlay"
            onClick={closeAutoImport}
          >
            <div
              className="bottom-sheet auto-import-sheet"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="sheet-handle" />

              <div className="sheet-header">
                <h2>
                  ✨ 스케줄표 자동 등록
                </h2>

                <button
                  type="button"
                  className="close-button"
                  onClick={closeAutoImport}
                  disabled={
                    autoImportLoading ||
                    autoImportSaving
                  }
                >
                  ×
                </button>
              </div>

              {autoImportStage === 'input' ? (
                <>
                  <p className="auto-import-intro">
                    스케줄표 이미지를 올리거나
                    카페 글 내용을 붙여넣으면 AI가
                    일정을 읽어냅니다. 바로 저장하지
                    않고 먼저 검토할 수 있어요.
                  </p>

                  <div className="auto-import-source-tabs">
                    <button
                      type="button"
                      className={
                        autoImportMode === 'image'
                          ? 'auto-import-source-tab active'
                          : 'auto-import-source-tab'
                      }
                      onClick={() =>
                        setAutoImportMode('image')
                      }
                    >
                      🖼 이미지
                    </button>

                    <button
                      type="button"
                      className={
                        autoImportMode === 'text'
                          ? 'auto-import-source-tab active'
                          : 'auto-import-source-tab'
                      }
                      onClick={() =>
                        setAutoImportMode('text')
                      }
                    >
                      📝 카페 글
                    </button>
                  </div>

                  <div className="auto-import-context">
                    <label>
                      기준 연도
                      <input
                        type="number"
                        min="2020"
                        max="2100"
                        value={
                          autoImportYear
                        }
                        onChange={(e) =>
                          setAutoImportYear(
                            e.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      기준 월
                      <select
                        value={
                          autoImportMonth
                        }
                        onChange={(e) =>
                          setAutoImportMonth(
                            Number(
                              e.target.value
                            )
                          )
                        }
                      >
                        {Array.from(
                          { length: 12 },
                          (_, index) =>
                            index + 1
                        ).map((month) => (
                          <option
                            key={month}
                            value={month}
                          >
                            {month}월
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {autoImportMode ===
                  'image' ? (
                    <div className="auto-import-image-picker">
                      <input
                        ref={
                          autoImportFileRef
                        }
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={
                          handleAutoImportImageChange
                        }
                        style={{
                          display: 'none',
                        }}
                      />

                      <button
                        type="button"
                        className="auto-import-secondary-button"
                        onClick={() =>
                          autoImportFileRef.current?.click()
                        }
                      >
                        {autoImportImageName
                          ? '이미지 다시 선택'
                          : '스케줄표 이미지 선택'}
                      </button>

                      {autoImportImageName && (
                        <span className="auto-import-image-name">
                          {autoImportImageName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <textarea
                      className="auto-import-textarea"
                      value={autoImportText}
                      onChange={(e) =>
                        setAutoImportText(
                          e.target.value
                        )
                      }
                      placeholder={`카페 글 내용을 그대로 붙여넣어주세요.

예:
9월 3일 천안 K-컬처박람회
8:20PM
천안 독립기념관 야외특설무대

9월 5일 사운드플래닛페스티벌
7:00PM
인천 파라다이스시티`}
                    />
                  )}

                  {autoImportError && (
                    <p className="error-message">
                      {autoImportError}
                    </p>
                  )}

                  <div className="auto-import-footer">
                    <span className="auto-import-confidence">
                      원문에 없는 정보는 비워두도록
                      설정되어 있어요.
                    </span>

                    <button
                      type="button"
                      className="auto-import-primary-button"
                      onClick={
                        handleAnalyzeAutoImport
                      }
                      disabled={
                        autoImportLoading
                      }
                    >
                      {autoImportLoading
                        ? '분석 중...'
                        : '✨ 일정 분석하기'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="auto-import-intro">
                    찾은 일정은 저장 전에 직접
                    수정할 수 있습니다. 중복으로
                    보이는 일정은 자동으로 선택 해제했어요.
                  </p>

                  <div className="auto-import-review-toolbar">
                    <span>
                      {autoImportCandidates.length}
                      개 일정 ·{' '}
                      {
                        autoImportCandidates.filter(
                          (candidate) =>
                            candidate.selected
                        ).length
                      }
                      개 선택
                    </span>

                    <button
                      type="button"
                      className="auto-import-secondary-button"
                      onClick={
                        toggleAllAutoImportCandidates
                      }
                    >
                      선택 전체 전환
                    </button>
                  </div>

                  <div className="auto-import-candidate-list">
                    {autoImportCandidates.map(
                      (candidate, index) => (
                        <div
                          className={
                            candidate.duplicate
                              ? 'auto-import-candidate duplicate'
                              : 'auto-import-candidate'
                          }
                          key={candidate.id}
                        >
                          <div className="auto-import-candidate-head">
                            <input
                              type="checkbox"
                              checked={
                                candidate.selected
                              }
                              onChange={() =>
                                toggleAutoImportCandidate(
                                  candidate.id
                                )
                              }
                            />

                            <span className="auto-import-candidate-number">
                              #{index + 1}
                            </span>

                            {candidate.duplicate && (
                              <span className="auto-import-duplicate-label">
                                기존 일정과 중복 가능
                              </span>
                            )}
                          </div>

                          <div className="auto-import-fields">
                            <label className="auto-import-field full">
                              <span>
                                전체 제목 *
                              </span>
                              <input
                                value={
                                  candidate.title
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'title',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field full">
                              <span>
                                달력에 표시할 일정명
                              </span>
                              <input
                                value={candidate.calendar_title || ''}
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'calendar_title',
                                    e.target.value
                                  )
                                }
                                placeholder="비워두면 전체 제목 표시"
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                유형 *
                              </span>
                              <select
                                value={
                                  candidate.schedule_type
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'schedule_type',
                                    e.target.value
                                  )
                                }
                              >
                                {TYPE_OPTIONS.map(
                                  (type) => (
                                    <option
                                      key={type}
                                      value={type}
                                    >
                                      {type}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <label className="auto-import-field">
                              <span>
                                시작 날짜 *
                              </span>
                              <input
                                type="date"
                                value={
                                  candidate.event_date
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'event_date',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                시작 시간
                              </span>
                              <input
                                type="time"
                                value={
                                  candidate.event_time
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'event_time',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                종료 날짜
                              </span>
                              <input
                                type="date"
                                min={
                                  candidate.event_date ||
                                  undefined
                                }
                                value={
                                  candidate.end_date
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'end_date',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                종료 시간
                              </span>
                              <input
                                type="time"
                                value={
                                  candidate.end_time
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'end_time',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                장소
                              </span>
                              <input
                                value={
                                  candidate.place
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'place',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field full">
                              <span>
                                참고 사항
                              </span>
                              <textarea
                                value={
                                  candidate.details
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'details',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                참고 링크 주소
                              </span>
                              <input
                                value={
                                  candidate.related_link
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'related_link',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label className="auto-import-field">
                              <span>
                                링크 표시 문구
                              </span>
                              <input
                                value={
                                  candidate.related_link_text
                                }
                                onChange={(e) =>
                                  updateAutoImportCandidate(
                                    candidate.id,
                                    'related_link_text',
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>

                          {(candidate.warning ||
                            candidate.confidence) && (
                            <p className="auto-import-warning">
                              {candidate.warning ||
                                'AI 분석 결과를 검토해주세요.'}
                              {candidate.confidence && (
                                <span className="auto-import-confidence">
                                  {' '}
                                  · 확신도:{' '}
                                  {candidate.confidence}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {autoImportError && (
                    <p className="error-message">
                      {autoImportError}
                    </p>
                  )}

                  <div className="auto-import-footer">
                    <button
                      type="button"
                      className="auto-import-secondary-button"
                      onClick={() =>
                        setAutoImportStage('input')
                      }
                      disabled={
                        autoImportSaving
                      }
                    >
                      ← 다시 분석
                    </button>

                    <div className="auto-import-footer-actions">
                      <button
                        type="button"
                        className="auto-import-secondary-button"
                        onClick={closeAutoImport}
                        disabled={
                          autoImportSaving
                        }
                      >
                        취소
                      </button>

                      <button
                        type="button"
                        className="auto-import-primary-button"
                        onClick={
                          handleSaveAutoImport
                        }
                        disabled={
                          autoImportSaving
                        }
                      >
                        {autoImportSaving
                          ? '등록 중...'
                          : '선택한 일정 등록'}
                      </button>
                    </div>
                  </div>
                </>
              )}
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
                  달력에 표시할 일정명
                  <input
                    name="calendar_title"
                    value={form.calendar_title}
                    onChange={handleFormChange}
                    placeholder="예: 중대 축제"
                  />
                  <small className="form-help">
                    비워두면 전체 제목이 달력에 표시됩니다. Agenda에서는 항상 전체 제목이 표시됩니다.
                  </small>
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

                    <option value="콘서트/팬미팅">
                      콘서트/팬미팅
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

        <Analytics />
    </div>
  )
}

export default App
