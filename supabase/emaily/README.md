# E-maily prihlasovania (Supabase Auth) po slovensky

Supabase ich dovolí upraviť až po napojení vlastného SMTP (Authentication → Emails → SMTP Settings). Potom: Authentication → Emails → Templates → šablóna → **Subject** a **Body** (Source) podľa súborov nižšie → Save.

| Šablóna v Supabase | Súbor | Predmet |
|---|---|---|
| Confirm sign up | `potvrdenie-registracie.html` | Potvrďte e-mail – Rozoberačka |
| Reset password | `obnova-hesla.html` | Nové heslo – Rozoberačka |
| Change email address | `zmena-emailu.html` | Potvrďte nový e-mail – Rozoberačka |
| Magic link or OTP | `magicky-odkaz.html` | Prihlásenie – Rozoberačka |
| Invite user | `pozvanka.html` | Pozvánka – Rozoberačka |
| Reauthentication | `overenie-totoznosti.html` | Overovací kód – Rozoberačka |
| Password changed | `heslo-zmenene.html` | Heslo bolo zmenené – Rozoberačka |
| Email address changed | `email-zmeneny.html` | E-mail účtu bol zmenený – Rozoberačka |
| MFA method added | `dvojite-overenie-pridane.html` | Dvojité overenie zapnuté – Rozoberačka |
| MFA method removed | `dvojite-overenie-odobrate.html` | Dvojité overenie vypnuté – Rozoberačka |
