# Cluegent transactional email DNS

Add these records in Hostinger for cluegent.com. Preserve existing records.

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTUWOeVDpJCx8IdDNMb6aAJHfo27DytdJC82YlMeRIC/TAvMfpwkau7jErHQbNOqQzNk38P3jnHHUTmXKvWSW9ISVHNMHgTfdpjdU4RaRc5SeqTDkFcicpyVKGunvpwp/lmJ6NjLuyO2MZ79M7VEiZ3uCGztcsfCa41BYhD47rkwIDAQAB | — |
| MX | send | feedback-smtp.us-east-1.amazonses.com | 10 |
| TXT | send | v=spf1 include:amazonses.com ~all | — |
| CNAME | rsend | send.forge.rmta.net | — |

After DNS verification, run npm run website:build-auth and node scripts/deploy-mobile-signup.mjs --deploy. The script refuses to publish until Resend reports cluegent.com verified.
