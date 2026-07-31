"""Detect secrets and payment data without retaining matched values."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

PUBLIC_MESSAGE = (
    "Похоже, вы вставляете секрет или платёжные реквизиты. "
    "Сохраните значение в защищённом vault, а здесь укажите только alias или vault reference."
)

@dataclass(frozen=True)
class SensitiveDataFinding:
    category: str

class SensitiveDataError(ValueError):
    def __init__(self, categories: Iterable[str]):
        self.categories = tuple(sorted(set(categories)))
        super().__init__(PUBLIC_MESSAGE)

_CARD_CANDIDATE = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")
_CVV_CONTEXT = re.compile(r"(?i)\b(?:cvv2?|cvc2?|card[ _-]?code|security[ _-]?code|код\s+безопасности)\s*[:=\-]?\s*\d{3,4}\b")
_JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")
_PRIVATE_KEY = re.compile(r"-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----")
_BEARER = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{16,}")
_KNOWN_KEY = re.compile(r"\b(?:sk-(?:live|test|proj)?-?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,}|AKIA[A-Z0-9]{16})\b")
_ENV_SECRET = re.compile(r"(?im)^\s*[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)\s*=\s*([^\s#][^\r\n]*)")
_URL_SECRET = re.compile(r"(?i)[?&](?:access_token|token|api_key|apikey|key|secret|password|signature)=([^&#\s]+)")

def _luhn_valid(value: str) -> bool:
    digits = [int(char) for char in value if char.isdigit()]
    if not 13 <= len(digits) <= 19 or len(set(digits)) == 1:
        return False
    checksum = 0
    parity = len(digits) % 2
    for index, digit in enumerate(digits):
        if index % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0

def _is_safe_reference(value: str) -> bool:
    return value.strip().lower().startswith(("vault://", "secret://", "alias://"))

def scan_sensitive_text(value: str | None) -> tuple[SensitiveDataFinding, ...]:
    if not value:
        return ()
    categories: set[str] = set()
    if any(_luhn_valid(match.group(0)) for match in _CARD_CANDIDATE.finditer(value)):
        categories.add("payment_card")
    for pattern, category in ((_CVV_CONTEXT, "card_security_code"), (_JWT, "jwt"), (_PRIVATE_KEY, "private_key"), (_BEARER, "bearer_token"), (_KNOWN_KEY, "api_key")):
        if pattern.search(value):
            categories.add(category)
    if any(not _is_safe_reference(match.group(1)) for match in _ENV_SECRET.finditer(value)):
        categories.add("environment_secret")
    if any(not _is_safe_reference(match.group(1)) for match in _URL_SECRET.finditer(value)):
        categories.add("url_secret")
    return tuple(SensitiveDataFinding(category) for category in sorted(categories))

def ensure_safe_text(value: str | None) -> str | None:
    findings = scan_sensitive_text(value)
    if findings:
        raise SensitiveDataError(finding.category for finding in findings)
    return value
