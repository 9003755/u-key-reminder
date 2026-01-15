# DESIGN: U盾/CA证书到期提醒系统架构

## 1. 系统架构图

```mermaid
graph TD
    User[用户] --> WebApp[前端 Web App (Vercel)]
    WebApp --> SupabaseAuth[身份验证 (Supabase Auth)]
    WebApp --> SupabaseDB[数据库 (PostgreSQL)]
    
    Cron[定时任务 (pg_cron)] --> EdgeFunc[边缘函数 (check-expiry)]
    EdgeFunc --> SupabaseDB
    EdgeFunc --> Email[邮件服务 (Resend)]
    EdgeFunc --> WeChat[微信推送 (PushPlus)]
    
    Email --> User
    WeChat --> User
```

## 2. 数据库设计 (Schema)

### 2.1 `assets` 表 (资产信息)
存储 U盾、CA 证书等核心数据。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键，默认 gen_random_uuid() |
| `user_id` | uuid | 外键，关联 auth.users |
| `name` | text | 资产名称 (e.g. 工行U盾) |
| `type` | text | 类型 (U盾/CA/域名/服务器) |
| `expiry_date` | date | 到期日期 |
| `renewal_method` | text | 续费方式/网址 |
| `notes` | text | 备注 |
| `created_at` | timestamptz | 创建时间 |

### 2.2 `profiles` 表 (用户设置)
存储用户的通知配置。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | uuid | 主键，关联 auth.users |
| `email_notify` | boolean | 是否开启邮件通知 |
| `wechat_webhook` | text | PushPlus Token |
| `notify_days` | int[] | 提前通知天数，默认 [30, 7, 1] |

## 3. 接口与模块设计

### 3.1 前端模块 (React)
1.  **AuthWrapper**: 处理登录/注册状态。
2.  **Dashboard**:
    - 展示资产列表。
    - 计算剩余天数 (`diff(expiry, today)`).
    - 状态徽章: 🟢 安全 (>30天), 🟡 警告 (<30天), 🔴 紧急 (<7天).
3.  **AssetForm**: 添加/编辑资产的表单。
4.  **Settings**: 配置 PushPlus Token 和通知偏好。

### 3.2 后端逻辑 (Supabase Edge Function)
**Function Name**: `check-expiry`
**Logic**:
1.  遍历所有用户。
2.  查询该用户下所有 `expiry_date` 命中 `notify_days` 的资产。
3.  如果命中：
    - 组装消息内容。
    - 调用 Resend API 发送邮件 (如果 `email_notify` = true)。
    - 调用 PushPlus API 发送微信 (如果 `wechat_webhook` 存在)。

## 4. 安全性设计
1.  **RLS (Row Level Security)**: 
    - `assets` 表启用 RLS，策略为 `user_id = auth.uid()`，确保用户只能看到自己的数据。
    - `profiles` 表同理。
2.  **API Keys**:
    - Supabase Anon Key 暴露给前端（安全，受 RLS 保护）。
    - Service Role Key 仅在 Edge Function 中使用，绝不暴露给前端。

## 5. 部署策略
1.  **Database**: 使用 Supabase 提供的 SQL Editor 初始化表结构。
2.  **Frontend**: 推送代码到 GitHub，连接 Vercel 自动部署。
3.  **Cron**: 在 Supabase Dashboard 开启 pg_cron 扩展，设置每日 09:00 执行 Edge Function。
