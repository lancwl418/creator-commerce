---
name: Supabase 常见踩坑记录
description: 开发过程中遇到的 Supabase 相关问题和解决方案
type: feedback
---

在 auth.users 上创建的触发器函数，必须给表名加 `public.` 前缀，并在函数末尾加 `SET search_path = public`。否则触发器在 auth schema 上下文执行时找不到 public 下的表，报 "Database error saving new user"。

**Why:** 触发器绑定在 `auth.users` 上，执行时 PostgreSQL 的 search_path 在 auth schema，无法自动解析到 public schema 的表。

**How to apply:** 所有写在 `auth.users` 触发器上的函数，都这样写：
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.creators (...)  -- 必须加 public.
    VALUES (...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```
