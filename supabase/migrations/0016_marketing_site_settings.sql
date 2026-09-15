-- =====================================================================
-- 0016_marketing_site_settings.sql
-- Phase 2.6C：官網正式品牌名稱（森映 / SEN YING）、社群連結、浮動快捷列與購物車捷徑設定
--
-- - 只新增 / 更新 cms_site_settings 的設定資料列與既有 seed 的公開顯示名稱；不變更 schema、RLS、函式
-- - 可重複執行（on conflict / 條件式 update）
-- - 尚未套用到任何 Supabase 專案；不可直接 push 或套用到正式專案，先在本機 / staging 驗證
-- - 讀取：site_public_read（is_public = true）；寫入：cms_site_settings_admin_manage（owner / admin）
-- - setting_value 欄位對應 packages/database/src/site-settings.ts（siteSettingsFromRows / siteSettingsToRows）
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. 品牌：正式公開名稱「森映 SEN YING」（英文全大寫）
--    只更新仍是舊預設名稱的資料列，不覆蓋後台已自訂的名稱；0015 seed 缺少的 logo_url / favicon_url 補上預設值（Phase 2.8 本機 db reset 驗證時修正）
-- ---------------------------------------------------------------------
insert into public.cms_site_settings(setting_key, setting_value, is_public) values
('site.brand', jsonb_build_object(
   'name', '森映 SEN YING',
   'name_zh', '森映',
   'name_en', 'SEN YING',
   'footer_name', '森映 SEN YING',
   'logo_url', '',
   'favicon_url', '/favicon.svg',
   'tagline', '把網站、App 和內容，做成真的能用的產品'), true)
on conflict (setting_key) do update
  -- 左側為缺少時才補的預設值（logo_url / favicon_url），既有值在右側優先保留；舊預設名稱才換成正式名稱
  set setting_value = jsonb_build_object('logo_url', '', 'favicon_url', '/favicon.svg')
        || public.cms_site_settings.setting_value
        || case
             when public.cms_site_settings.setting_value->>'name' is distinct from '森映 SEN YING'
              and coalesce(public.cms_site_settings.setting_value->>'name_en', '') = ''
             then jsonb_build_object('name', '森映 SEN YING', 'name_zh', '森映', 'name_en', 'SEN YING', 'footer_name', '森映 SEN YING')
             else '{}'::jsonb
           end,
      updated_at = now()
  where (public.cms_site_settings.setting_value->>'name' is distinct from '森映 SEN YING'
         and coalesce(public.cms_site_settings.setting_value->>'name_en', '') = '')
     or not (public.cms_site_settings.setting_value ? 'logo_url' and public.cms_site_settings.setting_value ? 'favicon_url');

-- ---------------------------------------------------------------------
-- 2. 社群連結：正式網址提供前 url 為空字串（官網不顯示空網址的平台）
-- ---------------------------------------------------------------------
insert into public.cms_site_settings(setting_key, setting_value, is_public) values
('site.socials', jsonb_build_object('items', jsonb_build_array(
   jsonb_build_object('id','line','platform','line','label','LINE','url','/contact#line','enabled',true,'sort_order',10,'open_in_new_tab',false,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','instagram','platform','instagram','label','Instagram','url','','enabled',true,'sort_order',20,'open_in_new_tab',true,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','facebook','platform','facebook','label','Facebook','url','','enabled',true,'sort_order',30,'open_in_new_tab',true,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','threads','platform','threads','label','Threads','url','','enabled',true,'sort_order',40,'open_in_new_tab',true,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','youtube','platform','youtube','label','YouTube','url','','enabled',true,'sort_order',50,'open_in_new_tab',true,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','tiktok','platform','tiktok','label','TikTok','url','','enabled',false,'sort_order',60,'open_in_new_tab',true,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','email','platform','email','label','Email / 聯絡表單','url','/contact','enabled',true,'sort_order',70,'open_in_new_tab',false,'show_on_desktop',true,'show_on_mobile',true),
   jsonb_build_object('id','phone','platform','phone','label','電話','url','','enabled',false,'sort_order',80,'open_in_new_tab',false,'show_on_desktop',true,'show_on_mobile',true)
 )), true)
on conflict (setting_key) do nothing;

-- ---------------------------------------------------------------------
-- 3. 浮動快捷列與購物車捷徑：購物車流程正式上線前 cart.enabled = false
-- ---------------------------------------------------------------------
insert into public.cms_site_settings(setting_key, setting_value, is_public) values
('site.floating_actions', jsonb_build_object(
   'enabled', true,
   'default_collapsed', false,
   'desktop_enabled', true,
   'mobile_enabled', true,
   'cart', jsonb_build_object('enabled', false, 'href', '/checkout', 'label', '購物車', 'show_badge', true)), true)
on conflict (setting_key) do nothing;

-- ---------------------------------------------------------------------
-- 4. 公開顯示名稱不使用舊名稱（slug 是既有識別碼，保留不改）
-- ---------------------------------------------------------------------
update public.products
   set name = '品牌電商網站'
 where slug = 'mori-commerce'
   and name = 'Mori 電商網站';

commit;
