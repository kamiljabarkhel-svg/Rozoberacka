# E-maily prihlasovania (Supabase Auth) po slovensky

Supabase ich dovolí upraviť až po napojení vlastného SMTP (Authentication → Emails → SMTP Settings). Potom: Authentication → Emails → Templates → šablóna → **Subject** a **Body** (Source) podľa súborov nižšie → Save.

| Šablóna v Supabase | Súbor | Predmet |
|---|---|---|
| Confirm sign up | `potvrdenie-registracie.html` | Potvrďte e-mail – autosuciastky.eu |
| Reset password | `obnova-hesla.html` | Nové heslo – autosuciastky.eu |
| Change email address | `zmena-emailu.html` | Potvrďte nový e-mail – autosuciastky.eu |
| Magic link or OTP | `magicky-odkaz.html` | Prihlásenie – autosuciastky.eu |
| Invite user | `pozvanka.html` | Pozvánka – autosuciastky.eu |
| Reauthentication | `overenie-totoznosti.html` | Overovací kód – autosuciastky.eu |
| Password changed | `heslo-zmenene.html` | Heslo bolo zmenené – autosuciastky.eu |
| Email address changed | `email-zmeneny.html` | E-mail účtu bol zmenený – autosuciastky.eu |
| MFA method added | `dvojite-overenie-pridane.html` | Dvojité overenie zapnuté – autosuciastky.eu |
| MFA method removed | `dvojite-overenie-odobrate.html` | Dvojité overenie vypnuté – autosuciastky.eu |
