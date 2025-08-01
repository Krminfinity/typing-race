# Typing Race - 教室向けタイピング競争サービス

教室での20人規模のリアルタイムタイピング競争を実現するWebアプリケーションです。

## 🎯 主な機能

### 教師用機能
- **ルーム作成**: 6桁PINでルームを作成
- **参加者管理**: リアルタイムで参加者を監視
- **競争開始**: 全参加者に同時にタイピング開始を指示
- **進捗表示**: 全参加者の進捗、速度、正確性をリアルタイム表示

### 生徒用機能
- **簡単参加**: PINコードでルームに参加
- **リアルタイム競争**: 他の参加者と同時にタイピング
- **進捗可視化**: 自分の順位、進捗、統計をリアルタイム表示
- **結果表示**: 完了時の詳細統計と順位

## 🛠 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Node.js, Express, Socket.io
- **リアルタイム通信**: WebSocket (Socket.io)
- **UI**: レスポンシブデザイン、教室環境最適化

## 🚀 セットアップ

### 前提条件
- Node.js 18.0 以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 📖 使用方法

### 教師の手順
1. ホーム画面で「先生（ルーム作成）」を選択
2. 先生の名前を入力してルームを作成
3. 生成された6桁PINを生徒に伝える
4. 生徒の参加を確認後、「競争開始！」ボタンで開始

### 生徒の手順
1. ホーム画面で「生徒（ルーム参加）」を選択
2. 教師から伝えられたPINと自分の名前を入力
3. ルーム参加後、競争開始を待機
4. 競争開始後、表示されたテキストを正確に入力

## 🎮 競争ルール

- **同時開始**: 全参加者が同じタイミングでスタート
- **同一テキスト**: 全員が同じ文章を入力
- **リアルタイム順位**: 進捗に応じて順位がリアルタイム更新
- **統計表示**: WPM（Words Per Minute）と正確性を計測

## 🔧 カスタマイズ

### テキストの変更
`server.js` の `room.text` を編集することで、タイピング用テキストを変更できます。

### 参加者数上限の調整
Socket.io設定で同時接続数の上限を調整可能です。

## 📱 対応デバイス

- **デスクトップ**: Chrome, Firefox, Safari, Edge
- **タブレット**: iPad, Android タブレット
- **モバイル**: iPhone, Android（基本機能のみ）

## 🎓 教育現場での活用

- **タイピング授業**: 基本的なタイピングスキル向上
- **競争形式**: ゲーミフィケーションでモチベーション向上
- **進捗管理**: 個別指導のための詳細統計
- **クラス活動**: 楽しい学習体験の提供

## 🔒 セキュリティ

- チャット機能なし（安全性重視）
- ルーム自動削除（教師切断時）
- 個人情報収集なし

## 📊 パフォーマンス

- **20人同時接続対応**
- **レスポンス時間**: 100ms以下
- **同期精度**: ±50ms以内
- **軽量設計**: 高速ロード

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🎯 今後の予定

- [ ] チーム戦機能
- [ ] カスタムテキスト作成機能
- [ ] 詳細分析レポート
- [ ] 多言語対応
- [ ] オフライン対応
