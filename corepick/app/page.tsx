"use client";

import { useState } from "react";
import { useStore, CoreCard } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ExternalLink, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // どのカードが開いているかを管理する状態（IDのリスト）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { cards, addCard, deleteCard, toggleStep } = useStore();

  // カードの開閉を切り替える関数
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id); // 開いてたら閉じる
      } else {
        newSet.add(id); // 閉じてたら開く
      }
      return newSet;
    });
  };

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (data.error || !data.summary) {
        alert("解析に失敗しました。URLを確認してください");
        return;
      }

      // 新しいカードを作成
      const newCardId = crypto.randomUUID();
      const newCard: CoreCard = {
        id: newCardId,
        url: url,
        title: data.title || "No Title",
        summary: data.summary || [],
        nextSteps: (data.nextSteps || []).map((step: string, i: number) => ({
          id: crypto.randomUUID(),
          order: i + 1,
          content: step,
          isCompleted: false,
        })),
        createdAt: new Date().toISOString(),
      };

      addCard(newCard);

      // 生成したカードを自動で「開いた状態」にする
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(newCardId);
        return newSet;
      });

      setUrl("");
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました🙇‍♀️");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ヘッダーエリア */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            CorePick <span className="text-blue-600">🚀</span>
          </h1>
          <p className="text-lg text-slate-600">
            情報の「核心」をつかみ、次の「一歩」を踏み出そう。
          </p>
        </div>

        {/* 入力エリア */}
        <div className="flex gap-2 shadow-sm sticky top-4 z-10 bg-slate-50/80 backdrop-blur-sm p-2 rounded-xl">
          <Input
            placeholder="記事や動画のURLを貼ってください (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 text-lg bg-white border-blue-100 focus:border-blue-500"
            disabled={loading}
          />
          <Button
            onClick={handleGenerate}
            disabled={loading || !url}
            className="h-12 px-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
          >
            {loading ? "..." : "Pick!"}
          </Button>
        </div>

        {/* ローディング表示 */}
        {loading && (
          <Card className="animate-pulse border-blue-200 bg-blue-50">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-3/4 bg-blue-200" />
              <Skeleton className="h-4 w-1/2 bg-blue-200" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full bg-blue-200" />
            </CardContent>
          </Card>
        )}

        {/* カード一覧エリア */}
        <div className="space-y-4">
          {cards.map((card) => {
            const isExpanded = expandedIds.has(card.id);

            return (
              <Card
                key={card.id}
                className={`
                  overflow-hidden transition-all duration-300 bg-white border shadow-sm hover:shadow-md
                  ${isExpanded ? "ring-2 ring-blue-100 border-blue-200" : "border-slate-200"}
                `}
              >

                {/* クリックできるヘッダー（タイトル部分） */}
                <CardHeader
                  className="flex flex-row items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(card.id)}
                >
                  <div className="flex flex-col gap-1 pr-4 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{new Date(card.createdAt).toLocaleDateString()}</span>
                      {isExpanded ? (
                        <span className="text-blue-500 font-bold px-1.5 py-0.5 bg-blue-50 rounded text-[10px]">OPEN</span>
                      ) : (
                         <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">CLOSED</span>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 leading-tight">
                      {card.title}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 開閉アイコン */}
                    <div className={`
                      p-2 rounded-full transition-all duration-300
                      ${isExpanded ? "bg-blue-100 text-blue-600 rotate-180" : "bg-slate-100 text-slate-400"}
                    `}>
                      <ChevronDown className="w-5 h-5" />
                    </div>

                    {/* 削除ボタン（イベントの伝播を止める） */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // 親のクリック（開閉）を邪魔しないようにする
                        if(confirm("削除しますか？")) deleteCard(card.id);
                      }}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* 詳細コンテンツ（開いている時だけ表示） */}
                {isExpanded && (
                  <CardContent className="pt-0 p-6 border-t border-slate-100 bg-slate-50/30 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* 元記事リンク */}
                    <div className="mb-6">
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1 text-blue-500 hover:underline w-fit"
                      >
                        <ExternalLink className="w-3 h-3" />
                        元記事を開く
                      </a>
                    </div>

                    {/* 3行要約 */}
                    <div className="space-y-3 mb-8">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <span className="w-1 h-4 bg-yellow-400 rounded-full"></span>
                        Core Summary
                      </h3>
                      <ul className="space-y-3 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                        {card.summary.map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-slate-700 leading-relaxed text-sm sm:text-base">
                            <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-yellow-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next Steps */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                        Next Steps
                      </h3>
                      <div className="space-y-2">
                        {card.nextSteps.map((step) => (
                          <div
                            key={step.id}
                            onClick={() => toggleStep(card.id, step.id)}
                            className={`
                              flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all group select-none
                              ${step.isCompleted
                                ? "bg-slate-50 border-slate-200 opacity-70"
                                : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                              }
                            `}
                          >
                            <div className={`
                              flex-shrink-0 transition-colors
                              ${step.isCompleted ? "text-green-500" : "text-slate-300 group-hover:text-blue-500"}
                            `}>
                              {step.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </div>
                            <span className={`
                              flex-1 font-medium transition-all text-sm sm:text-base
                              ${step.isCompleted ? "text-slate-400 line-through" : "text-slate-700"}
                            `}>
                              {step.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* カードがない時の案内 */}
          {cards.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <p>まだ履歴がありません 🍃</p>
              <p className="text-sm mt-2">上のフォームからURLを入力して、<br/>最初の「Core」を見つけましょう！</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
