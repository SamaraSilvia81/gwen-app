-- ═══════════════════════════════════════════════
-- G.W.E.N. 0.2.0: modo claro, escuro ou do sistema
-- Rode depois do 001. Pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════

alter table gwen.profiles
  add column if not exists mode text not null default 'escuro';

alter table gwen.profiles drop constraint if exists profiles_mode_check;
alter table gwen.profiles
  add constraint profiles_mode_check check (mode in ('escuro', 'claro', 'sistema'));
