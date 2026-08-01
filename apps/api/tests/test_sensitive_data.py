import pytest

from app.core.sensitive_data import (
    PUBLIC_MESSAGE,
    SensitiveDataError,
    ensure_safe_text,
    scan_sensitive_text,
)


@pytest.mark.parametrize(
    ("text", "category"),
    [
        ("Use card 4111 1111 1111 1111", "payment_card"),
        ("CVV: 123", "card_security_code"),
        ("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature12345", "jwt"),
        ("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456", "bearer_token"),
        ("API_KEY=plain-secret-value", "environment_secret"),
        ("https://example.test/callback?access_token=plain-secret-value", "url_secret"),
        ("-----BEGIN PRIVATE KEY-----", "private_key"),
    ],
)
def test_detects_sensitive_categories_without_returning_values(text, category):
    findings = scan_sensitive_text(text)
    assert category in {finding.category for finding in findings}
    assert all(not hasattr(finding, "value") for finding in findings)


def test_allows_safe_aliases_and_vault_references():
    text = "API_KEY=vault://payments/sandbox/merchant-api-key"
    assert ensure_safe_text(text) == text


def test_rejection_message_does_not_echo_secret():
    secret = "4111111111111111"
    with pytest.raises(SensitiveDataError) as error:
        ensure_safe_text(secret)
    assert str(error.value) == PUBLIC_MESSAGE
    assert secret not in str(error.value)


@pytest.mark.asyncio
async def test_api_validation_never_echoes_rejected_secret(client):
    secret = "4111111111111111"
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "username": "tester", "password": secret},
    )
    assert response.status_code == 422
    assert secret not in response.text
    assert "input" not in response.text
