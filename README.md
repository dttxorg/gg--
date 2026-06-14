# giffgaff 代理资料库

内部代理资料库 · 按平台分栏 · 文案富文本编辑 · 一键复制全文 + 复制图片

## 功能

- **账号系统**：管理员 / 代理两种角色，管理员可创建/管理代理账号（设过期、改密、停用）
- **资料库**：5 大平台（小红书 / 抖音 / B站 / 今日头条 / 微博）独立分栏
- **富文本编辑**：Tiptap 编辑器，支持加粗、列表、标题、引用、链接、图片
- **图片管理**：上传到 Cloudflare R2，代理可一键复制图片到剪贴板
- **复制全文**：纯文本格式，可直接粘贴到任意平台

## 技术栈

- **前端**：Next.js 15 (App Router) + React 18 + TypeScript + Tailwind CSS
- **后端**：Next.js API Routes + Prisma ORM
- **数据库**：Vercel Postgres（推荐）或 Neon
- **认证**：Auth.js v5 (NextAuth) + bcrypt
- **图片存储**：Cloudflare R2 (S3 兼容)
- **部署**：Vercel

## 项目结构

```
src/
├── app/
│   ├── (app)/                    # 已登录用户布局
│   │   ├── admin/                # 管理员后台
│   │   │   ├── page.tsx          # 概览
│   │   │   ├── posts/            # 文案管理
│   │   │   │   ├── page.tsx      # 列表
│   │   │   │   └── [id]/edit/    # 编辑器（Tiptap）
│   │   │   └── users/            # 账号管理
│   │   └── library/              # 代理资料库
│   │       ├── page.tsx          # 平台 Tab + 列表
│   │       └── [platform]/[id]/  # 文案详情
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js 路由
│   │   └── admin/                # 管理员 API
│   │       ├── posts/            # 文案 CRUD
│   │       ├── users/            # 账号 CRUD
│   │       ├── upload/           # 图片上传
│   │       └── images/           # 图片删除
│   ├── login/                    # 登录页
│   ├── layout.tsx
│   └── page.tsx                  # 根路由（按角色重定向）
├── lib/
│   ├── auth.ts                   # Auth.js 配置
│   ├── prisma.ts                 # Prisma 单例
│   └── r2.ts                     # R2 上传工具
└── middleware.ts                 # 路由保护
```

## 快速开始（Vercel 部署）

### 1. 准备服务

| 服务 | 用途 | 怎么搞 |
|---|---|---|
| GitHub 账号 | 存代码 | github.com |
| Vercel 账号 | 部署 + Postgres | vercel.com（用 GitHub 登录） |
| Cloudflare 账号 | R2 图片存储 | dash.cloudflare.com → R2 |

### 2. Cloudflare R2 配置

1. 登录 Cloudflare → R2 → Create bucket，名字如 `giffgaff-agent-hub`
2. 桶设置 → Public Development URL → 启用，记下公开域名（`https://pub-xxx.r2.dev`）
3. R2 → Manage R2 API Tokens → Create API Token，权限 Edit your bucket
4. 记下：Access Key ID、Secret Access Key、Account ID（在 R2 主页右上角）

### 3. 推代码到 GitHub

```bash
cd giffgaff-agent-hub
git init
git add .
git commit -m "feat: 初始化代理资料库"
gh repo create giffgaff-agent-hub --private --source=. --push
```

### 4. Vercel 部署

1. vercel.com → Add New Project → 选你刚推的 GitHub 仓库 → Import
2. **Vercel Postgres**：Storage → Create Database → Postgres → 选免费 Hobby 套餐 → 选项目 → Create
3. **环境变量**（Project Settings → Environment Variables）：

```
AUTH_SECRET          = <openssl rand -base64 32>
AUTH_TRUST_HOST      = true
DATABASE_URL         = <Vercel Postgres 的 POSTGRES_PRISMA_URL 或 Neon connection string>
SEED_TOKEN           = <随机长密钥，用于受保护的 /api/seed 初始化>
R2_ACCOUNT_ID        = <你的 Cloudflare 账户 ID>
R2_ACCESS_KEY_ID     = <R2 API Token 的 Access Key>
R2_SECRET_ACCESS_KEY = <R2 API Token 的 Secret>
R2_BUCKET            = giffgaff-agent-hub
R2_PUBLIC_HOST       = https://pub-你的id.r2.dev
```

4. 部署 → 拿到 URL 如 `https://giffgaff-agent-hub-xxx.vercel.app`

### 5. 初始化数据库 + 管理员

临时方式：先在 Vercel 环境变量里配置 `SEED_TOKEN`，部署后带 token 访问一次：

```text
https://你的域名.vercel.app/api/seed?token=<SEED_TOKEN>
```

应该看到 JSON，包含：

```json
{
  "ok": true,
  "credentials": {
    "username": "admin",
    "password": "Admin@2026!"
  }
}
```

然后访问 `/login`，用上面的账号登录。生产环境如果不需要远程初始化，可以删除 Vercel 的 `SEED_TOKEN`，此时 `/api/seed` 会返回 404。

如果访问 `/api/seed` 看到的是 Vercel 的 `Authentication Required`，那不是应用代码跳转，而是 Vercel Deployment Protection 拦截。处理方式二选一：

- 在 Vercel 项目 Settings → Deployment Protection 里允许访问当前部署/生产部署。
- 或者使用 Vercel 的 bypass token / `vercel curl` 访问该 URL。

更稳妥的方式：本地拉取生产环境变量后跑命令：

```bash
# 拉环境变量本地跑 seed
vercel env pull .env.local
npx prisma db push   # 创建表
ADMIN_USERNAME=admin ADMIN_PASSWORD='你的强密码' node scripts/db-seed.mjs
```

或者直接登录 Vercel Postgres 控制台手动 INSERT 一个 admin 账号（bcrypt hash 用上面 seed 脚本生成）。

### 6. 登录使用

- 访问 `https://你的域名.vercel.app/login`
- 用 admin / 你设的密码登录
- 自动跳转到 `/admin` 后台
- 在 `/admin/users` 创建代理账号
- 在 `/admin/posts` 新建文案（带富文本 + 图片）
- 代理从 `/library` 进入资料库看 + 复制

## 本地开发

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 填入真实的 DATABASE_URL 和 R2 凭证（或临时用本地 Postgres + 跳过图片上传）

# 3. 推送 schema
npm run db:push

# 4. 创建管理员
ADMIN_USERNAME=admin ADMIN_PASSWORD='Admin@2026!' npm run db:seed

# 5. 启动
npm run dev
# → http://localhost:3000
```

## 常见问题

### 1. 图片上传失败：R2 credentials 错误
检查环境变量 `R2_*` 是否都填了，R2 bucket 是否开启了 public access。

### 2. 登录后白屏：JWT 错误
确保 `AUTH_SECRET` 已设置，且 `AUTH_TRUST_HOST=true`（Vercel 必须）。

### 3. 代理账号登不上
- 检查 `/admin/users` 里账号是否 `isActive: true`
- 检查 `expireAt` 是否过期

### 4. 想换平台（增删）
改 `scripts/db-seed.mjs` 里的 PLATFORMS 数组，重跑 seed；或后台直接改数据库。

## 待办（未来功能）

- [ ] 暗色模式
- [ ] 文案标签云
- [ ] 复制图片兼容 Safari（Safari 不支持 ClipboardItem image）
- [ ] 全文搜索
- [ ] 代理收藏夹
- [ ] 移动端优化
