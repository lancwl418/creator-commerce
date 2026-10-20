-- ============================================================
-- 034: 注册触发器链固定 search_path（修复「注册失败」）
--
-- Supabase Auth 写 auth.users 时连接的 search_path 是 auth，不含 public。
-- handle_new_user 里的表名带了 public. 前缀，但它插 creators 时又触发了 022 的
-- link_shopify_customer，那里的 `shopify_customers` 没带前缀，于是报
-- relation "shopify_customers" does not exist，整笔注册回滚，前端只看到
-- "Database error saving new user"。cn-portal 和 Creator Portal 的注册都受影响。
--
-- 修法：所有在注册链路上运行的函数显式 SET search_path = public，并把表名写全。
-- 顺带给 is_admin / get_my_creator_id 也固定（SECURITY DEFINER 函数本就应如此）。
-- ============================================================

CREATE OR REPLACE FUNCTION public.link_shopify_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.shopify_customer_id IS NULL AND NEW.email IS NOT NULL THEN
        NEW.shopify_customer_id := (
            SELECT shopify_customer_id FROM public.shopify_customers
            WHERE lower(email) = lower(NEW.email)
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.protect_creator_privileged_columns() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.get_my_creator_id() SET search_path = public;
