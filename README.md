# CorePick (コアピック) 🚀

**「情報の核心（Core）をつかみ、次の一歩（Pick）を踏み出す。」**
忙しい現代人のための、AI要約 & アクション提案アプリケーション。

## アプリ概要
Web記事やYouTube動画のURLを入力するだけで、Gemini AIがその内容を瞬時に解析し、以下の2つの情報を提示します。

1. **Core Summary (3行要約)**: コンテンツの核心となる「結論」や「重要な主張」を3点で簡潔にまとめます。
2. **Next Steps (ネクストアクション)**: 読者がその情報を得た後に取るべき「具体的な行動」を3ステップで提案します。

「情報をインプットしただけで終わらせず、行動に繋げる」ことを目的とした、アウトプット志向のツールです。
ログイン不要で履歴がブラウザ（ローカルストレージ）に自動保存されるため、プライバシーを守りながら手軽に利用できます。

## 使い方

1. **URLを入力**: 画面上部の入力欄に、要約したいWeb記事やYouTube動画のURLを貼り付けます。
2. **Pick! ボタンをクリック**: 解析が開始され、数秒で結果が表示されます。
3. **結果を確認**:
   - カードが自動で開き、要約とネクストアクションが表示されます。
   - ネクストアクションはチェックリストとして活用できます。
4. **履歴の管理**:
   - 過去の解析結果は一覧に保存されます。
   - タイトルをクリックすると詳細が開閉します。
   - 不要な履歴はゴミ箱アイコンで削除可能です。

## 使用技術

- **Frontend**: Next.js (App Router), TypeScript, React
- **UI/Styling**: Tailwind CSS, shadcn/ui, Lucide React
- **AI Model**: Google Gemini API (gemini-3.0-flash)
- **State Management**: Zustand (LocalStorage persistence)
- **Scraping**: Cheerio
- **Deploy**: Vercel

## 公開URL
https://core-pick.vercel.app/
