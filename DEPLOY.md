# Railway デプロイ用README

## Railway無料枠デプロイ手順

### 1. Railwayでデプロイ
1. [Railway](https://railway.app)にアクセス
2. GitHub でサインアップ/ログイン
3. "New Project" → "Deploy from GitHub repo" 
4. この `typing-race` リポジトリを選択

### 2. 環境変数の設定
Railwayのダッシュボードで以下を設定：

```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### 3. Vercelでフロントエンドをデプロイ
1. [Vercel](https://vercel.com)にアクセス
2. GitHub でサインアップ/ログイン
3. "New Project" → このリポジトリを選択
4. 環境変数を設定：
```
NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.railway.app
```

### 4. カスタムドメイン（オプション）
- Railway: カスタムドメインを設定可能
- Vercel: 自動的に vercel.app ドメインが割り当て

### 5. 完全無料で30人対応！
- Railway無料枠: 月500時間
- Vercel無料枠: 無制限（合理的利用範囲内）
- 合計コスト: **0円**

## 技術仕様
- Next.js 15.4.1
- Socket.io 4.8.1
- WebSocket リアルタイム通信
- 30人同時参加対応
- 日本語タイピング対応
