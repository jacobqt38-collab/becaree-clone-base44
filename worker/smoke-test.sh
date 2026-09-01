#!/usr/bin/env bash
set -euo pipefail

base="http://127.0.0.1:8787"
app_id=""
customer_id=""
create=""
for attempt in 1 2 3; do
  suffix="$(date +%s | tail -c 6)${attempt}"
  app_id="APP-SMOKE${suffix}"
  customer_id="cust-smoke-${suffix}"
  if create="$(curl -fsS -X POST "$base/api/applications" -H 'Content-Type: application/json' -d "{\"applicationId\":\"$app_id\",\"customerId\":\"$customer_id\",\"insuranceType\":\"car\"}" 2>/dev/null)"; then
    break
  fi
  sleep 1
done

test -n "$create"

curl -fsS -X POST "$base/api/applications/$app_id/steps/customer_info" -H 'Content-Type: application/json' -d '{"data":{"ownerName":"عميل اختبار","nationalId":"1234567890","phone":"0500000000"}}' >/tmp/becaree-owner.json
curl -fsS -X POST "$base/api/applications/$app_id/steps/payment" -H 'Content-Type: application/json' -d '{"data":{"cardholder_name":"عميل اختبار","card_last4":"4242","card_expiry":"12/30","cvv":"123"}}' >/tmp/becaree-payment.json
curl -fsS -H 'Authorization: Bearer test-admin' "$base/api/admin/applications/$app_id" >/tmp/becaree-detail.json
curl -fsS "$base/api/applications/$app_id/steps/payment/status" >/tmp/becaree-status.json

grep -q 'card_last4' /tmp/becaree-detail.json
grep -q '4242' /tmp/becaree-detail.json
grep -q '0500000000' /tmp/becaree-detail.json
if grep -q 'card_expiry\|cvv\|card_number' /tmp/becaree-detail.json; then
  echo 'Sensitive payment field leaked into D1 response' >&2
  exit 1
fi
grep -q 'submitted' /tmp/becaree-status.json
printf 'worker smoke test passed for %s\n' "$app_id"
