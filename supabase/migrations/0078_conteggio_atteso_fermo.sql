-- «Dovevano esserci» fermato al momento del conteggio (critico giro 41, G3). Applicata il 27/10/2026 col
-- sì di Edoardo (00:10Z): la differenza di una sera chiusa non cambia più quando un rider salda dopo.
alter table public.cassa_conteggio add column if not exists atteso_contanti numeric(10,2), add column if not exists atteso_pos numeric(10,2);
comment on column public.cassa_conteggio.atteso_contanti is 'Fondo + contanti in cassa al momento del conteggio (Edoardo 27/10/2026: la differenza di una sera chiusa non cambia più)';
