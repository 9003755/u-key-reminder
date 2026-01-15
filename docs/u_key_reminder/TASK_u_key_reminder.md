# TASK: U盾/CA证书到期提醒系统开发任务

## 任务清单

### 1. 项目初始化 (Init)
- [ ] **Task-1.1**: 使用 Vite 创建 React + TypeScript 项目。
- [ ] **Task-1.2**: 安装 Tailwind CSS, Lucide React (图标), Supabase Client, React Router。
- [ ] **Task-1.3**: 配置环境变量 (`.env.local`) 存放 Supabase URL 和 Key。

### 2. 数据库与后端配置 (Supabase)
- [ ] **Task-2.1**: 编写 SQL 迁移脚本 (`supabase/migrations/01_init.sql`)。
    - 创建 `profiles` 表。
    - 创建 `assets` 表。
    - 设置 RLS (Row Level Security) 策略。
- [ ] **Task-2.2**: 编写 Edge Function 代码框架 (`supabase/functions/check-expiry/index.ts`)。

### 3. 前端功能开发 (Frontend)
- [ ] **Task-3.1**: 实现全局 `AuthProvider` (基于 Supabase Auth)。
- [ ] **Task-3.2**: 开发 **登录/注册页面** (`/login`)。
- [ ] **Task-3.3**: 开发 **资产仪表盘** (`/dashboard`)。
    - 列表展示。
    - 到期时间计算与颜色标记。
- [ ] **Task-3.4**: 开发 **添加/编辑资产组件**。
    - 表单验证。
    - 数据库写入。
- [ ] **Task-3.5**: 开发 **设置页面** (`/settings`)。
    - 绑定 PushPlus Token。
    - 设置提醒提前量。

### 4. 自动化通知逻辑 (Edge Function)
- [ ] **Task-4.1**: 实现 `check-expiry` 的核心逻辑。
    - 查询数据库中满足条件的记录。
    - 集成 Resend 发送邮件。
    - 集成 PushPlus 发送微信消息。
- [ ] **Task-4.2**: 编写调用 Edge Function 的 SQL 触发器或 Cron 调度指令。

### 5. 验收与部署 (Deploy)
- [ ] **Task-5.1**: 验证全流程（添加资产 -> 修改日期 -> 触发模拟通知）。
- [ ] **Task-5.2**: 提供 Vercel 部署指南。
