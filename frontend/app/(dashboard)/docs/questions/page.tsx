"use client"

import { useEffect, useState, useCallback } from "react"
import { DocsLayout } from "@/components/docs/docs-layout"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  CheckCircle2,
  Loader2,
  Clock,
  MessageCircle,
  Trash2,
} from "lucide-react"
import {
  getFaqQuestions,
  submitFaqQuestion,
  answerFaqQuestion,
  deleteFaqQuestion,
  type FaqQuestionItem,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function QuestionsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [questions, setQuestions] = useState<FaqQuestionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  // 답변 작성 (관리자)
  const [answeringId, setAnsweringId] = useState<number | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [answerSubmitting, setAnswerSubmitting] = useState(false)

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<FaqQuestionItem | null>(null)

  const fetchQuestions = useCallback(async () => {
    try {
      const data = await getFaqQuestions()
      setQuestions(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleSubmit = async () => {
    const trimmed = question.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError("")
    try {
      await submitFaqQuestion(trimmed)
      setSubmitted(true)
      setQuestion("")
      fetchQuestions()
      setTimeout(() => setSubmitted(false), 3000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "질문 등록에 실패했습니다."
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnswer = async (id: number) => {
    if (!answerText.trim()) return
    setAnswerSubmitting(true)
    try {
      await answerFaqQuestion(id, answerText.trim())
      setAnsweringId(null)
      setAnswerText("")
      fetchQuestions()
    } catch {
      // ignore
    } finally {
      setAnswerSubmitting(false)
    }
  }

  const handleDelete = async (item: FaqQuestionItem) => {
    try {
      await deleteFaqQuestion(item.id)
      setDeleteTarget(null)
      fetchQuestions()
    } catch {
      // ignore
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <DocsLayout>
      <h1>질문 등록</h1>
      <p className="text-muted-foreground mb-6">
        궁금한 점이 있으시면 아래에 질문을 남겨주세요. 관리자가 확인 후 답변드립니다.
      </p>

      {/* 질문 작성 폼 */}
      <div className="rounded-lg border border-border bg-card p-5 mb-8">
        <Textarea
          placeholder="질문 내용을 입력해주세요 (최대 500자)"
          maxLength={500}
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {question.length}/500
          </span>
          <div className="flex items-center gap-3">
            {submitted && (
              <span className="flex items-center gap-1.5 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                등록되었습니다
              </span>
            )}
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || submitting}
              size="sm"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {submitting ? "등록 중..." : "질문 등록"}
            </Button>
          </div>
        </div>
      </div>

      {/* 질문 목록 */}
      <h2 className="text-lg font-semibold mb-4 mt-0 border-0 pb-0">
        {isAdmin ? "전체 질문 목록" : "내 질문 목록"}
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          불러오는 중...
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          아직 등록된 질문이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-border bg-card p-5"
            >
              {/* 질문 헤더 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {isAdmin && (
                    <span className="text-xs text-muted-foreground mb-1 block">
                      {q.user_email}
                    </span>
                  )}
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {q.question}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {q.answer ? (
                    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                      답변 완료
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      대기 중
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(q)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                {formatDate(q.created_at)}
              </p>

              {/* 답변 표시 */}
              {q.answer && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">관리자 답변</span>
                    {q.answered_at && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {formatDate(q.answered_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {q.answer}
                  </p>
                </div>
              )}

              {/* 관리자 답변 작성 */}
              {isAdmin && !q.answer && (
                <div className="mt-3 pt-3 border-t border-border">
                  {answeringId === q.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="답변을 입력해주세요"
                        rows={3}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        className="resize-none text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAnsweringId(null)
                            setAnswerText("")
                          }}
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          disabled={!answerText.trim() || answerSubmitting}
                          onClick={() => handleAnswer(q.id)}
                        >
                          {answerSubmitting ? "등록 중..." : "답변 등록"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAnsweringId(q.id)
                        setAnswerText("")
                      }}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      답변 작성
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>질문 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 질문을 삭제하시겠습니까? 삭제된 질문은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DocsLayout>
  )
}
