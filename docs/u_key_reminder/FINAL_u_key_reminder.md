# FINAL: U盾/CA证书到期提醒系统 - 交付文档

## 1. 项目概述
本项目已成功开发并交付，实现了一个基于 Supabase 和 React 的资产到期提醒系统。系统能够管理 U盾、CA 证书、域名等资产，并在到期前通过邮件 (Resend) 和微信 (PushPlus) 自动发送提醒。

## 2. 功能验收清单

### 2.1 核心功能
| 功能模块 | 验收项 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **资产管理** | 资产列表展示 | ✅ 已完成 | 支持按名称、类型、到期日排序 |
| | 添加/编辑/删除资产 | ✅ 已完成 | 支持多种资产类型，关联网站信息 |
| | 到期状态可视化 | ✅ 已完成 | 🔴 <7天, 🟡 <30天, 🟢 >30天 |
| **通知系统** | 邮件通知 | ✅ 已完成 | 使用 Resend 服务，支持 HTML 格式邮件 |
| | 微信通知 | ✅ 已完成 | 使用 PushPlus 服务，支持即时推送 |
| | 自定义提醒规则 | ✅ 已完成 | 用户可配置提前几天提醒 (如 30, 7, 1) |
| **自动化** | 定时检查 | ✅ 已完成 | 每日 09:30, 14:30, 21:00 自动运行 |

### 2.2 技术架构
- **前端**: React + TypeScript + Tailwind CSS (Vite 构建)
- **后端**: Supabase (PostgreSQL + Auth + Edge Functions)
- **调度**: pg_cron (数据库级定时任务)

## 3. 部署与维护指南

### 3.1 前端部署 (Netlify)
本项目已配置 `_redirects` 文件，支持 Netlify 部署。
1. 连接 GitHub 仓库。
2. 设置 Build Command: `npm run build`
3. 设置 Publish Directory: `dist`
4. **关键**: 在 Netlify 环境变量中配置：
   - `VITE_SUPABASE_URL`: 您的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: 您的 Supabase Anon Key

### 3.2 后端维护 (Supabase)
- **Edge Function**: 核心逻辑位于 `supabase/functions/check-expiry`。如需修改通知文案，请编辑此文件并重新部署：
  ```bash
  npx supabase functions deploy check-expiry --no-verify-jwt
  ```
- **定时任务**: 如需调整提醒时间，请在 SQL Editor 中运行：
  ```sql
  -- 修改为每天上午 10:00 (UTC 02:00)
  select cron.schedule('check-expiry-custom', '0 2 * * *', $$...$$);
  ```

## 4. 遗留问题与建议
- **安全性**: 目前 Edge Function 配置为 `--no-verify-jwt` 以允许 Cron 触发。建议后续在 `pg_cron` 调用中添加自定义 Secret Header 并在 Function 中校验，以防止恶意调用。
- **扩展性**: 当前微信通知依赖 PushPlus 个人版，如需企业级应用建议接入企业微信 API。

## 5. 项目文件结构
- `web/`: 前端 React 项目
- `supabase/functions/`: 后端 Edge Functions
- `supabase/migrations/`: 数据库结构定义
- `docs/`: 项目文档 (需求、设计、任务、交付)

---
**交付日期**: 2026-01-16
